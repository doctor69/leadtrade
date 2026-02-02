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
import type { TradingConfiguration } from '../_shared/alpaca-client.ts'

/**
 * Edge Function handler for Alpaca trading configuration management
 * 
 * GET: Retrieves account trading configuration
 * PATCH: Updates account trading configuration
 * 
 * Supported configuration fields:
 * - dtbp_check: Day Trade Buying Power check ('entry' | 'exit' | 'both')
 * - trade_confirm_email: Trade confirmation emails ('all' | 'none')
 * - suspend_trade: Suspend trading (boolean)
 * - no_shorting: Disable short selling (boolean)
 * - fractional_trading: Enable fractional shares (boolean)
 * - max_margin_multiplier: Maximum margin multiplier (string)
 * - pdt_check: Pattern Day Trader check ('entry' | 'exit' | 'both')
 * - ptp_no_exception_entry: Prevent Pattern Day Trader exceptions (boolean)
 * - max_options_trading_level: Maximum options trading level (0-3)
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
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
        
        console.log('Full URL:', req.url)
        console.log('Pathname:', url.pathname)
        console.log('Path parts:', pathParts)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // Extract account ID from path
        // Path format: /alpaca-trading-config/{account_id}
        // After filtering empty strings, pathParts should be: ['alpaca-trading-config', '{account_id}']
        const accountId = pathParts.length > 1 ? pathParts[1] : null
        
        console.log('Extracted account ID:', accountId)
        
        if (!accountId) {
          return createErrorResponse(
            {
              code: 'MISSING_ACCOUNT_ID',
              message: 'Account ID is required in the path',
              details: { pathname: url.pathname, pathParts }
            },
            400
          )
        }
        
        console.log(`Processing ${req.method} trading config request for account ${accountId} in ${authContext.tradingMode} mode`)
        
        // Handle GET requests
        if (req.method === 'GET') {
          const response = await alpacaClient.getAccountConfiguration(accountId)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to fetch trading configuration',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse(response.data)
        }
        
        // Handle PATCH requests (update configuration)
        if (req.method === 'PATCH') {
          const body = await req.json() as Partial<TradingConfiguration>
          
          // Validate that at least one field is being updated
          const validFields = [
            'dtbp_check',
            'trade_confirm_email',
            'suspend_trade',
            'no_shorting',
            'fractional_trading',
            'max_margin_multiplier',
            'pdt_check',
            'ptp_no_exception_entry',
            'max_options_trading_level'
          ]
          
          const hasValidField = Object.keys(body).some(key => validFields.includes(key))
          
          if (!hasValidField) {
            return createErrorResponse(
              {
                code: 'INVALID_REQUEST',
                message: 'At least one valid configuration field must be provided',
                details: { validFields }
              },
              400
            )
          }
          
          // Validate dtbp_check values
          if (body.dtbp_check && !['entry', 'exit', 'both'].includes(body.dtbp_check)) {
            return createErrorResponse(
              {
                code: 'INVALID_DTBP_CHECK',
                message: 'dtbp_check must be one of: entry, exit, both'
              },
              400
            )
          }
          
          // Validate trade_confirm_email values
          if (body.trade_confirm_email && !['all', 'none'].includes(body.trade_confirm_email)) {
            return createErrorResponse(
              {
                code: 'INVALID_TRADE_CONFIRM_EMAIL',
                message: 'trade_confirm_email must be one of: all, none'
              },
              400
            )
          }
          
          // Validate pdt_check values
          if (body.pdt_check && !['entry', 'exit', 'both'].includes(body.pdt_check)) {
            return createErrorResponse(
              {
                code: 'INVALID_PDT_CHECK',
                message: 'pdt_check must be one of: entry, exit, both'
              },
              400
            )
          }
          
          // Validate max_options_trading_level
          if (body.max_options_trading_level !== undefined) {
            const level = body.max_options_trading_level
            if (typeof level !== 'number' || level < 0 || level > 3) {
              return createErrorResponse(
                {
                  code: 'INVALID_OPTIONS_LEVEL',
                  message: 'max_options_trading_level must be a number between 0 and 3'
                },
                400
              )
            }
          }
          
          // Validate max_margin_multiplier
          if (body.max_margin_multiplier !== undefined) {
            const multiplier = parseFloat(body.max_margin_multiplier)
            if (isNaN(multiplier) || multiplier < 1 || multiplier > 4) {
              return createErrorResponse(
                {
                  code: 'INVALID_MARGIN_MULTIPLIER',
                  message: 'max_margin_multiplier must be a number between 1 and 4'
                },
                400
              )
            }
          }
          
          const response = await alpacaClient.updateAccountConfiguration(accountId, body)
          
          if (!response.success) {
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to update trading configuration',
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
            message: `Method ${req.method} not allowed. Supported methods: GET, PATCH`
          },
          405
        )
        
      } catch (error) {
        console.error('Unexpected error in trading config endpoint:', error)
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
