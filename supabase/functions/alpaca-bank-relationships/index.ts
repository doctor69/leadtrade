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
 * Edge Function handler for Alpaca bank relationship management
 * 
 * POST: Creates a new bank relationship
 * GET: Lists all bank relationships with optional filtering
 * DELETE: Removes a bank relationship
 * 
 * Requirements: 3.1, 3.3, 3.4
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
        
        // Extract account ID and bank ID from path if present
        // Path format: /alpaca-bank-relationships/{account_id} or /alpaca-bank-relationships/{account_id}/{bank_id}
        const accountId = pathParts.length > 1 ? pathParts[1] : null
        const bankId = pathParts.length > 2 ? pathParts[2] : null
        
        if (!accountId) {
          return createErrorResponse(
            {
              code: 'MISSING_ACCOUNT_ID',
              message: 'Account ID is required'
            },
            400
          )
        }
        
        console.log(`Processing ${req.method} bank relationship request for account ${accountId} in ${authContext.tradingMode} mode`)
        
        // Handle POST requests (create bank relationship)
        if (req.method === 'POST') {
          const body = await req.json()
          
          // Validate required fields
          if (!body.name || !body.bank_code || !body.bank_code_type || !body.account_number) {
            return createErrorResponse(
              {
                code: 'INVALID_REQUEST',
                message: 'name, bank_code, bank_code_type, and account_number are required'
              },
              400
            )
          }
          
          // Validate bank_code_type
          if (body.bank_code_type !== 'aba' && body.bank_code_type !== 'bic') {
            return createErrorResponse(
              {
                code: 'INVALID_BANK_CODE_TYPE',
                message: 'bank_code_type must be either "aba" or "bic"'
              },
              400
            )
          }
          
          // Transform bank_code_type to uppercase for Alpaca API
          const bankData = {
            ...body,
            bank_code_type: body.bank_code_type.toUpperCase()
          }
          
          const response = await alpacaClient.createBankRelationship(accountId, bankData)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to create bank relationship',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse(response.data)
        }
        
        // Handle GET requests (list bank relationships)
        if (req.method === 'GET') {
          const params: Record<string, string> = {}
          
          // Extract query parameters for filtering
          const status = url.searchParams.get('status')
          const bankName = url.searchParams.get('bank_name')
          
          if (status) params.status = status
          if (bankName) params.bank_name = bankName
          
          const response = await alpacaClient.listBankRelationships(
            accountId,
            Object.keys(params).length > 0 ? params : undefined
          )
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to list bank relationships',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse(response.data)
        }
        
        // Handle DELETE requests (remove bank relationship)
        if (req.method === 'DELETE') {
          if (!bankId) {
            return createErrorResponse(
              {
                code: 'MISSING_BANK_ID',
                message: 'Bank ID is required for deletion'
              },
              400
            )
          }
          
          const response = await alpacaClient.deleteBankRelationship(accountId, bankId)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to delete bank relationship',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse({ message: 'Bank relationship deleted successfully' })
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
        console.error('Unexpected error in bank relationships endpoint:', error)
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
