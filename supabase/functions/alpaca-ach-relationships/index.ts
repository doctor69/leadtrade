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
 * Edge Function handler for Alpaca ACH relationship management
 * 
 * POST: Creates a new ACH relationship (manual entry or Plaid processor token)
 * GET: Lists all ACH relationships with optional filtering
 * DELETE: Removes an ACH relationship (validates no pending transfers)
 * 
 * Requirements: 3.2, 3.4, 3.5
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
        
        // Extract account ID and ACH relationship ID from path if present
        // Path format: /alpaca-ach-relationships/{account_id} or /alpaca-ach-relationships/{account_id}/{ach_id}
        const accountId = pathParts.length > 1 ? pathParts[1] : null
        const achId = pathParts.length > 2 ? pathParts[2] : null
        
        if (!accountId) {
          return createErrorResponse(
            {
              code: 'MISSING_ACCOUNT_ID',
              message: 'Account ID is required'
            },
            400
          )
        }
        
        console.log(`Processing ${req.method} ACH relationship request for account ${accountId} in ${authContext.tradingMode} mode`)
        
        // Handle POST requests (create ACH relationship)
        if (req.method === 'POST') {
          const body = await req.json()
          
          // Normalize bank_account_type to uppercase for Alpaca API
          if (body.bank_account_type) {
            body.bank_account_type = body.bank_account_type.toUpperCase()
          }
          
          // Validate required fields for manual entry
          if (!body.processor_token) {
            // Manual entry validation
            if (!body.account_owner_name || !body.bank_account_type || !body.bank_account_number || !body.bank_routing_number) {
              return createErrorResponse(
                {
                  code: 'INVALID_REQUEST',
                  message: 'For manual entry: account_owner_name, bank_account_type, bank_account_number, and bank_routing_number are required'
                },
                400
              )
            }
            
            // Validate bank_account_type (Alpaca requires uppercase)
            if (body.bank_account_type !== 'CHECKING' && body.bank_account_type !== 'SAVINGS') {
              return createErrorResponse(
                {
                  code: 'INVALID_ACCOUNT_TYPE',
                  message: 'bank_account_type must be either "CHECKING" or "SAVINGS"'
                },
                400
              )
            }
            
            // Validate routing number format (9 digits)
            if (!/^\d{9}$/.test(body.bank_routing_number)) {
              return createErrorResponse(
                {
                  code: 'INVALID_ROUTING_NUMBER',
                  message: 'bank_routing_number must be exactly 9 digits'
                },
                400
              )
            }
          } else {
            // Plaid processor token validation
            if (!body.account_owner_name || !body.bank_account_type) {
              return createErrorResponse(
                {
                  code: 'INVALID_REQUEST',
                  message: 'For Plaid integration: account_owner_name and bank_account_type are required'
                },
                400
              )
            }
          }
          
          const response = await alpacaClient.createACHRelationship(accountId, body)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to create ACH relationship',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse(response.data)
        }
        
        // Handle GET requests (list ACH relationships)
        if (req.method === 'GET') {
          const params: Record<string, string> = {}
          
          // Extract query parameters for filtering
          const status = url.searchParams.get('status')
          
          if (status) params.status = status
          
          const response = await alpacaClient.listACHRelationships(
            accountId,
            Object.keys(params).length > 0 ? params : undefined
          )
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to list ACH relationships',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse(response.data)
        }
        
        // Handle DELETE requests (remove ACH relationship)
        if (req.method === 'DELETE') {
          if (!achId) {
            return createErrorResponse(
              {
                code: 'MISSING_ACH_ID',
                message: 'ACH relationship ID is required for deletion'
              },
              400
            )
          }
          
          // Note: Alpaca API will validate that no pending transfers exist
          // and return an error if there are any
          const response = await alpacaClient.deleteACHRelationship(accountId, achId)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to delete ACH relationship',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse({ message: 'ACH relationship deleted successfully' })
        }
        
        // Method not allowed
        return createErrorResponse(
          {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${req.method} not allowed. Supported methods: GET, POST, DELETE`
          },
          405
        )
        
      } catch (error) {
        console.error('Unexpected error in ACH relationships endpoint:', error)
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
