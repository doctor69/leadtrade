// Alpaca Reporting API Edge Function
// Provides platform-wide reporting capabilities for positions and analytics
// Requirements: 17.1, 17.2, 17.3, 17.4, 17.5

import { createCorsHeaders, handleCors } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'
import { AlpacaClient } from '../_shared/alpaca-client.ts'

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    // Authenticate the request
    const authContext = await authenticateRequest(req)
    if (!authContext.authenticated || !authContext.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...createCorsHeaders(req), 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Alpaca client
    const alpacaClient = new AlpacaClient(authContext, console.log)

    // Parse URL to determine the endpoint
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)

    // GET /aggregate_positions - Get platform-wide aggregate positions
    if (req.method === 'GET' && pathParts[pathParts.length - 1] === 'aggregate_positions') {
      const date = url.searchParams.get('date') || undefined
      const symbols = url.searchParams.get('symbols') || undefined
      const accountIds = url.searchParams.get('account_ids') || undefined
      const includeFirmAccounts = url.searchParams.get('include_firm_accounts')
      const pageToken = url.searchParams.get('page_token') || undefined
      const limit = url.searchParams.get('limit')

      const params: any = {}
      if (date) params.date = date
      if (symbols) params.symbols = symbols
      if (accountIds) params.account_ids = accountIds
      if (includeFirmAccounts !== null) {
        params.include_firm_accounts = includeFirmAccounts === 'true'
      }
      if (pageToken) params.page_token = pageToken
      if (limit) params.limit = parseInt(limit)

      const response = await alpacaClient.getAggregatePositions(params)

      if (!response.success) {
        return new Response(
          JSON.stringify({ error: response.error?.message || 'Failed to retrieve aggregate positions' }),
          {
            status: response.error?.status || 500,
            headers: { ...createCorsHeaders(req), 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify(response.data),
        {
          status: 200,
          headers: { ...createCorsHeaders(req), 'Content-Type': 'application/json' }
        }
      )
    }

    // GET /eod_positions - Get end-of-day positions for all accounts
    if (req.method === 'GET' && pathParts[pathParts.length - 1] === 'eod_positions') {
      const date = url.searchParams.get('date')
      
      if (!date) {
        return new Response(
          JSON.stringify({ error: 'Date parameter is required (format: YYYY-MM-DD)' }),
          {
            status: 400,
            headers: { ...createCorsHeaders(req), 'Content-Type': 'application/json' }
          }
        )
      }

      const symbols = url.searchParams.get('symbols') || undefined
      const accountIds = url.searchParams.get('account_ids') || undefined
      const includeFirmAccounts = url.searchParams.get('include_firm_accounts')
      const pageToken = url.searchParams.get('page_token') || undefined
      const limit = url.searchParams.get('limit')

      const params: any = { date }
      if (symbols) params.symbols = symbols
      if (accountIds) params.account_ids = accountIds
      if (includeFirmAccounts !== null) {
        params.include_firm_accounts = includeFirmAccounts === 'true'
      }
      if (pageToken) params.page_token = pageToken
      if (limit) params.limit = parseInt(limit)

      const response = await alpacaClient.getEODPositions(params)

      if (!response.success) {
        return new Response(
          JSON.stringify({ error: response.error?.message || 'Failed to retrieve EOD positions' }),
          {
            status: response.error?.status || 500,
            headers: { ...createCorsHeaders(req), 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify(response.data),
        {
          status: 200,
          headers: { ...createCorsHeaders(req), 'Content-Type': 'application/json' }
        }
      )
    }

    // Invalid endpoint
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        status: 404,
        headers: { ...createCorsHeaders(req), 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Alpaca Reports API Error:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...createCorsHeaders(req), 'Content-Type': 'application/json' }
      }
    )
  }
})
