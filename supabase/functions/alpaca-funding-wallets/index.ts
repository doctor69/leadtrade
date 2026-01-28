/// <reference lib="deno.ns" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getCorsHeaders } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'
import { makeAlpacaRequest } from '../_shared/alpaca-client.ts'

const ALPACA_BROKER_API_URL = Deno.env.get('ALPACA_BROKER_API_URL') || 'https://broker-api.sandbox.alpaca.markets'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate request
    const authContext = await authenticateRequest(req)
    if (!authContext.authenticated || !authContext.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    
    // Extract account_id and wallet_id from path
    // Path format: /alpaca-funding-wallets/{account_id} or /alpaca-funding-wallets/{account_id}/{wallet_id}
    const accountId = pathParts[1]
    const walletId = pathParts[2]
    const action = pathParts[3] // payment-instructions, withdrawals, recipient-banks

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: 'Account ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user owns this account
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('alpaca_account_id')
      .eq('id', authContext.userId)
      .single()

    if (!profile || profile.alpaca_account_id !== accountId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Account does not belong to user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route to appropriate handler
    if (req.method === 'POST') {
      if (walletId && action === 'withdrawals') {
        // POST /v1/accounts/{account_id}/funding_wallets/{wallet_id}/withdrawals
        return await handleCreateWithdrawal(req, accountId, walletId)
      } else if (walletId && action === 'recipient-banks') {
        // POST /v1/accounts/{account_id}/funding_wallets/{wallet_id}/recipient-banks
        return await handleCreateRecipientBank(req, accountId, walletId)
      } else if (!walletId) {
        // POST /v1/accounts/{account_id}/funding_wallets
        return await handleCreateWallet(req, accountId)
      }
    } else if (req.method === 'GET') {
      if (walletId && action === 'payment-instructions') {
        // GET /v1/accounts/{account_id}/funding_wallets/{wallet_id}/payment-instructions
        return await handleGetPaymentInstructions(accountId, walletId)
      } else if (walletId && action === 'recipient-banks') {
        // GET /v1/accounts/{account_id}/funding_wallets/{wallet_id}/recipient-banks
        return await handleListRecipientBanks(accountId, walletId, url)
      } else if (walletId) {
        // GET /v1/accounts/{account_id}/funding_wallets/{wallet_id}
        return await handleGetWallet(accountId, walletId)
      } else {
        // GET /v1/accounts/{account_id}/funding_wallets
        return await handleListWallets(accountId, url)
      }
    } else if (req.method === 'DELETE') {
      if (walletId && action === 'recipient-banks') {
        const bankId = pathParts[4]
        if (!bankId) {
          return new Response(
            JSON.stringify({ error: 'Bank ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        // DELETE /v1/accounts/{account_id}/funding_wallets/{wallet_id}/recipient-banks/{bank_id}
        return await handleDeleteRecipientBank(accountId, walletId, bankId)
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in alpaca-funding-wallets function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleCreateWallet(req: Request, accountId: string) {
  const body = await req.json()
  
  const response = await makeAlpacaRequest({
    method: 'POST',
    endpoint: `/v1/accounts/${accountId}/funding_wallets`,
    body
  })

  return new Response(
    JSON.stringify(response.data),
    { 
      status: response.success ? 200 : (response.error?.status || 500),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleGetWallet(accountId: string, walletId: string) {
  const response = await makeAlpacaRequest({
    method: 'GET',
    endpoint: `/v1/accounts/${accountId}/funding_wallets/${walletId}`
  })

  return new Response(
    JSON.stringify(response.data),
    { 
      status: response.success ? 200 : (response.error?.status || 500),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleListWallets(accountId: string, url: URL) {
  const params: Record<string, string> = {}
  
  // Extract query parameters
  const currency = url.searchParams.get('currency')
  if (currency) params.currency = currency

  const response = await makeAlpacaRequest({
    method: 'GET',
    endpoint: `/v1/accounts/${accountId}/funding_wallets`,
    params
  })

  return new Response(
    JSON.stringify(response.data),
    { 
      status: response.success ? 200 : (response.error?.status || 500),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleGetPaymentInstructions(accountId: string, walletId: string) {
  const response = await makeAlpacaRequest({
    method: 'GET',
    endpoint: `/v1/accounts/${accountId}/funding_wallets/${walletId}/payment-instructions`
  })

  return new Response(
    JSON.stringify(response.data),
    { 
      status: response.success ? 200 : (response.error?.status || 500),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleCreateWithdrawal(req: Request, accountId: string, walletId: string) {
  const body = await req.json()
  
  const response = await makeAlpacaRequest({
    method: 'POST',
    endpoint: `/v1/accounts/${accountId}/funding_wallets/${walletId}/withdrawals`,
    body
  })

  return new Response(
    JSON.stringify(response.data),
    { 
      status: response.success ? 200 : (response.error?.status || 500),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleCreateRecipientBank(req: Request, accountId: string, walletId: string) {
  const body = await req.json()
  
  const response = await makeAlpacaRequest({
    method: 'POST',
    endpoint: `/v1/accounts/${accountId}/funding_wallets/${walletId}/recipient-banks`,
    body
  })

  return new Response(
    JSON.stringify(response.data),
    { 
      status: response.success ? 200 : (response.error?.status || 500),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleListRecipientBanks(accountId: string, walletId: string, url: URL) {
  const params: Record<string, string> = {}
  
  // Extract query parameters
  const status = url.searchParams.get('status')
  if (status) params.status = status

  const response = await makeAlpacaRequest({
    method: 'GET',
    endpoint: `/v1/accounts/${accountId}/funding_wallets/${walletId}/recipient-banks`,
    params
  })

  return new Response(
    JSON.stringify(response.data),
    { 
      status: response.success ? 200 : (response.error?.status || 500),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleDeleteRecipientBank(accountId: string, walletId: string, bankId: string) {
  const response = await makeAlpacaRequest({
    method: 'DELETE',
    endpoint: `/v1/accounts/${accountId}/funding_wallets/${walletId}/recipient-banks/${bankId}`
  })

  return new Response(
    JSON.stringify(response.data || { success: true }),
    { 
      status: response.success ? 204 : (response.error?.status || 500),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}
