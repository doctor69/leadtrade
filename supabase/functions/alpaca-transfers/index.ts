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
 * Edge Function handler for Alpaca transfer operations
 * 
 * POST: Creates a new transfer (ACH, wire, or sandbox)
 * GET: Lists all transfers with optional filtering
 * DELETE: Cancels a pending transfer
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        const url = new URL(req.url)
        const pathParts = url.pathname.split('/').filter(Boolean)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // Extract account ID and transfer ID from path if present
        // Path format: /alpaca-transfers/{account_id} or /alpaca-transfers/{account_id}/{transfer_id}
        const accountId = pathParts.length > 1 ? pathParts[1] : null
        const transferId = pathParts.length > 2 ? pathParts[2] : null
        
        if (!accountId) {
          return createErrorResponse(
            {
              code: 'MISSING_ACCOUNT_ID',
              message: 'Account ID is required'
            },
            400
          )
        }
        
        console.log(`Processing ${req.method} transfer request for account ${accountId} in ${authContext.tradingMode} mode`)
        
        // Handle POST requests (create transfer)
        if (req.method === 'POST') {
          const body = await req.json()
          
          // Validate required fields
          if (!body.transfer_type || !body.amount || !body.direction) {
            return createErrorResponse(
              {
                code: 'INVALID_REQUEST',
                message: 'transfer_type, amount, and direction are required'
              },
              400
            )
          }
          
          // Validate transfer_type
          if (!['ach', 'wire', 'sandbox'].includes(body.transfer_type)) {
            return createErrorResponse(
              {
                code: 'INVALID_TRANSFER_TYPE',
                message: 'transfer_type must be one of: ach, wire, sandbox'
              },
              400
            )
          }
          
          // Validate direction
          if (!['INCOMING', 'OUTGOING'].includes(body.direction)) {
            return createErrorResponse(
              {
                code: 'INVALID_DIRECTION',
                message: 'direction must be either INCOMING or OUTGOING'
              },
              400
            )
          }
          
          // Validate amount is a positive number
          const amount = parseFloat(body.amount)
          if (isNaN(amount) || amount <= 0) {
            return createErrorResponse(
              {
                code: 'INVALID_AMOUNT',
                message: 'amount must be a positive number'
              },
              400
            )
          }
          
          // Validate wire transfer specific fields
          if (body.transfer_type === 'wire') {
            if (!body.additional_information) {
              return createErrorResponse(
                {
                  code: 'MISSING_WIRE_INFO',
                  message: 'additional_information is required for wire transfers'
                },
                400
              )
            }
            if (!body.fee_payment_method) {
              return createErrorResponse(
                {
                  code: 'MISSING_FEE_METHOD',
                  message: 'fee_payment_method is required for wire transfers'
                },
                400
              )
            }
            if (!['user', 'invoice'].includes(body.fee_payment_method)) {
              return createErrorResponse(
                {
                  code: 'INVALID_FEE_METHOD',
                  message: 'fee_payment_method must be either "user" or "invoice"'
                },
                400
              )
            }
          }
          
          // Validate ACH transfer requires relationship_id
          if (body.transfer_type === 'ach' && !body.relationship_id) {
            return createErrorResponse(
              {
                code: 'MISSING_RELATIONSHIP_ID',
                message: 'relationship_id is required for ACH transfers'
              },
              400
            )
          }
          
          // Validate wire transfer requires bank_id
          if (body.transfer_type === 'wire' && !body.bank_id) {
            return createErrorResponse(
              {
                code: 'MISSING_BANK_ID',
                message: 'bank_id is required for wire transfers'
              },
              400
            )
          }
          
          const response = await alpacaClient.createTransfer(accountId, body)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to create transfer',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse(response.data)
        }
        
        // Handle GET requests (list transfers)
        if (req.method === 'GET') {
          const params: Record<string, string> = {}
          
          // Extract query parameters for filtering
          const direction = url.searchParams.get('direction')
          const limit = url.searchParams.get('limit')
          const offset = url.searchParams.get('offset')
          
          if (direction) params.direction = direction
          if (limit) params.limit = limit
          if (offset) params.offset = offset
          
          const response = await alpacaClient.listTransfers(
            accountId,
            Object.keys(params).length > 0 ? params : undefined
          )
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to list transfers',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse(response.data)
        }
        
        // Handle DELETE requests (cancel transfer)
        if (req.method === 'DELETE') {
          if (!transferId) {
            return createErrorResponse(
              {
                code: 'MISSING_TRANSFER_ID',
                message: 'Transfer ID is required for cancellation'
              },
              400
            )
          }
          
          // Note: Alpaca API will validate that the transfer is in pending status
          // and return an error if it cannot be canceled
          const response = await alpacaClient.cancelTransfer(accountId, transferId)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to cancel transfer',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse({ message: 'Transfer canceled successfully' })
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
        console.error('Unexpected error in transfers endpoint:', error)
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
