import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { 
  withAuth, 
  processRequest, 
  createSuccessResponse, 
  createErrorResponse,
  AlpacaClient,
  corsHeaders
} from '../_shared/index.ts'
import type { AuthContext } from '../_shared/auth.ts'

/**
 * Edge Function handler for Alpaca account activities
 * 
 * GET: Retrieves account activities with pagination and filtering
 * 
 * Query Parameters:
 * - activity_types: Comma-separated list of activity types to filter by
 * - date: Date to filter activities (YYYY-MM-DD)
 * - until: Filter activities before this date
 * - after: Filter activities after this date
 * - direction: Sort direction (asc or desc)
 * - page_size: Number of results per page
 * - page_token: Token for pagination
 * 
 * Requirements: 1.5
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
        const url = new URL(req.url)
        const pathParts = url.pathname.split('/').filter(Boolean)
        
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
        
        console.log(`Processing activities request for account ${accountId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // Extract query parameters
        const params: Record<string, string> = {}
        
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
        if (direction && (direction === 'asc' || direction === 'desc')) params.direction = direction
        if (pageSize) params.page_size = pageSize
        if (pageToken) params.page_token = pageToken
        
        // Make request to Alpaca Broker API
        const response = await alpacaClient.getActivities(
          accountId,
          Object.keys(params).length > 0 ? params : undefined
        )
        
        if (!response.success) {
          console.error('Failed to fetch account activities:', response.error)
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
