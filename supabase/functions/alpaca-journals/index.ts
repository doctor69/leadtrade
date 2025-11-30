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
 * Edge Function handler for Alpaca journal operations
 * 
 * POST /v1/journals: Creates a new journal entry (JNLC or JNLS)
 * POST /v1/journals/batch: Creates batch journal entries
 * GET /v1/journals: Lists all journals with optional filtering
 * DELETE /v1/journals/{journal_id}: Cancels a pending journal
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
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
        
        // Extract journal ID from path if present
        // Path format: /alpaca-journals or /alpaca-journals/{journal_id} or /alpaca-journals/batch
        const journalId = pathParts.length > 1 ? pathParts[1] : null
        const isBatch = journalId === 'batch'
        
        console.log(`Processing ${req.method} journal request in ${authContext.tradingMode} mode`)
        
        // Handle POST requests (create journal or batch journals)
        if (req.method === 'POST') {
          const body = await req.json()
          
          // Handle batch journal creation
          if (isBatch) {
            // Validate batch journal request
            if (!body.entry_type || body.entry_type !== 'JNLC') {
              return createErrorResponse(
                {
                  code: 'INVALID_ENTRY_TYPE',
                  message: 'Batch journals only support JNLC (cash) entry type'
                },
                400
              )
            }
            
            if (!body.entries || !Array.isArray(body.entries) || body.entries.length === 0) {
              return createErrorResponse(
                {
                  code: 'INVALID_ENTRIES',
                  message: 'entries array is required and must not be empty'
                },
                400
              )
            }
            
            // Validate batch type (one-to-many or many-to-one)
            const hasFromAccount = !!body.from_account
            const hasToAccount = !!body.to_account
            
            if (hasFromAccount && hasToAccount) {
              return createErrorResponse(
                {
                  code: 'INVALID_BATCH_TYPE',
                  message: 'Specify either from_account (one-to-many) or to_account (many-to-one), not both'
                },
                400
              )
            }
            
            if (!hasFromAccount && !hasToAccount) {
              return createErrorResponse(
                {
                  code: 'MISSING_ACCOUNT',
                  message: 'Either from_account or to_account must be specified for batch journals'
                },
                400
              )
            }
            
            // Validate each entry
            for (const entry of body.entries) {
              if (!entry.amount) {
                return createErrorResponse(
                  {
                    code: 'MISSING_AMOUNT',
                    message: 'Each entry must have an amount'
                  },
                  400
                )
              }
              
              const amount = parseFloat(entry.amount)
              if (isNaN(amount) || amount <= 0) {
                return createErrorResponse(
                  {
                    code: 'INVALID_AMOUNT',
                    message: 'Each entry amount must be a positive number'
                  },
                  400
                )
              }
              
              // For one-to-many, each entry needs to_account
              if (hasFromAccount && !entry.to_account) {
                return createErrorResponse(
                  {
                    code: 'MISSING_TO_ACCOUNT',
                    message: 'Each entry must have to_account for one-to-many batch'
                  },
                  400
                )
              }
              
              // For many-to-one, each entry needs from_account
              if (hasToAccount && !entry.from_account) {
                return createErrorResponse(
                  {
                    code: 'MISSING_FROM_ACCOUNT',
                    message: 'Each entry must have from_account for many-to-one batch'
                  },
                  400
                )
              }
            }
            
            const response = await alpacaClient.createBatchJournals(body)
            
            if (!response.success) {
              return createErrorResponse(
                {
                  code: response.error?.code || 'ALPACA_API_ERROR',
                  message: response.error?.message || 'Failed to create batch journals',
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            return createSuccessResponse(response.data)
          }
          
          // Handle single journal creation
          // Validate required fields
          if (!body.entry_type || !body.from_account || !body.to_account) {
            return createErrorResponse(
              {
                code: 'INVALID_REQUEST',
                message: 'entry_type, from_account, and to_account are required'
              },
              400
            )
          }
          
          // Validate entry_type
          if (!['JNLC', 'JNLS'].includes(body.entry_type)) {
            return createErrorResponse(
              {
                code: 'INVALID_ENTRY_TYPE',
                message: 'entry_type must be either JNLC (cash) or JNLS (securities)'
              },
              400
            )
          }
          
          // Validate JNLC (cash) journal
          if (body.entry_type === 'JNLC') {
            if (!body.amount) {
              return createErrorResponse(
                {
                  code: 'MISSING_AMOUNT',
                  message: 'amount is required for JNLC (cash) journals'
                },
                400
              )
            }
            
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
          }
          
          // Validate JNLS (securities) journal
          if (body.entry_type === 'JNLS') {
            if (!body.symbol || !body.qty) {
              return createErrorResponse(
                {
                  code: 'MISSING_FIELDS',
                  message: 'symbol and qty are required for JNLS (securities) journals'
                },
                400
              )
            }
            
            const qty = parseFloat(body.qty)
            if (isNaN(qty) || qty <= 0) {
              return createErrorResponse(
                {
                  code: 'INVALID_QTY',
                  message: 'qty must be a positive number'
                },
                400
              )
            }
          }
          
          const response = await alpacaClient.createJournal(body)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to create journal',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse(response.data)
        }
        
        // Handle GET requests (list journals)
        if (req.method === 'GET') {
          const params: Record<string, string> = {}
          
          // Extract query parameters for filtering
          const after = url.searchParams.get('after')
          const before = url.searchParams.get('before')
          const status = url.searchParams.get('status')
          const entry_type = url.searchParams.get('entry_type')
          const to_account = url.searchParams.get('to_account')
          const from_account = url.searchParams.get('from_account')
          
          if (after) params.after = after
          if (before) params.before = before
          if (status) params.status = status
          if (entry_type) params.entry_type = entry_type
          if (to_account) params.to_account = to_account
          if (from_account) params.from_account = from_account
          
          const response = await alpacaClient.listJournals(
            Object.keys(params).length > 0 ? params : undefined
          )
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to list journals',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse(response.data)
        }
        
        // Handle DELETE requests (cancel journal)
        if (req.method === 'DELETE') {
          if (!journalId || journalId === 'batch') {
            return createErrorResponse(
              {
                code: 'MISSING_JOURNAL_ID',
                message: 'Journal ID is required for cancellation'
              },
              400
            )
          }
          
          // Note: Alpaca API will validate that the journal is in pending status
          // and return an error if it cannot be canceled (e.g., already executed)
          const response = await alpacaClient.cancelJournal(journalId)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to cancel journal',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse({ message: 'Journal canceled successfully' })
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
        console.error('Unexpected error in journals endpoint:', error)
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
