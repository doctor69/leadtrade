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
 * Edge Function handler for Alpaca account management
 * 
 * GET: Retrieves account information or lists all accounts with filtering
 * PATCH: Updates account contact, identity, disclosures, or trusted_contact
 * DELETE: Closes an account
 * POST: Requests options approval (when path includes /options_approval)
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
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
        
        // Extract account ID from path if present
        // Path format: /alpaca-account or /alpaca-account/{account_id} or /alpaca-account/{account_id}/options_approval
        const accountIdFromPath = pathParts.length > 1 ? pathParts[1] : null
        const isOptionsApproval = pathParts.length > 2 && pathParts[2] === 'options_approval'
        
        console.log(`Processing ${req.method} account request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Handle GET requests
        if (req.method === 'GET') {
          // If no account ID in path, list all accounts with optional filtering
          if (!accountIdFromPath) {
            const params: Record<string, string> = {}
            
            // Extract query parameters for filtering
            const query = url.searchParams.get('query')
            const createdAfter = url.searchParams.get('created_after')
            const createdBefore = url.searchParams.get('created_before')
            const status = url.searchParams.get('status')
            const sort = url.searchParams.get('sort')
            const entities = url.searchParams.get('entities')
            
            if (query) params.query = query
            if (createdAfter) params.created_after = createdAfter
            if (createdBefore) params.created_before = createdBefore
            if (status) params.status = status
            if (sort) params.sort = sort
            if (entities) params.entities = entities
            
            const response = await alpacaClient.getAccounts(Object.keys(params).length > 0 ? params : undefined)
            
            if (!response.success) {
              return createErrorResponse(
                {
                  code: response.error?.code || 'ALPACA_API_ERROR',
                  message: response.error?.message || 'Failed to fetch accounts',
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            return createSuccessResponse(response.data)
          }
          
          // Get specific account by ID
          const response = await alpacaClient.getAccount(accountIdFromPath)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to fetch account data',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse(response.data)
        }
        
        // Handle PATCH requests (update account)
        if (req.method === 'PATCH') {
          if (!accountIdFromPath) {
            return createErrorResponse(
              {
                code: 'MISSING_ACCOUNT_ID',
                message: 'Account ID is required for update operations'
              },
              400
            )
          }
          
          const body = await req.json()
          
          // Validate that at least one field is being updated
          if (!body.contact && !body.identity && !body.disclosures && !body.trusted_contact) {
            return createErrorResponse(
              {
                code: 'INVALID_REQUEST',
                message: 'At least one of contact, identity, disclosures, or trusted_contact must be provided'
              },
              400
            )
          }
          
          const response = await alpacaClient.updateAccount(accountIdFromPath, body)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to update account',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse(response.data)
        }
        
        // Handle DELETE requests (close account)
        if (req.method === 'DELETE') {
          if (!accountIdFromPath) {
            return createErrorResponse(
              {
                code: 'MISSING_ACCOUNT_ID',
                message: 'Account ID is required for account closure'
              },
              400
            )
          }
          
          const response = await alpacaClient.closeAccount(accountIdFromPath)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to close account',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse({ message: 'Account closed successfully' })
        }
        
        // Handle POST requests (options approval)
        if (req.method === 'POST') {
          if (!accountIdFromPath) {
            return createErrorResponse(
              {
                code: 'MISSING_ACCOUNT_ID',
                message: 'Account ID is required for options approval request'
              },
              400
            )
          }
          
          if (!isOptionsApproval) {
            return createErrorResponse(
              {
                code: 'INVALID_ENDPOINT',
                message: 'POST requests are only supported for /options_approval endpoint'
              },
              400
            )
          }
          
          const body = await req.json()
          
          if (typeof body.level !== 'number' || body.level < 0 || body.level > 3) {
            return createErrorResponse(
              {
                code: 'INVALID_LEVEL',
                message: 'Options approval level must be a number between 0 and 3'
              },
              400
            )
          }
          
          const response = await alpacaClient.requestOptionsApproval(accountIdFromPath, body.level)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to request options approval',
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
            message: `Method ${req.method} not allowed. Supported methods: GET, PATCH, DELETE, POST`
          },
          405
        )
        
      } catch (error) {
        console.error('Unexpected error in account endpoint:', error)
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