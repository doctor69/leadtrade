/// <reference lib="deno.ns" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { authenticateUser, type AuthContext } from '../_shared/auth.ts'
import { AlpacaClient } from '../_shared/alpaca-client.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    // Authenticate user
    const authContext = await authenticateUser(req)
    if (!authContext) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Alpaca account ID
    const { data: alpacaAccount } = await supabase
      .from('alpaca_accounts')
      .select('alpaca_account_id')
      .eq('user_id', authContext.userId)
      .single()

    if (!alpacaAccount?.alpaca_account_id) {
      return new Response(
        JSON.stringify({ error: 'Alpaca account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accountId = alpacaAccount.alpaca_account_id

    // Initialize Alpaca client
    const alpacaClient = new AlpacaClient(authContext, console.log)

    // Parse URL and method
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const method = req.method

    // Route: POST /alpaca-kyc-cip/cip - Upload CIP information
    if (method === 'POST' && pathParts[pathParts.length - 1] === 'cip') {
      const body = await req.json()

      // Validate required fields
      if (!body.provider_name) {
        return new Response(
          JSON.stringify({ error: 'provider_name is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Upload CIP to Alpaca
      const result = await alpacaClient.uploadCIP(accountId, body)

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: result.error?.message || 'Failed to upload CIP' }),
          { status: result.error?.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Store submission in database
      const { error: dbError } = await supabase
        .from('kyc_submissions')
        .insert({
          account_id: authContext.userId,
          alpaca_account_id: accountId,
          provider_name: body.provider_name,
          submission_type: 'cip',
          status: result.data?.status || 'pending',
          verification_results: result.data,
          submitted_at: new Date().toISOString()
        })

      if (dbError) {
        console.error('Failed to store KYC submission:', dbError)
      }

      return new Response(
        JSON.stringify(result.data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route: GET /alpaca-kyc-cip/cip - Get CIP verification results
    if (method === 'GET' && pathParts[pathParts.length - 1] === 'cip') {
      const result = await alpacaClient.getCIP(accountId)

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: result.error?.message || 'Failed to get CIP' }),
          { status: result.error?.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update database with latest status
      if (result.data) {
        await supabase
          .from('kyc_submissions')
          .update({
            status: result.data.status,
            risk_level: result.data.risk_level,
            verification_results: result.data.verification_results,
            failure_reasons: result.data.failure_reasons,
            completed_at: result.data.completed_at
          })
          .eq('account_id', authContext.userId)
          .eq('alpaca_account_id', accountId)
          .eq('submission_type', 'cip')
      }

      return new Response(
        JSON.stringify(result.data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route: POST /alpaca-kyc-cip/onfido/sdk-token - Generate Onfido SDK token
    if (method === 'POST' && pathParts.includes('onfido') && pathParts[pathParts.length - 1] === 'sdk-token') {
      const body = await req.json().catch(() => ({}))
      const referrer = body.referrer

      const result = await alpacaClient.generateOnfidoSDKToken(accountId, referrer)

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: result.error?.message || 'Failed to generate SDK token' }),
          { status: result.error?.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Store SDK token in database
      if (result.data) {
        await supabase
          .from('onfido_sdk_tokens')
          .insert({
            account_id: authContext.userId,
            alpaca_account_id: accountId,
            sdk_token: result.data.sdk_token,
            applicant_id: result.data.applicant_id,
            expires_at: result.data.expires_at,
            used: false
          })
      }

      return new Response(
        JSON.stringify(result.data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route: POST /alpaca-kyc-cip/onfido/outcome - Submit Onfido outcome
    if (method === 'POST' && pathParts.includes('onfido') && pathParts[pathParts.length - 1] === 'outcome') {
      const body = await req.json()

      // Validate required fields
      if (!body.applicant_id || !body.check_id || !body.result) {
        return new Response(
          JSON.stringify({ error: 'applicant_id, check_id, and result are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const result = await alpacaClient.submitOnfidoOutcome(accountId, body)

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: result.error?.message || 'Failed to submit outcome' }),
          { status: result.error?.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Mark SDK token as used and update KYC submission
      await supabase
        .from('onfido_sdk_tokens')
        .update({ used: true })
        .eq('account_id', authContext.userId)
        .eq('applicant_id', body.applicant_id)

      await supabase
        .from('kyc_submissions')
        .insert({
          account_id: authContext.userId,
          alpaca_account_id: accountId,
          provider_name: 'onfido',
          submission_type: 'identity',
          status: body.result === 'clear' ? 'approved' : body.result === 'rejected' ? 'rejected' : 'review',
          verification_results: body,
          submitted_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })

      return new Response(
        JSON.stringify(result.data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route: GET /alpaca-kyc-cip/submissions - Get all KYC submissions for user
    if (method === 'GET' && pathParts[pathParts.length - 1] === 'submissions') {
      const { data: submissions, error } = await supabase
        .from('kyc_submissions')
        .select('*')
        .eq('account_id', authContext.userId)
        .order('submitted_at', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch submissions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(submissions),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('KYC/CIP Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
