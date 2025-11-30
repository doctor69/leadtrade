// Add Deno types reference
/// <reference lib="deno.ns" />

import { createAuthContext } from '../_shared/auth.ts'
import { AlpacaClient } from '../_shared/alpaca-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Alpaca Events Edge Function
 * 
 * Provides Server-Sent Events (SSE) streaming for:
 * - Trade events (order status updates)
 * - Transfer events (transfer status changes)
 * - Journal events (journal processing updates)
 * - Account status events (account lifecycle changes)
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse URL to get event type and query parameters
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    
    // Expected path: /alpaca-events/{event_type}
    // event_type can be: trades, transfers, journals, account_status
    const eventType = pathParts[pathParts.length - 1]
    
    if (!eventType || !['trades', 'transfers', 'journals', 'account_status'].includes(eventType)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid event type. Must be one of: trades, transfers, journals, account_status'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Authenticate user
    const authContext = await createAuthContext(req)
    if (!authContext) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get Alpaca account ID from query params or use from auth context
    const accountId = url.searchParams.get('account_id') || authContext.alpacaAccountId

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: 'Alpaca account ID required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract pagination parameters
    const params: Record<string, string> = {}
    const since = url.searchParams.get('since')
    const until = url.searchParams.get('until')
    const since_id = url.searchParams.get('since_id')
    const until_id = url.searchParams.get('until_id')
    const since_ulid = url.searchParams.get('since_ulid')
    const until_ulid = url.searchParams.get('until_ulid')

    if (since) params.since = since
    if (until) params.until = until
    if (since_id) params.since_id = since_id
    if (until_id) params.until_id = until_id
    if (since_ulid) params.since_ulid = since_ulid
    if (until_ulid) params.until_ulid = until_ulid

    // Create Alpaca client
    const alpacaClient = new AlpacaClient(authContext, console.log)

    // Determine the Alpaca API endpoint based on event type
    let endpoint: string
    switch (eventType) {
      case 'trades':
        endpoint = `/v1/events/trades`
        break
      case 'transfers':
        endpoint = `/v1/events/transfers`
        break
      case 'journals':
        endpoint = `/v1/events/journals`
        break
      case 'account_status':
        endpoint = `/v1/events/account_status`
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid event type' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }

    // Get Alpaca API credentials based on trading mode
    const apiKey = authContext.tradingMode === 'paper'
      ? Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY')
      : Deno.env.get('PUBLIC_ALPACA_BROKER_LIVE_API_KEY')

    const apiSecret = authContext.tradingMode === 'paper'
      ? Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET')
      : Deno.env.get('PUBLIC_ALPACA_BROKER_LIVE_API_SECRET')

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing Alpaca API credentials' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Build full URL with query parameters
    const baseUrl = authContext.tradingMode === 'paper'
      ? Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL') || 'https://broker-api.sandbox.alpaca.markets'
      : Deno.env.get('PUBLIC_ALPACA_BROKER_LIVE_BASE_URL') || 'https://broker-api.alpaca.markets'

    const queryParams = new URLSearchParams(params)
    const fullUrl = `${baseUrl}${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`

    console.log('SSE Request:', {
      eventType,
      accountId,
      url: fullUrl,
      tradingMode: authContext.tradingMode,
      params
    })

    // Use HTTP Basic authentication
    const credentials = `${apiKey}:${apiSecret}`
    const encodedCredentials = btoa(credentials)

    // Make SSE request to Alpaca
    const alpacaResponse = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
        'Accept': 'text/event-stream',
      }
    })

    if (!alpacaResponse.ok) {
      const errorText = await alpacaResponse.text()
      console.error('Alpaca SSE Error:', {
        status: alpacaResponse.status,
        error: errorText
      })

      return new Response(
        JSON.stringify({
          error: `Alpaca API error: ${alpacaResponse.status}`,
          details: errorText
        }),
        {
          status: alpacaResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Stream the SSE response back to the client
    // We need to add CORS headers and pass through the event stream
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const encoder = new TextEncoder()

    // Start streaming from Alpaca to client
    ;(async () => {
      try {
        const reader = alpacaResponse.body?.getReader()
        if (!reader) {
          throw new Error('No response body')
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            console.log('SSE stream ended')
            break
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true })

          // Process complete lines
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            // Forward the line to the client
            await writer.write(encoder.encode(line + '\n'))
          }
        }

        // Close the writer when done
        await writer.close()
      } catch (error) {
        console.error('SSE streaming error:', error)
        try {
          await writer.abort(error)
        } catch (e) {
          console.error('Error aborting writer:', e)
        }
      }
    })()

    // Return SSE response with CORS headers
    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      }
    })

  } catch (error) {
    console.error('Error in alpaca-events function:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
