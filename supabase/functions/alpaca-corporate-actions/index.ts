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
 * Edge Function handler for Alpaca Corporate Actions API
 * 
 * GET /announcements - List corporate action announcements
 * GET /announcements/:id - Get specific corporate action announcement
 * 
 * Supports filtering by:
 * - ca_types: dividend, merger, spinoff, split
 * - since: Start date (YYYY-MM-DD)
 * - until: End date (YYYY-MM-DD)
 * - symbol: Filter by symbol
 * - cusip: Filter by CUSIP
 * 
 * Requirements: Corporate actions tracking and notifications
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
        
        console.log(`Processing ${req.method} corporate actions request in ${authContext.tradingMode} mode`)
        console.log(`URL path: ${url.pathname}`)
        console.log(`Path parts:`, pathParts)
        
        // Handle GET requests
        if (req.method === 'GET') {
          // Check if requesting specific announcement by ID
          // Path format: /alpaca-corporate-actions/announcements/{id}
          const announcementIndex = pathParts.indexOf('announcements')
          const announcementId = announcementIndex >= 0 && pathParts.length > announcementIndex + 1 
            ? pathParts[announcementIndex + 1] 
            : null
          
          if (announcementId) {
            // Get specific corporate action announcement
            console.log(`Fetching specific announcement: ${announcementId}`)
            const response = await alpacaClient.brokerRequest(`/v1/corporate_actions/announcements/${announcementId}`)
            
            if (!response.success) {
              return createErrorResponse(
                {
                  code: response.error?.code || 'ALPACA_API_ERROR',
                  message: response.error?.message || 'Failed to fetch corporate action announcement',
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            return createSuccessResponse(response.data)
          }
          
          // List corporate action announcements with filters
          console.log('Listing corporate action announcements')
          const params: Record<string, string> = {}
          
          // Extract query parameters
          const caTypes = url.searchParams.get('ca_types')
          const since = url.searchParams.get('since')
          const until = url.searchParams.get('until')
          const symbol = url.searchParams.get('symbol')
          const cusip = url.searchParams.get('cusip')
          const pageToken = url.searchParams.get('page_token')
          const pageSize = url.searchParams.get('page_size')
          
          // Alpaca requires both since and until
          if (!since || !until) {
            return createErrorResponse(
              {
                code: 'MISSING_REQUIRED_PARAMS',
                message: 'Both since and until parameters are required'
              },
              400
            )
          }
          
          if (caTypes) params.ca_types = caTypes
          params.since = since
          params.until = until
          if (symbol) params.symbol = symbol
          if (cusip) params.cusip = cusip
          if (pageToken) params.page_token = pageToken
          if (pageSize) params.page_size = pageSize
          
          console.log('Sending to Alpaca:', params)
          
          const response = await alpacaClient.brokerRequest(
            '/v1/corporate_actions/announcements',
            { params }
          )
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to list corporate action announcements',
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
        console.error('Unexpected error in corporate actions endpoint:', error)
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
