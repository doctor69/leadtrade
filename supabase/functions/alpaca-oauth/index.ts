// OAuth Client Management Edge Function
// Handles OAuth authorization flow for third-party integrations
// Requirements: 14.1, 14.2, 14.3, 14.4, 14.5

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { AlpacaClient } from '../_shared/alpaca-client.ts'
import { authenticateUser } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.split('/alpaca-oauth')[1] || ''
    const method = req.method

    console.log('OAuth request:', { method, path })

    // Authenticate user
    const authContext = await authenticateUser(req)
    if (!authContext.authenticated || !authContext.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Alpaca client
    const alpacaClient = new AlpacaClient(authContext, console.log)

    // Create Supabase client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Route handling
    if (path.startsWith('/clients/') && method === 'GET') {
      // GET /clients/{client_id} - Get OAuth client details
      const clientId = path.split('/clients/')[1]
      
      if (!clientId) {
        return new Response(
          JSON.stringify({ error: 'Client ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const result = await alpacaClient.getOAuthClient(clientId)

      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : (result.error?.status || 500),
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (path === '/authorize' && method === 'POST') {
      // POST /authorize - Authorize OAuth request
      const body = await req.json()

      // Validate required fields
      if (!body.client_id || !body.redirect_uri || !body.response_type || !body.scope) {
        return new Response(
          JSON.stringify({ 
            error: 'invalid_request',
            error_description: 'Missing required parameters: client_id, redirect_uri, response_type, scope'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate response_type
      if (body.response_type !== 'code') {
        return new Response(
          JSON.stringify({ 
            error: 'unsupported_response_type',
            error_description: 'Only response_type=code is supported'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate scopes
      const validScopes = ['account:read', 'account:write', 'trading:read', 'trading:write', 'data:read', 'funding:read', 'funding:write']
      const requestedScopes = body.scope.split(' ')
      const invalidScopes = requestedScopes.filter((s: string) => !validScopes.includes(s))
      
      if (invalidScopes.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: 'invalid_scope',
            error_description: `Invalid scopes: ${invalidScopes.join(', ')}`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get user's Alpaca account ID
      const { data: alpacaAccount } = await supabase
        .from('alpaca_accounts')
        .select('alpaca_account_id')
        .eq('user_id', authContext.userId)
        .single()

      if (!alpacaAccount) {
        return new Response(
          JSON.stringify({ 
            error: 'account_not_found',
            error_description: 'No Alpaca account found for user'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Call Alpaca API to authorize
      const result = await alpacaClient.authorizeOAuth({
        client_id: body.client_id,
        redirect_uri: body.redirect_uri,
        response_type: body.response_type,
        scope: body.scope,
        state: body.state,
        account_id: alpacaAccount.alpaca_account_id
      })

      if (result.success && result.data) {
        // Store authorization in database
        const expiresAt = new Date()
        expiresAt.setMinutes(expiresAt.getMinutes() + 10) // Authorization codes expire in 10 minutes

        await supabase
          .from('oauth_authorizations')
          .insert({
            user_id: authContext.userId,
            client_id: body.client_id,
            code: result.data.code,
            scope: body.scope,
            redirect_uri: body.redirect_uri,
            expires_at: expiresAt.toISOString(),
            used: false
          })
      }

      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : (result.error?.status || 500),
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (path === '/token' && method === 'POST') {
      // POST /token - Issue OAuth access token
      const body = await req.json()

      // Validate required fields
      if (!body.grant_type || !body.client_id || !body.client_secret) {
        return new Response(
          JSON.stringify({ 
            error: 'invalid_request',
            error_description: 'Missing required parameters: grant_type, client_id, client_secret'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate grant_type
      if (body.grant_type !== 'authorization_code' && body.grant_type !== 'refresh_token') {
        return new Response(
          JSON.stringify({ 
            error: 'unsupported_grant_type',
            error_description: 'Only authorization_code and refresh_token grant types are supported'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate grant_type specific requirements
      if (body.grant_type === 'authorization_code' && (!body.code || !body.redirect_uri)) {
        return new Response(
          JSON.stringify({ 
            error: 'invalid_request',
            error_description: 'code and redirect_uri are required for authorization_code grant'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (body.grant_type === 'refresh_token' && !body.refresh_token) {
        return new Response(
          JSON.stringify({ 
            error: 'invalid_request',
            error_description: 'refresh_token is required for refresh_token grant'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // For authorization_code grant, verify the code hasn't been used
      if (body.grant_type === 'authorization_code') {
        const { data: authorization, error: authError } = await supabase
          .from('oauth_authorizations')
          .select('*')
          .eq('code', body.code)
          .eq('client_id', body.client_id)
          .eq('redirect_uri', body.redirect_uri)
          .single()

        if (authError || !authorization) {
          return new Response(
            JSON.stringify({ 
              error: 'invalid_grant',
              error_description: 'Invalid authorization code'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (authorization.used) {
          return new Response(
            JSON.stringify({ 
              error: 'invalid_grant',
              error_description: 'Authorization code has already been used'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if code has expired
        if (new Date(authorization.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ 
              error: 'invalid_grant',
              error_description: 'Authorization code has expired'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Mark code as used
        await supabase
          .from('oauth_authorizations')
          .update({ used: true })
          .eq('code', body.code)
      }

      // Call Alpaca API to issue token
      const result = await alpacaClient.issueOAuthToken({
        grant_type: body.grant_type,
        code: body.code,
        refresh_token: body.refresh_token,
        client_id: body.client_id,
        client_secret: body.client_secret,
        redirect_uri: body.redirect_uri
      })

      if (result.success && result.data) {
        // Store access token in database
        const expiresAt = new Date()
        expiresAt.setSeconds(expiresAt.getSeconds() + result.data.expires_in)

        await supabase
          .from('oauth_access_tokens')
          .insert({
            user_id: authContext.userId,
            client_id: body.client_id,
            access_token: result.data.access_token,
            refresh_token: result.data.refresh_token,
            scope: result.data.scope,
            expires_at: expiresAt.toISOString(),
            revoked: false
          })
      }

      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : (result.error?.status || 500),
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (path === '/revoke' && method === 'POST') {
      // POST /revoke - Revoke OAuth access token
      const body = await req.json()

      if (!body.token) {
        return new Response(
          JSON.stringify({ 
            error: 'invalid_request',
            error_description: 'token parameter is required'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Revoke token in database
      await supabase
        .from('oauth_access_tokens')
        .update({ revoked: true })
        .eq('access_token', body.token)
        .eq('user_id', authContext.userId)

      // Call Alpaca API to revoke token
      const result = await alpacaClient.revokeOAuthToken({
        token: body.token,
        token_type_hint: body.token_type_hint
      })

      return new Response(
        JSON.stringify(result.success ? { success: true } : result),
        { 
          status: result.success ? 200 : (result.error?.status || 500),
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Invalid route
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('OAuth error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'internal_server_error',
        error_description: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
