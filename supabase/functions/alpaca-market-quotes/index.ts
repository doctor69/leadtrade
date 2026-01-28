import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import {
  withAuth,
  processRequest,
  createSuccessResponse,
  createErrorResponse,
  ERROR_CODES
} from '../_shared/index.ts'
import type { AuthContext } from '../_shared/auth.ts'

/**
 * Alpaca Market Quotes - Free Market Data API
 * PROTECTED ENDPOINT - Requires user authentication
 * Uses platform's Alpaca API keys for IEX feed (Basic plan)
 * Rate limit: 30 symbols per request (Basic plan WebSocket limit)
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    return withAuth(req, async (authContext: AuthContext) => {
      try {
        const url = new URL(req.url)
        const symbols = url.searchParams.get('symbols')
        const feed = url.searchParams.get('feed') || 'iex' // Default to IEX (free)

        if (!symbols) {
          return createErrorResponse(
            {
              code: ERROR_CODES.INVALID_REQUEST,
              message: 'symbols parameter is required'
            },
            400
          )
        }

        // Rate limiting: max 30 symbols per request (Basic plan WebSocket limit)
        const symbolArray = symbols.split(',').map(s => s.trim()).filter(Boolean)
        if (symbolArray.length > 30) {
          return createErrorResponse(
            {
              code: ERROR_CODES.INVALID_REQUEST,
              message: 'Maximum 30 symbols allowed per request (Basic plan limit)'
            },
            400
          )
        }

        // Get Alpaca API keys from environment (platform keys, not user keys)
        const alpacaApiKey = Deno.env.get('PUBLIC_ALPACA_DATA_API_KEY')
        const alpacaApiSecret = Deno.env.get('PUBLIC_ALPACA_DATA_API_SECRET')
        const alpacaDataBaseUrl = Deno.env.get('PUBLIC_ALPACA_DATA_BASE_URL') || 'https://data.sandbox.alpaca.markets'

        console.log('Environment check:', {
          hasApiKey: !!alpacaApiKey,
          hasApiSecret: !!alpacaApiSecret,
          baseUrl: alpacaDataBaseUrl,
          keyLength: alpacaApiKey?.length,
          secretLength: alpacaApiSecret?.length,
          userId: authContext.userId,
          tradingMode: authContext.tradingMode
        })

        if (!alpacaApiKey || !alpacaApiSecret) {
          console.error('Missing Alpaca API credentials')
          return createErrorResponse(
            {
              code: ERROR_CODES.INTERNAL_ERROR,
              message: 'Server configuration error - missing API credentials'
            },
            500
          )
        }

        // Use Alpaca's free market data API with platform credentials
        const alpacaDataUrl = `${alpacaDataBaseUrl}/v2/stocks/quotes/latest?symbols=${symbols}&feed=${feed}`

        console.log('Fetching from Alpaca:', alpacaDataUrl)

        const response = await fetch(alpacaDataUrl, {
          headers: {
            'Accept': 'application/json',
            'APCA-API-KEY-ID': alpacaApiKey,
            'APCA-API-SECRET-KEY': alpacaApiSecret
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Alpaca API error:', errorText)

          return createErrorResponse(
            {
              code: ERROR_CODES.ALPACA_API_ERROR,
              message: `Alpaca API error: ${response.status} ${response.statusText}`,
              details: errorText
            },
            response.status
          )
        }

        const data = await response.json()

        // Transform the data to a more usable format
        const quotes = Object.entries(data.quotes || {}).map(([symbol, quote]: [string, any]) => ({
          symbol,
          bid: quote.bp || 0,
          ask: quote.ap || 0,
          bid_size: quote.bs || 0,
          ask_size: quote.as || 0,
          latest_trade: {
            price: quote.ap || quote.bp || 0, // Use ask price as latest trade price
            size: quote.as || 0,
            timestamp: quote.t || new Date().toISOString()
          },
          timestamp: quote.t || new Date().toISOString()
        }))

        console.log(`✅ Successfully fetched ${quotes.length} quotes for user ${authContext.userId}`)

        return createSuccessResponse({
          quotes,
          feed,
          timestamp: new Date().toISOString()
        })

      } catch (error) {
        console.error('Market quotes error:', error)
        return createErrorResponse(
          {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: error instanceof Error ? error.message : 'Internal server error'
          },
          500
        )
      }
    })
  })
})
