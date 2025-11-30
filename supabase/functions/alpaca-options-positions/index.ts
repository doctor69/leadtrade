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
const optionsPositionsQuerySchema = z.object({
  symbols: z.string().optional(), // comma-separated symbols
  greeks: z.enum(['true', 'false']).transform(val => val === 'true').default('true'),
});

// Schema for option symbol validation
const optionSymbolSchema = z.object({
  symbol: z.string().min(1, 'Option symbol is required'),
});

/**
 * Validates if a string is a valid OCC option symbol
 * Format: {Symbol}{YY}{MM}{DD}{C/P}{Strike*1000}
 * Example: AAPL230616C00150000 (Apple $150 Call expiring June 16, 2023)
 */
function isValidOptionSymbol(symbol: string): boolean {
  // Basic validation - more comprehensive validation could be added
  const regex = /^[A-Z]+\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[CP]\d{8}$/;
  return regex.test(symbol);
}

/**
 * Edge Function handler for Alpaca options positions
 * 
 * GET: Retrieves options positions with optional filtering
 * DELETE: Closes options positions
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
        console.log(`Processing options positions request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // Handle GET request (list options positions)
        if (req.method === 'GET') {
          // Parse URL and extract query parameters
          const url = new URL(req.url)
          const queryParams = Object.fromEntries(url.searchParams)
          
          // Validate query parameters
          try {
            const validatedQuery = optionsPositionsQuerySchema.parse(queryParams)
            
            // Build query parameters for Alpaca API
            const params: Record<string, string> = {
              // Always filter for options class
              class: 'option',
              greeks: validatedQuery.greeks.toString()
            }
            
            if (validatedQuery.symbols) params.symbols = validatedQuery.symbols
            
            // Make request to Alpaca API
            const response = await alpacaClient.brokerRequest('/v2/positions', { params })
            
            if (!response.success) {
              console.error('Failed to fetch options positions:', response.error)
              return createErrorResponse(
                {
                  code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: response.error?.message || 'Failed to fetch options positions',
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            // Filter for options positions only if the API doesn't do it for us
            let optionsPositions = response.data;
            if (Array.isArray(optionsPositions)) {
              optionsPositions = optionsPositions.filter(position => 
                position.asset_class === 'option' || 
                (position.symbol && isValidOptionSymbol(position.symbol))
              );
            }
            
            return createSuccessResponse(optionsPositions)
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
        
        // Handle DELETE request (close options position)
        if (req.method === 'DELETE') {
          const url = new URL(req.url)
          const symbol = url.searchParams.get('symbol')
          const qty = url.searchParams.get('qty')
          const percentage = url.searchParams.get('percentage')
          
          if (!symbol) {
            return createErrorResponse(
              {
                code: ERROR_CODES.INVALID_REQUEST,
                message: 'Option symbol is required',
                details: 'Please provide an option symbol to close position'
              },
              400
            )
          }
          
          // Validate option symbol
          try {
            optionSymbolSchema.parse({ symbol })
            
            // Additional validation for option symbol format
            if (!isValidOptionSymbol(symbol)) {
              return createErrorResponse(
                {
                  code: ERROR_CODES.INVALID_REQUEST,
                  message: 'Invalid option symbol format',
                  details: 'Option symbol must be in OCC format (e.g., AAPL230616C00150000)'
                },
                400
              )
            }
          } catch (error) {
            const validationError = error as Error;
            if (validationError instanceof z.ZodError) {
              return createErrorResponse(
                {
                  code: ERROR_CODES.INVALID_REQUEST,
                  message: 'Invalid option symbol',
                  details: validationError instanceof z.ZodError ? validationError.errors : 'Symbol validation failed'
                },
                400
              )
            }
            throw validationError
          }
          
          // Determine the endpoint based on parameters
          let endpoint = `/v2/positions/${symbol}`
          
          // If qty or percentage is provided, we need to use the orders endpoint instead
          if (qty || percentage) {
            // Get the current position to determine side
            const positionResponse = await alpacaClient.brokerRequest(`/v2/positions/${symbol}`)
            
            if (!positionResponse.success) {
              console.error(`Failed to fetch option position for ${symbol}:`, positionResponse.error)
              return createErrorResponse(
                {
                  code: positionResponse.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: positionResponse.error?.message || `Failed to fetch option position for ${symbol}`,
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
              time_in_force: 'day',
              class: 'option'
            }
            
            const response = await alpacaClient.brokerRequest('/v2/orders', { 
              method: 'POST',
              body: orderPayload
            })
            
            if (!response.success) {
              console.error(`Failed to close option position for ${symbol}:`, response.error)
              return createErrorResponse(
                {
                  code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: response.error?.message || `Failed to close option position for ${symbol}`,
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            return createSuccessResponse({
              message: `Option position for ${symbol} closed successfully with ${closeQty} contracts`,
              order: response.data
            })
          } else {
            // Close the entire position
            const response = await alpacaClient.brokerRequest(endpoint, { 
              method: 'DELETE'
            })
            
            if (!response.success) {
              console.error(`Failed to close option position for ${symbol}:`, response.error)
              return createErrorResponse(
                {
                  code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: response.error?.message || `Failed to close option position for ${symbol}`,
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            return createSuccessResponse({ message: `Option position for ${symbol} closed successfully` })
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
        console.error('Unexpected error in options positions endpoint:', error)
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