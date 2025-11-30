// Add Deno types reference
/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { 
  withAuth, 
  processRequest, 
  createSuccessResponse, 
  createErrorResponse,
  AlpacaClient,
  corsHeaders,
  ERROR_CODES
} from '../_shared/index.ts'
import type { AuthContext } from '../_shared/auth.ts'

// Schema for options order details
const optionOrderSchema = z.object({
  symbol: z.string().min(1, 'Underlying symbol is required'),
  qty: z.number().positive('Quantity must be positive'),
  side: z.enum(['buy', 'sell'], { required_error: 'Side must be buy or sell' }),
  type: z.enum(['market', 'limit', 'stop', 'stop_limit'], { required_error: 'Order type is required' }),
  time_in_force: z.enum(['day', 'gtc', 'ioc', 'fok']).default('day'),
  limit_price: z.number().positive().optional(),
  stop_price: z.number().positive().optional(),
  client_order_id: z.string().optional(),
  option_details: z.object({
    strike: z.number().positive('Strike price must be positive'),
    expiration: z.string().min(1, 'Expiration date is required'),
    option_type: z.enum(['call', 'put'], { required_error: 'Option type must be call or put' }),
    contract_size: z.number().positive().default(100)
  })
});

// Schema for query parameters
const optionsQuerySchema = z.object({
  status: z.enum(['open', 'closed', 'all']).default('open'),
  limit: z.coerce.number().min(1).max(500).default(50),
  after: z.string().optional(),
  until: z.string().optional(),
  direction: z.enum(['asc', 'desc']).default('desc'),
  nested: z.coerce.boolean().default(true),
  symbols: z.string().optional(), // comma-separated symbols
  class: z.literal('option').default('option') // Always 'option' for this endpoint
});

/**
 * Constructs an option symbol in OCC format
 * Format: {Symbol}{YY}{MM}{DD}{C/P}{Strike*1000}
 * Example: AAPL230616C00150000 (Apple $150 Call expiring June 16, 2023)
 */
function constructOptionSymbol(underlyingSymbol: string, optionDetails: {
  strike: number;
  expiration: string;
  option_type: 'call' | 'put';
}): string {
  // Parse expiration date
  const expirationDate = new Date(optionDetails.expiration);
  const year = expirationDate.getFullYear().toString().slice(-2);
  const month = (expirationDate.getMonth() + 1).toString().padStart(2, '0');
  const day = expirationDate.getDate().toString().padStart(2, '0');
  
  // Format strike price (multiply by 1000 and pad to 8 digits)
  const strikeFormatted = Math.round(optionDetails.strike * 1000).toString().padStart(8, '0');
  
  // Option type (C for call, P for put)
  const optionType = optionDetails.option_type.toUpperCase().charAt(0);
  
  return `${underlyingSymbol}${year}${month}${day}${optionType}${strikeFormatted}`;
}

/**
 * Edge Function handler for Alpaca options orders
 * 
 * GET: Retrieves options orders with filtering
 * POST: Places a new options order
 * DELETE: Cancels an existing options order
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow GET, POST, and DELETE requests
    if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
      return createErrorResponse(
        {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Method not allowed. Only GET, POST, and DELETE requests are supported.'
        },
        405
      )
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        console.log(`Processing options orders request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // Handle GET request (list options orders)
        if (req.method === 'GET') {
          // Parse URL and extract query parameters
          const url = new URL(req.url)
          const queryParams = Object.fromEntries(url.searchParams)
          
          // Validate query parameters
          try {
            const validatedQuery = optionsQuerySchema.parse(queryParams)
            
            // Build query parameters for Alpaca API
            const params: Record<string, string> = {
              status: validatedQuery.status,
              limit: validatedQuery.limit.toString(),
              direction: validatedQuery.direction,
              nested: validatedQuery.nested.toString(),
              class: 'option' // Always filter for options
            }
            
            if (validatedQuery.after) params.after = validatedQuery.after
            if (validatedQuery.until) params.until = validatedQuery.until
            if (validatedQuery.symbols) params.symbols = validatedQuery.symbols
            
            // Make request to Alpaca API
            const response = await alpacaClient.brokerRequest('/v2/orders', { params })
            
            if (!response.success) {
              console.error('Failed to fetch options orders:', response.error)
              return createErrorResponse(
                {
                  code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: response.error?.message || 'Failed to fetch options orders',
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            return createSuccessResponse(response.data)
          } catch (error) {
            const validationError = error as Error;
            if (validationError instanceof z.ZodError) {
              return createErrorResponse(
                {
                  code: ERROR_CODES.INVALID_REQUEST,
                  message: 'Invalid query parameters',
                  details: validationError.errors
                },
                400
              )
            }
            throw validationError
          }
        }
        
        // Handle POST request (create options order)
        if (req.method === 'POST') {
          try {
            const body = await req.json()
            const validatedOrder = optionOrderSchema.parse(body)
            
            // Validate limit price for limit orders
            if (validatedOrder.type === 'limit' && !validatedOrder.limit_price) {
              return createErrorResponse(
                {
                  code: ERROR_CODES.INVALID_REQUEST,
                  message: 'Limit price required for limit orders',
                  details: 'Please provide a limit price for your limit order.'
                },
                400
              )
            }
            
            // Validate stop price for stop orders
            if ((validatedOrder.type === 'stop' || validatedOrder.type === 'stop_limit') && !validatedOrder.stop_price) {
              return createErrorResponse(
                {
                  code: ERROR_CODES.INVALID_REQUEST,
                  message: 'Stop price required for stop orders',
                  details: 'Please provide a stop price for your stop order.'
                },
                400
              )
            }
            
            // Construct option symbol in OCC format for Alpaca
            const optionSymbol = constructOptionSymbol(
              validatedOrder.symbol, 
              validatedOrder.option_details
            )
            
            // Requirement 7.5: Validate contract availability
            console.log(`Validating contract availability for ${optionSymbol}`)
            const contractResponse = await alpacaClient.brokerRequest(`/v1/options/contracts/${optionSymbol}`)
            
            if (!contractResponse.success) {
              console.error('Contract not found or unavailable:', contractResponse.error)
              return createErrorResponse(
                {
                  code: ERROR_CODES.INVALID_REQUEST,
                  message: 'Option contract not available',
                  details: `The option contract ${optionSymbol} is not available for trading. Please verify the contract details.`
                },
                400
              )
            }
            
            const contract = contractResponse.data
            
            // Check if contract is tradable
            if (!contract.tradable || contract.status !== 'active') {
              return createErrorResponse(
                {
                  code: ERROR_CODES.INVALID_REQUEST,
                  message: 'Option contract not tradable',
                  details: `The option contract ${optionSymbol} is not currently tradable (status: ${contract.status}).`
                },
                400
              )
            }
            
            // Requirement 7.5: Validate account approval level
            console.log(`Validating account options approval level for account ${authContext.accountId}`)
            const configResponse = await alpacaClient.getAccountConfiguration(authContext.accountId)
            
            if (!configResponse.success) {
              console.error('Failed to retrieve account configuration:', configResponse.error)
              return createErrorResponse(
                {
                  code: ERROR_CODES.ALPACA_API_ERROR,
                  message: 'Failed to validate account options approval',
                  details: 'Unable to retrieve account configuration to verify options trading approval.'
                },
                500
              )
            }
            
            const accountConfig = configResponse.data
            const approvalLevel = accountConfig.max_options_trading_level || 0
            
            // Check if account has options trading enabled (level > 0)
            if (approvalLevel === 0) {
              return createErrorResponse(
                {
                  code: ERROR_CODES.INVALID_REQUEST,
                  message: 'Options trading not approved',
                  details: 'Your account does not have options trading approval. Please request options approval before placing options orders.'
                },
                403
              )
            }
            
            console.log(`Account has options approval level ${approvalLevel}`)
            
            // Prepare order payload for Alpaca API
            const orderPayload = {
              symbol: optionSymbol,
              qty: validatedOrder.qty,
              side: validatedOrder.side,
              type: validatedOrder.type,
              time_in_force: validatedOrder.time_in_force,
              class: 'option', // Specify this is an options order
              limit_price: validatedOrder.limit_price,
              stop_price: validatedOrder.stop_price,
              client_order_id: validatedOrder.client_order_id
            }
            
            // Make request to Alpaca API
            const response = await alpacaClient.brokerRequest('/v2/orders', { 
              method: 'POST',
              body: orderPayload
            })
            
            if (!response.success) {
              console.error('Failed to create options order:', response.error)
              return createErrorResponse(
                {
                  code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: response.error?.message || 'Failed to create options order',
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            return createSuccessResponse(response.data, 201)
          } catch (error) {
            const validationError = error as Error;
            if (validationError instanceof z.ZodError) {
              return createErrorResponse(
                {
                  code: ERROR_CODES.INVALID_REQUEST,
                  message: 'Invalid options order parameters',
                  details: validationError.errors
                },
                400
              )
            }
            throw validationError
          }
        }
        
        // Handle DELETE request (cancel options order)
        if (req.method === 'DELETE') {
          const url = new URL(req.url)
          const orderId = url.searchParams.get('orderId')
          
          if (!orderId) {
            return createErrorResponse(
              {
                code: ERROR_CODES.INVALID_REQUEST,
                message: 'Order ID is required',
                details: 'Please provide an order ID to cancel'
              },
              400
            )
          }
          
          // Make request to Alpaca API
          const response = await alpacaClient.brokerRequest(`/v2/orders/${orderId}`, { 
            method: 'DELETE'
          })
          
          if (!response.success) {
            console.error(`Failed to cancel options order ${orderId}:`, response.error)
            return createErrorResponse(
              {
                code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                message: response.error?.message || 'Failed to cancel options order',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse({ message: `Options order ${orderId} cancelled successfully` })
        }
        
        // This should never happen due to the method check above
        return createErrorResponse(
          {
            code: ERROR_CODES.INVALID_REQUEST,
            message: 'Method not allowed'
          },
          405
        )
      } catch (error) {
        console.error('Unexpected error in options orders endpoint:', error)
        return createErrorResponse(
          {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: error instanceof Error ? error.message : 'An unexpected error occurred'
          },
          500
        )
      }
    })
  })
})