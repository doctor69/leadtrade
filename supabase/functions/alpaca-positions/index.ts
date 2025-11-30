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

// Schema for query parameters
const positionsQuerySchema = z.object({
  symbols: z.string().optional(), // comma-separated symbols
});

/**
 * Edge Function handler for Alpaca positions
 * 
 * GET: Retrieves positions with optional filtering
 * DELETE: Closes positions
 * 
 * Requirements: 1.1, 1.2, 5.3
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow GET and DELETE requests
    if (!['GET', 'DELETE'].includes(req.method)) {
      return createErrorResponse(
        {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Method not allowed. Only GET and DELETE requests are supported.'
        },
        405
      )
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        console.log(`Processing positions request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // Handle GET request (list positions)
        if (req.method === 'GET') {
          // Parse URL and extract query parameters
          const url = new URL(req.url)
          const queryParams = Object.fromEntries(url.searchParams)
          
          // Validate query parameters
          try {
            const validatedQuery = positionsQuerySchema.parse(queryParams)
            
            // Build query parameters for Alpaca API
            const params: Record<string, string> = {}
            
            if (validatedQuery.symbols) params.symbols = validatedQuery.symbols
            
            // Get account ID from auth context or fetch from database
            let accountId = authContext.alpacaAccountId
            if (!accountId) {
              const accountsResponse = await alpacaClient.getAccounts()
              if (!accountsResponse.success || !accountsResponse.data || accountsResponse.data.length === 0) {
                return createErrorResponse(
                  {
                    code: ERROR_CODES.ALPACA_API_ERROR,
                    message: 'No Alpaca account found for this user'
                  },
                  404
                )
              }
              accountId = accountsResponse.data[0].id
            }

            // Make request to Alpaca Broker API
            const response = await alpacaClient.getPositions(accountId, params)
            
            if (!response.success) {
              console.error('Failed to fetch positions:', response.error)
              return createErrorResponse(
                {
                  code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: response.error?.message || 'Failed to fetch positions',
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
        
        // Handle DELETE request (close position)
        if (req.method === 'DELETE') {
          const url = new URL(req.url)
          const symbol = url.searchParams.get('symbol')
          const qty = url.searchParams.get('qty')
          const percentage = url.searchParams.get('percentage')
          
          if (!symbol) {
            return createErrorResponse(
              {
                code: ERROR_CODES.INVALID_REQUEST,
                message: 'Symbol is required',
                details: 'Please provide a symbol to close position'
              },
              400
            )
          }
          
          // Get account ID from auth context or fetch from database
          let accountId = authContext.alpacaAccountId
          if (!accountId) {
            const accountsResponse = await alpacaClient.getAccounts()
            if (!accountsResponse.success || !accountsResponse.data || accountsResponse.data.length === 0) {
              return createErrorResponse(
                {
                  code: ERROR_CODES.ALPACA_API_ERROR,
                  message: 'No Alpaca account found for this user'
                },
                404
              )
            }
            accountId = accountsResponse.data[0].id
          }
          
          // If qty or percentage is provided, we need to use the orders endpoint instead
          if (qty || percentage) {
            // Get the current position to determine side
            const positionResponse = await alpacaClient.getPosition(accountId, symbol)
            
            if (!positionResponse.success) {
              console.error(`Failed to fetch position for ${symbol}:`, positionResponse.error)
              return createErrorResponse(
                {
                  code: positionResponse.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: positionResponse.error?.message || `Failed to fetch position for ${symbol}`,
                  details: positionResponse.error?.details
                },
                positionResponse.error?.status || 400
              )
            }
            
            const position = positionResponse.data
            const side = position.side === 'long' ? 'sell' : 'buy'
            
            // Calculate quantity to close
            let closeQty: number
            if (qty) {
              closeQty = parseInt(qty, 10)
            } else if (percentage) {
              const percentValue = parseFloat(percentage)
              if (isNaN(percentValue) || percentValue <= 0 || percentValue > 100) {
                return createErrorResponse(
                  {
                    code: ERROR_CODES.INVALID_REQUEST,
                    message: 'Invalid percentage value',
                    details: 'Percentage must be between 1 and 100'
                  },
                  400
                )
              }
              closeQty = Math.floor(position.qty * (percentValue / 100))
            } else {
              // This should never happen due to the check above
              closeQty = position.qty
            }
            
            // Create an order to close the position
            const orderPayload = {
              symbol,
              qty: closeQty,
              side,
              type: 'market',
              time_in_force: 'day'
            }
            
            const response = await alpacaClient.createOrder(accountId, orderPayload)
            
            if (!response.success) {
              console.error(`Failed to close position for ${symbol}:`, response.error)
              return createErrorResponse(
                {
                  code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: response.error?.message || `Failed to close position for ${symbol}`,
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            return createSuccessResponse({
              message: `Position for ${symbol} closed successfully with ${closeQty} shares`,
              order: response.data
            })
          } else {
            // Close the entire position
            const response = await alpacaClient.closePosition(accountId, symbol)
            
            if (!response.success) {
              console.error(`Failed to close position for ${symbol}:`, response.error)
              return createErrorResponse(
                {
                  code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: response.error?.message || `Failed to close position for ${symbol}`,
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            return createSuccessResponse({ message: `Position for ${symbol} closed successfully` })
          }
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
        console.error('Unexpected error in positions endpoint:', error)
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