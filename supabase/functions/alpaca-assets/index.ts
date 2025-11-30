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
const assetsQuerySchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  asset_class: z.enum(['us_equity', 'crypto']).optional(),
  exchange: z.string().optional(),
  attributes: z.string().optional(), // comma-separated attributes
});

/**
 * Edge Function handler for Alpaca assets
 * 
 * GET: Retrieves assets with filtering options or specific asset
 * 
 * Requirements: Asset discovery, trading instruments
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
        console.log(`Processing assets request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // Parse URL and extract query parameters
        const url = new URL(req.url)
        const symbol = url.searchParams.get('symbol')
        const queryParams = Object.fromEntries(url.searchParams)
        
        // If symbol is provided, get specific asset
        if (symbol) {
          const response = await alpacaClient.brokerRequest(`/v2/assets/${symbol}`)
          
          if (!response.success) {
            console.error(`Failed to fetch asset ${symbol}:`, response.error)
            return createErrorResponse(
              {
                code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                message: response.error?.message || `Failed to fetch asset ${symbol}`,
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse(response.data)
        }
        
        // Validate query parameters for asset listing
        try {
          const validatedQuery = assetsQuerySchema.parse(queryParams)
          
          // Build query parameters for Alpaca API
          const params: Record<string, string> = {}
          
          if (validatedQuery.status) params.status = validatedQuery.status
          if (validatedQuery.asset_class) params.asset_class = validatedQuery.asset_class
          if (validatedQuery.exchange) params.exchange = validatedQuery.exchange
          if (validatedQuery.attributes) params.attributes = validatedQuery.attributes
          
          // Make request to Alpaca API
          const response = await alpacaClient.brokerRequest('/v2/assets', { params })
          
          if (!response.success) {
            console.error('Failed to fetch assets:', response.error)
            return createErrorResponse(
              {
                code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                message: response.error?.message || 'Failed to fetch assets',
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
        console.error('Unexpected error in assets endpoint:', error)
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