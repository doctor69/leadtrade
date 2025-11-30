import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { 
  processRequest, 
  createSuccessResponse, 
  createErrorResponse,
  AlpacaClient,
  corsHeaders,
  ERROR_CODES
} from '../_shared/index.ts'

/**
 * Edge Function handler for individual Alpaca security/asset data
 * 
 * GET: Retrieves specific security information by symbol or asset ID
 * 
 * Path Parameters:
 * - symbol: Stock symbol or asset ID (e.g., AAPL, TSLA, etc.)
 * 
 * Features:
 * - Real-time asset information
 * - Detailed trading attributes
 * - Validation for tradability
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
      return createErrorResponse(
        {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Method not allowed. Only GET requests are supported.'
        },
        405
      )
    }

    try {
      // Extract symbol from URL path
      const url = new URL(req.url)
      const pathParts = url.pathname.split('/')
      const symbol = pathParts[pathParts.length - 1]

      if (!symbol || symbol === 'alpaca-security') {
        return createErrorResponse(
          {
            code: ERROR_CODES.INVALID_REQUEST,
            message: 'Symbol parameter is required. Use: /alpaca-security/{symbol}'
          },
          400
        )
      }

      console.log(`Processing security data request for symbol: ${symbol}`)

      // Create Alpaca client (no auth context needed for public assets endpoint)
      const alpacaClient = new AlpacaClient(
        {
          userId: 'system',
          sessionToken: '',
          isAuthenticated: false,
          tradingMode: 'paper', // Use paper mode for assets endpoint
          alpacaAccessToken: ''
        },
        (message: string, data?: any) => {
          console.log(`[AlpacaClient] ${message}`, data ? JSON.stringify(data) : '')
        }
      )

      // Fetch specific asset from Alpaca
      const startTime = Date.now()
      const response = await alpacaClient.getAsset(symbol.toUpperCase())
      const fetchTime = Date.now() - startTime

      if (!response.success) {
        console.error(`Failed to fetch security data for ${symbol}:`, response.error)
        
        // Handle 404 specifically for better user experience
        if (response.error?.status === 404) {
          return createErrorResponse(
            {
              code: 'SECURITY_NOT_FOUND',
              message: `Security '${symbol}' not found or not available for trading`,
              details: {
                symbol: symbol.toUpperCase(),
                suggestion: 'Please verify the symbol is correct and the security is available on Alpaca'
              }
            },
            404
          )
        }

        return createErrorResponse(
          {
            code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
            message: response.error?.message || `Failed to fetch security data for ${symbol}`,
            details: response.error?.details
          },
          response.error?.status || 500
        )
      }

      const asset = response.data

      // Prepare enhanced response with trading information
      const responseData = {
        asset,
        trading_info: {
          can_trade: asset.tradable && asset.status === 'active',
          can_margin: asset.marginable,
          can_short: asset.shortable,
          can_fractional: asset.fractionable,
          easy_to_borrow: asset.easy_to_borrow,
          min_order_size: asset.min_order_size,
          min_trade_increment: asset.min_trade_increment,
          price_increment: asset.price_increment
        },
        risk_info: {
          maintenance_margin_requirement: asset.maintenance_margin_requirement,
          attributes: asset.attributes || []
        },
        metadata: {
          fetch_time_ms: fetchTime,
          timestamp: new Date().toISOString()
        }
      }

      console.log(`✅ Retrieved security data for ${symbol} (${asset.name})`)

      return createSuccessResponse(responseData)

    } catch (error) {
      console.error('Unexpected error in security endpoint:', error)
      return createErrorResponse(
        {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        },
        500
      )
    }
  })
})