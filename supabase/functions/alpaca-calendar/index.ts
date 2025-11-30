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
const calendarQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

/**
 * Edge Function handler for Alpaca market calendar
 * 
 * GET: Retrieves market calendar information
 * 
 * Requirements: Market hours, trading schedule
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
        console.log(`Processing calendar request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // Parse URL and extract query parameters
        const url = new URL(req.url)
        const queryParams = Object.fromEntries(url.searchParams)
        
        // Validate query parameters
        try {
          const validatedQuery = calendarQuerySchema.parse(queryParams)
          
          // Build query parameters for Alpaca API
          const params: Record<string, string> = {}
          
          if (validatedQuery.start) params.start = validatedQuery.start
          if (validatedQuery.end) params.end = validatedQuery.end
          
          // Make request to Alpaca API
          const response = await alpacaClient.brokerRequest('/v2/calendar', { params })
          
          if (!response.success) {
            console.error('Failed to fetch market calendar:', response.error)
            return createErrorResponse(
              {
                code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                message: response.error?.message || 'Failed to fetch market calendar',
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
        console.error('Unexpected error in calendar endpoint:', error)
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