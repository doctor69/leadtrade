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

// Schema for query parameters when listing contracts
const optionsContractsQuerySchema = z.object({
  underlying_symbols: z.string().optional(), // comma-separated symbols
  status: z.enum(['active', 'inactive']).optional(),
  expiration_date: z.string().optional(), // YYYY-MM-DD
  expiration_date_gte: z.string().optional(), // Greater than or equal
  expiration_date_lte: z.string().optional(), // Less than or equal
  root_symbol: z.string().optional(),
  type: z.enum(['call', 'put']).optional(),
  style: z.enum(['american', 'european']).optional(),
  strike_price_gte: z.string().optional(), // Greater than or equal
  strike_price_lte: z.string().optional(), // Less than or equal
  limit: z.coerce.number().min(1).max(10000).default(100),
  page_token: z.string().optional(),
});

/**
 * Edge Function handler for Alpaca options contracts
 * 
 * GET /v1/options/contracts - List option contracts with filtering
 * GET /v1/options/contracts/{id} - Get specific contract details
 * 
 * Requirements: 7.1, 7.2
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
      return createErrorResponse(
        {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Method not allowed. Only GET requests are supported.'
        },
        405
      )
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        console.log(`Processing options contracts request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // Parse URL to determine if this is a specific contract request
        const url = new URL(req.url)
        const pathParts = url.pathname.split('/').filter(Boolean)
        
        // Check if requesting specific contract by ID
        // Path format: /alpaca-options-contracts/{contract_id}
        const contractId = pathParts[pathParts.length - 1]
        const isSpecificContract = contractId && contractId !== 'alpaca-options-contracts'
        
        if (isSpecificContract) {
          // Get specific contract details using Broker API
          console.log(`Fetching contract details for: ${contractId}`)
          
          // Broker API endpoint for options contracts
          const response = await alpacaClient.brokerRequest(`/v1/options/contracts/${contractId}`)
          
          if (!response.success) {
            console.error(`Failed to fetch contract ${contractId}:`, response.error)
            return createErrorResponse(
              {
                code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                message: response.error?.message || `Failed to fetch contract ${contractId}`,
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse(response.data)
        }
        
        // List contracts with filtering
        const queryParams = Object.fromEntries(url.searchParams)
        
        // Validate query parameters
        try {
          const validatedQuery = optionsContractsQuerySchema.parse(queryParams)
          
          // Build query parameters for Alpaca API
          const params: Record<string, string> = {
            limit: validatedQuery.limit.toString()
          }
          
          if (validatedQuery.underlying_symbols) params.underlying_symbols = validatedQuery.underlying_symbols
          if (validatedQuery.status) params.status = validatedQuery.status
          if (validatedQuery.expiration_date) params.expiration_date = validatedQuery.expiration_date
          if (validatedQuery.expiration_date_gte) params.expiration_date_gte = validatedQuery.expiration_date_gte
          if (validatedQuery.expiration_date_lte) params.expiration_date_lte = validatedQuery.expiration_date_lte
          if (validatedQuery.root_symbol) params.root_symbol = validatedQuery.root_symbol
          if (validatedQuery.type) params.type = validatedQuery.type
          if (validatedQuery.style) params.style = validatedQuery.style
          if (validatedQuery.strike_price_gte) params.strike_price_gte = validatedQuery.strike_price_gte
          if (validatedQuery.strike_price_lte) params.strike_price_lte = validatedQuery.strike_price_lte
          if (validatedQuery.page_token) params.page_token = validatedQuery.page_token
          
          console.log('Fetching options contracts with params:', params)
          
          // Make request to Alpaca Broker API for options contracts
          const response = await alpacaClient.brokerRequest('/v1/options/contracts', { params })
          
          if (!response.success) {
            console.error('Failed to fetch options contracts:', response.error)
            return createErrorResponse(
              {
                code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                message: response.error?.message || 'Failed to fetch options contracts',
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
      } catch (error) {
        console.error('Unexpected error in options contracts endpoint:', error)
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
