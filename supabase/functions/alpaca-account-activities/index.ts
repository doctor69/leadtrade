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
 * Edge Function handler for Alpaca Account Activities API
 * 
 * GET /{account_id}/activities - List account activities
 * 
 * Supports filtering by:
 * - activity_types: FILL, TRANS, DIV, etc.
 * - date: Specific date (YYYY-MM-DD)
 * - until: End date (YYYY-MM-DD)
 * - after: Start date (YYYY-MM-DD)
 * - direction: asc or desc
 * - page_size: Number of results per page
 * - page_token: Pagination token
 * 
 * Requirements: Account activity tracking and history
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
        
        // Extract account ID from path
        // Path format: /alpaca-account-activities/{account_id}
        const accountId = pathParts.length > 1 ? pathParts[1] : null
        
        if (!accountId) {
          return createErrorResponse(
            {
              code: 'MISSING_ACCOUNT_ID',
              message: 'Account ID is required in the path'
            },
            400
          )
        }
        
        console.log(`Processing ${req.method} account activities request for account ${accountId} in ${authContext.tradingMode} mode`)
        
        // Handle GET requests
        if (req.method === 'GET') {
          const params: Record<string, string> = {}
          
          // Extract query parameters
          const activityTypes = url.searchParams.get('activity_types')
          const date = url.searchParams.get('date')
          const until = url.searchParams.get('until')
          const after = url.searchParams.get('after')
          const direction = url.searchParams.get('direction')
          const pageSize = url.searchParams.get('page_size')
          const pageToken = url.searchParams.get('page_token')
          
          if (activityTypes) params.activity_types = activityTypes
          if (date) params.date = date
          if (until) params.until = until
          if (after) params.after = after
          if (direction) params.direction = direction
          if (pageSize) params.page_size = pageSize
          if (pageToken) params.page_token = pageToken
          
          const response = await alpacaClient.getActivities(accountId, params)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to fetch account activities',
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
        console.error('Unexpected error in account activities endpoint:', error)
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
