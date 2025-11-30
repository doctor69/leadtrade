/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
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

/**
 * Edge Function handler for Alpaca market clock
 * 
 * GET: Retrieves current market status and time
 * 
 * Requirements: Market status, trading hours
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
        console.log(`Processing clock request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // Make request to Alpaca API
        const response = await alpacaClient.brokerRequest('/v2/clock')
        
        if (!response.success) {
          console.error('Failed to fetch market clock:', response.error)
          return createErrorResponse(
            {
              code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
              message: response.error?.message || 'Failed to fetch market clock',
              details: response.error?.details
            },
            response.error?.status || 400
          )
        }
        
        return createSuccessResponse(response.data)
      } catch (error) {
        console.error('Unexpected error in clock endpoint:', error)
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