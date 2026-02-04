import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { 
  withAuth, 
  processRequest, 
  createSuccessResponse, 
  createErrorResponse,
  AlpacaClient,
  getCorsHeaders
} from '../_shared/index.ts'
import type { AuthContext } from '../_shared/auth.ts'

/**
 * Edge Function handler for Alpaca Portfolio History API
 * 
 * GET / - Get portfolio history for the authenticated user's account
 * GET /{account_id} - Get portfolio history for a specific account
 * 
 * Query Parameters:
 * - period: Time period (1D, 1W, 1M, 3M, 1Y, all)
 * - timeframe: Bar timeframe (1Min, 5Min, 15Min, 1H, 1D)
 * - date_end: End date (YYYY-MM-DD)
 * - extended_hours: Include extended hours (true/false)
 * 
 * Requirements: Portfolio performance tracking and visualization
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: getCorsHeaders(req) })
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        const url = new URL(req.url)
        const pathParts = url.pathname.split('/').filter(Boolean)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // Extract account ID from path or use auth context
        // Path format: /alpaca-portfolio-history or /alpaca-portfolio-history/{account_id}
        let accountId = pathParts.length > 1 ? pathParts[1] : null
        
        // If no account ID in path, use the one from auth context
        if (!accountId) {
          if (!authContext.alpacaAccountId) {
            return createErrorResponse(
              {
                code: 'NO_ACCOUNT',
                message: 'No Alpaca account linked to this user',
                details: { userId: authContext.userId }
              },
              404
            )
          }
          accountId = authContext.alpacaAccountId
        }
        
        console.log(`Processing ${req.method} portfolio history request for account ${accountId} in ${authContext.tradingMode} mode`)
        
        // Handle GET requests
        if (req.method === 'GET') {
          const params: Record<string, string> = {}
          
          // Extract query parameters
          const period = url.searchParams.get('period')
          const timeframe = url.searchParams.get('timeframe')
          const dateEnd = url.searchParams.get('date_end')
          const extendedHours = url.searchParams.get('extended_hours')
          
          if (period) params.period = period
          if (timeframe) params.timeframe = timeframe
          if (dateEnd) params.date_end = dateEnd
          if (extendedHours) params.extended_hours = extendedHours
          
          const response = await alpacaClient.getPortfolioHistory(accountId, params)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to fetch portfolio history',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse(response.data)
        }
        
        // Method not allowed
        return createErrorResponse(
          {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${req.method} not allowed. Supported methods: GET`
          },
          405
        )
        
      } catch (error) {
        console.error('Unexpected error in portfolio history endpoint:', error)
        return createErrorResponse(
          {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'An unexpected error occurred'
          },
          500
        )
      }
    })
  })
})
