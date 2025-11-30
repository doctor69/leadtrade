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
 * Edge Function handler for Pattern Day Trader (PDT) removal
 * 
 * POST /v1/accounts/{account_id}/pdt_removal
 * 
 * Removes the PDT flag from an account (one-time only).
 * Validates that:
 * - Account is currently flagged as PDT
 * - PDT removal has not been used before
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        // Only POST method is allowed
        if (req.method !== 'POST') {
          return createErrorResponse(
            {
              code: 'METHOD_NOT_ALLOWED',
              message: `Method ${req.method} not allowed. Only POST is supported.`
            },
            405
          )
        }

        const url = new URL(req.url)
        const pathParts = url.pathname.split('/').filter(Boolean)
        
        // Extract account ID from path
        // Path format: /alpaca-pdt-removal/{account_id}
        const accountId = pathParts.length > 1 ? pathParts[1] : null
        
        if (!accountId) {
          return createErrorResponse(
            {
              code: 'MISSING_ACCOUNT_ID',
              message: 'Account ID is required for PDT removal'
            },
            400
          )
        }

        console.log(`Processing PDT removal request for account ${accountId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // First, get the account to check PDT status
        const accountResponse = await alpacaClient.getAccount(accountId)
        
        if (!accountResponse.success) {
          return createErrorResponse(
            {
              code: accountResponse.error?.code || 'ALPACA_API_ERROR',
              message: accountResponse.error?.message || 'Failed to fetch account data',
              details: accountResponse.error?.details
            },
            accountResponse.error?.status || 400
          )
        }

        const account = accountResponse.data
        
        // Validate PDT eligibility
        if (!account) {
          return createErrorResponse(
            {
              code: 'ACCOUNT_NOT_FOUND',
              message: 'Account not found'
            },
            404
          )
        }

        // Check if account is currently flagged as PDT
        if (!account.pattern_day_trader) {
          return createErrorResponse(
            {
              code: 'NOT_PDT',
              message: 'Account is not currently flagged as a Pattern Day Trader'
            },
            403
          )
        }

        // Check if PDT removal has already been used
        if (account.pdt_removed) {
          return createErrorResponse(
            {
              code: 'PDT_REMOVAL_ALREADY_USED',
              message: `PDT removal was already used on ${account.pdt_removed_at}. This is a one-time only operation.`
            },
            403
          )
        }

        // Attempt PDT removal
        const response = await alpacaClient.removePDTFlag(accountId)
        
        if (!response.success) {
          return createErrorResponse(
            {
              code: response.error?.code || 'ALPACA_API_ERROR',
              message: response.error?.message || 'Failed to remove PDT flag',
              details: response.error?.details
            },
            response.error?.status || 400
          )
        }
        
        console.log(`PDT flag removed successfully for account ${accountId}`)
        
        return createSuccessResponse({
          message: 'PDT flag removed successfully',
          pdt_removed: true,
          pdt_removed_at: response.data?.pdt_removed_at || new Date().toISOString()
        })
        
      } catch (error) {
        console.error('Unexpected error in PDT removal endpoint:', error)
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
