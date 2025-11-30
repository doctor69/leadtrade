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

// Schema for creating/updating watchlists
const watchlistSchema = z.object({
  name: z.string().min(1, 'Watchlist name is required'),
  symbols: z.array(z.string()).optional(),
});

// Schema for adding/removing symbols
const symbolsSchema = z.object({
  symbols: z.array(z.string()).min(1, 'At least one symbol is required'),
});

/**
 * Validates that symbols exist and are tradable
 * Requirement 9.2: Symbol validation on add
 */
async function validateSymbols(symbols: string[], alpacaClient: AlpacaClient): Promise<{ valid: string[], invalid: string[] }> {
  const valid: string[] = []
  const invalid: string[] = []
  
  for (const symbol of symbols) {
    try {
      // Check if asset exists and is tradable
      const response = await alpacaClient.brokerRequest(`/v2/assets/${symbol}`)
      
      if (response.success && response.data) {
        const asset = response.data as { tradable?: boolean, status?: string }
        if (asset.tradable && asset.status === 'active') {
          valid.push(symbol)
        } else {
          invalid.push(symbol)
        }
      } else {
        invalid.push(symbol)
      }
    } catch (error) {
      console.error(`Error validating symbol ${symbol}:`, error)
      invalid.push(symbol)
    }
  }
  
  return { valid, invalid }
}

/**
 * Edge Function handler for Alpaca watchlists
 * 
 * GET: Retrieves watchlists or specific watchlist
 * POST: Creates a new watchlist or adds symbols to existing watchlist
 * PUT: Updates watchlist name
 * DELETE: Deletes watchlist or removes symbols from watchlist
 * 
 * Requirements: Portfolio management, asset tracking
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow GET, POST, PUT, and DELETE requests
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
      return createErrorResponse(
        {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Method not allowed. Only GET, POST, PUT, and DELETE requests are supported.'
        },
        405
      )
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        console.log(`Processing watchlists request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        const url = new URL(req.url)
        const watchlistId = url.searchParams.get('watchlistId')
        const action = url.searchParams.get('action') // 'add' or 'remove' symbols
        
        // Handle GET request (list watchlists or get specific watchlist)
        // Requirement 9.5: Return complete asset details for each symbol
        if (req.method === 'GET') {
          let endpoint = '/v2/watchlists'
          if (watchlistId) {
            endpoint = `/v2/watchlists/${watchlistId}`
          }
          
          const response = await alpacaClient.brokerRequest(endpoint)
          
          if (!response.success) {
            console.error('Failed to fetch watchlists:', response.error)
            return createErrorResponse(
              {
                code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                message: response.error?.message || 'Failed to fetch watchlists',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          // Alpaca API returns complete asset details including:
          // - id, symbol, name, asset_class, exchange
          // - tradable, marginable, shortable, fractionable
          // - status and other trading attributes
          return createSuccessResponse(response.data)
        }
        
        // Handle POST request (create watchlist or add symbols)
        if (req.method === 'POST') {
          try {
            const body = await req.json()
            
            if (watchlistId && action === 'add') {
              // Add symbols to existing watchlist
              const validatedSymbols = symbolsSchema.parse(body)
              
              // Validate symbols before adding (Requirement 9.2)
              console.log(`Validating ${validatedSymbols.symbols.length} symbols before adding to watchlist`)
              const { valid, invalid } = await validateSymbols(validatedSymbols.symbols, alpacaClient)
              
              if (invalid.length > 0) {
                console.warn(`Invalid symbols detected: ${invalid.join(', ')}`)
                return createErrorResponse(
                  {
                    code: ERROR_CODES.INVALID_REQUEST,
                    message: 'Some symbols are invalid or not tradable',
                    details: {
                      invalid_symbols: invalid,
                      valid_symbols: valid
                    }
                  },
                  400
                )
              }
              
              const response = await alpacaClient.brokerRequest(`/v2/watchlists/${watchlistId}`, {
                method: 'POST',
                body: { symbols: valid }
              })
              
              if (!response.success) {
                console.error('Failed to add symbols to watchlist:', response.error)
                return createErrorResponse(
                  {
                    code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                    message: response.error?.message || 'Failed to add symbols to watchlist',
                    details: response.error?.details
                  },
                  response.error?.status || 400
                )
              }
              
              return createSuccessResponse(response.data)
            } else {
              // Create new watchlist
              const validatedWatchlist = watchlistSchema.parse(body)
              
              // Validate symbols if provided (Requirement 9.2)
              if (validatedWatchlist.symbols && validatedWatchlist.symbols.length > 0) {
                console.log(`Validating ${validatedWatchlist.symbols.length} symbols for new watchlist`)
                const { valid, invalid } = await validateSymbols(validatedWatchlist.symbols, alpacaClient)
                
                if (invalid.length > 0) {
                  console.warn(`Invalid symbols detected: ${invalid.join(', ')}`)
                  return createErrorResponse(
                    {
                      code: ERROR_CODES.INVALID_REQUEST,
                      message: 'Some symbols are invalid or not tradable',
                      details: {
                        invalid_symbols: invalid,
                        valid_symbols: valid
                      }
                    },
                    400
                  )
                }
                
                validatedWatchlist.symbols = valid
              }
              
              const response = await alpacaClient.brokerRequest('/v2/watchlists', {
                method: 'POST',
                body: validatedWatchlist
              })
              
              if (!response.success) {
                console.error('Failed to create watchlist:', response.error)
                return createErrorResponse(
                  {
                    code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                    message: response.error?.message || 'Failed to create watchlist',
                    details: response.error?.details
                  },
                  response.error?.status || 400
                )
              }
              
              return createSuccessResponse(response.data, 201)
            }
          } catch (error) {
            const validationError = error as Error;
            if (validationError instanceof z.ZodError) {
              return createErrorResponse(
                {
                  code: ERROR_CODES.INVALID_REQUEST,
                  message: 'Invalid watchlist data',
                  details: validationError.errors
                },
                400
              )
            }
            throw validationError
          }
        }
        
        // Handle PUT request (update watchlist name or replace symbols atomically)
        // Requirement 9.3: Atomic update operations
        if (req.method === 'PUT') {
          if (!watchlistId) {
            return createErrorResponse(
              {
                code: ERROR_CODES.INVALID_REQUEST,
                message: 'Watchlist ID is required for updates',
                details: 'Please provide a watchlist ID in the query parameters'
              },
              400
            )
          }
          
          try {
            const body = await req.json()
            const validatedWatchlist = watchlistSchema.parse(body)
            
            // If symbols are provided, validate them and replace the entire list atomically
            if (validatedWatchlist.symbols !== undefined) {
              console.log(`Atomically updating watchlist with ${validatedWatchlist.symbols.length} symbols`)
              
              if (validatedWatchlist.symbols.length > 0) {
                // Validate symbols (Requirement 9.2)
                const { valid, invalid } = await validateSymbols(validatedWatchlist.symbols, alpacaClient)
                
                if (invalid.length > 0) {
                  console.warn(`Invalid symbols detected: ${invalid.join(', ')}`)
                  return createErrorResponse(
                    {
                      code: ERROR_CODES.INVALID_REQUEST,
                      message: 'Some symbols are invalid or not tradable',
                      details: {
                        invalid_symbols: invalid,
                        valid_symbols: valid
                      }
                    },
                    400
                  )
                }
                
                validatedWatchlist.symbols = valid
              }
              
              // Alpaca PUT replaces the entire symbol list atomically
              const response = await alpacaClient.brokerRequest(`/v2/watchlists/${watchlistId}`, {
                method: 'PUT',
                body: {
                  name: validatedWatchlist.name,
                  symbols: validatedWatchlist.symbols
                }
              })
              
              if (!response.success) {
                console.error('Failed to update watchlist:', response.error)
                return createErrorResponse(
                  {
                    code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                    message: response.error?.message || 'Failed to update watchlist',
                    details: response.error?.details
                  },
                  response.error?.status || 400
                )
              }
              
              return createSuccessResponse(response.data)
            } else {
              // Only update name
              const response = await alpacaClient.brokerRequest(`/v2/watchlists/${watchlistId}`, {
                method: 'PUT',
                body: { name: validatedWatchlist.name }
              })
              
              if (!response.success) {
                console.error('Failed to update watchlist:', response.error)
                return createErrorResponse(
                  {
                    code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                    message: response.error?.message || 'Failed to update watchlist',
                    details: response.error?.details
                  },
                  response.error?.status || 400
                )
              }
              
              return createSuccessResponse(response.data)
            }
          } catch (error) {
            const validationError = error as Error;
            if (validationError instanceof z.ZodError) {
              return createErrorResponse(
                {
                  code: ERROR_CODES.INVALID_REQUEST,
                  message: 'Invalid watchlist data',
                  details: validationError.errors
                },
                400
              )
            }
            throw validationError
          }
        }
        
        // Handle DELETE request (delete watchlist or remove symbols)
        if (req.method === 'DELETE') {
          if (!watchlistId) {
            return createErrorResponse(
              {
                code: ERROR_CODES.INVALID_REQUEST,
                message: 'Watchlist ID is required for deletion',
                details: 'Please provide a watchlist ID in the query parameters'
              },
              400
            )
          }
          
          if (action === 'remove') {
            // Remove symbols from watchlist
            try {
              const body = await req.json()
              const validatedSymbols = symbolsSchema.parse(body)
              
              // Remove symbols one by one (Alpaca doesn't support bulk removal)
              const results = []
              for (const symbol of validatedSymbols.symbols) {
                const response = await alpacaClient.brokerRequest(`/v2/watchlists/${watchlistId}/${symbol}`, {
                  method: 'DELETE'
                })
                results.push({ symbol, success: response.success, error: response.error })
              }
              
              return createSuccessResponse({
                message: 'Symbol removal completed',
                results
              })
            } catch (error) {
              const validationError = error as Error;
              if (validationError instanceof z.ZodError) {
                return createErrorResponse(
                  {
                    code: ERROR_CODES.INVALID_REQUEST,
                    message: 'Invalid symbols data',
                    details: validationError.errors
                  },
                  400
                )
              }
              throw validationError
            }
          } else {
            // Delete entire watchlist
            const response = await alpacaClient.brokerRequest(`/v2/watchlists/${watchlistId}`, {
              method: 'DELETE'
            })
            
            if (!response.success) {
              console.error('Failed to delete watchlist:', response.error)
              return createErrorResponse(
                {
                  code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: response.error?.message || 'Failed to delete watchlist',
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            return createSuccessResponse({ message: 'Watchlist deleted successfully' })
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
        console.error('Unexpected error in watchlists endpoint:', error)
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