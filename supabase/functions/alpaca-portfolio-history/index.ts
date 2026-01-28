import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { 
  withAuth, 
  processRequest, 
  createSuccessResponse, 
  createErrorResponse,
  AlpacaClient,
  corsHeaders
} from '../_shared/index.ts'
import type { AuthContext } from '../_shared/auth.ts'

// Schema for query parameters
const portfolioHistoryQuerySchema = z.object({
  period: z.enum(['1D', '1W', '1M', '3M', '1A', '2A', '5A', 'all']).default('1M'),
  timeframe: z.enum(['1Min', '5Min', '15Min', '1H', '1D']).default('1D'),
  date_end: z.string().optional(),
  asof: z.string().optional(),
  page_size: z.coerce.number().min(1).max(10000).default(1000),
  page_token: z.string().optional(),
  pnl_reset: z.enum(['per_day', 'per_position']).default('per_day'),
});

/**
 * Edge Function handler for Alpaca portfolio history
 * 
 * GET: Retrieves the user's portfolio history with various time parameters
 * 
 * Requirements: 1.1, 1.2, 5.5
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
          code: 'METHOD_NOT_ALLOWED',
          message: 'Method not allowed. Only GET requests are supported.'
        },
        405
      )
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        console.log(`Processing portfolio history request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Parse URL and extract query parameters
        const url = new URL(req.url)
        const queryParams = Object.fromEntries(url.searchParams)
        
        // Validate query parameters
        try {
          const validatedQuery = portfolioHistoryQuerySchema.parse(queryParams)
          
          // Create Alpaca client with auth context
          const alpacaClient = new AlpacaClient(authContext)
          
          // Build query parameters for Alpaca API
          const params: Record<string, string> = {
            period: validatedQuery.period,
            timeframe: validatedQuery.timeframe,
            page_size: validatedQuery.page_size.toString(),
            pnl_reset: validatedQuery.pnl_reset
          }
          
          if (validatedQuery.date_end) params.date_end = validatedQuery.date_end
          if (validatedQuery.asof) params.asof = validatedQuery.asof
          if (validatedQuery.page_token) params.page_token = validatedQuery.page_token
          
          // Get account ID
          if (!authContext.alpacaAccountId) {
            return createErrorResponse(
              {
                code: 'NO_ACCOUNT',
                message: 'No Alpaca account linked to this user'
              },
              404
            )
          }
          
          // Make request to Alpaca Broker API with account ID
          const response = await alpacaClient.brokerRequest(
            `/v1/trading/accounts/${authContext.alpacaAccountId}/account/portfolio/history`,
            { params }
          )
          
          if (!response.success) {
            console.error('Failed to fetch portfolio history:', response.error)
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
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            return createErrorResponse(
              {
                code: 'INVALID_REQUEST',
                message: 'Invalid query parameters',
                details: validationError.errors
              },
              400
            )
          }
          throw validationError
        }
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