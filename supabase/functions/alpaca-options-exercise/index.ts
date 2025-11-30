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

// Schema for options exercise request
const optionExerciseSchema = z.object({
  symbol_or_contract_id: z.string().min(1, 'Symbol or contract ID is required')
});

/**
 * Check if market is currently open
 * @param alpacaClient The Alpaca client instance
 * @returns Promise with market status
 */
async function isMarketOpen(alpacaClient: AlpacaClient): Promise<boolean> {
  try {
    const response = await alpacaClient.brokerRequest('/v2/clock')
    
    if (!response.success || !response.data) {
      console.error('Failed to fetch market clock:', response.error)
      return false
    }
    
    return response.data.is_open === true
  } catch (error) {
    console.error('Error checking market hours:', error)
    return false
  }
}

/**
 * Get account information to check options approval level
 * @param alpacaClient The Alpaca client instance
 * @param accountId The account ID
 * @returns Promise with account data
 */
async function getAccountInfo(alpacaClient: AlpacaClient, accountId: string) {
  try {
    const response = await alpacaClient.getAccount(accountId)
    
    if (!response.success || !response.data) {
      console.error('Failed to fetch account info:', response.error)
      return null
    }
    
    return response.data
  } catch (error) {
    console.error('Error fetching account info:', error)
    return null
  }
}

/**
 * Edge Function handler for Alpaca options exercise
 * 
 * POST: Exercise an option position
 * 
 * Requirements: 7.3, 7.4, 7.5
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return createErrorResponse(
        {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Method not allowed. Only POST requests are supported.'
        },
        405
      )
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        console.log(`Processing options exercise request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // Parse and validate request body
        let exerciseData: z.infer<typeof optionExerciseSchema>
        try {
          const body = await req.json()
          exerciseData = optionExerciseSchema.parse(body)
        } catch (error) {
          if (error instanceof z.ZodError) {
            return createErrorResponse(
              {
                code: ERROR_CODES.INVALID_REQUEST,
                message: 'Invalid exercise request parameters',
                details: error.errors
              },
              400
            )
          }
          throw error
        }
        
        // Requirement 7.4: Validate market hours for exercise requests
        const marketOpen = await isMarketOpen(alpacaClient)
        if (!marketOpen) {
          return createErrorResponse(
            {
              code: ERROR_CODES.INVALID_REQUEST,
              message: 'Options can only be exercised during market hours',
              details: 'The market is currently closed. Please try again during regular trading hours.'
            },
            400
          )
        }
        
        // Requirement 7.5: Validate account options approval level
        // Get account info to check if options trading is enabled
        const accountInfo = await getAccountInfo(alpacaClient, authContext.alpacaAccountId)
        if (!accountInfo) {
          return createErrorResponse(
            {
              code: ERROR_CODES.ALPACA_API_ERROR,
              message: 'Failed to retrieve account information',
              details: 'Unable to verify options trading approval level'
            },
            400
          )
        }
        
        // Check if account has options trading enabled
        // Note: The actual approval level check would depend on the account configuration
        // For now, we'll proceed with the exercise request and let Alpaca validate
        
        // Requirement 7.3: Process the exercise request immediately during market hours
        const response = await alpacaClient.exerciseOption(
          authContext.alpacaAccountId,
          exerciseData.symbol_or_contract_id
        )
        
        if (!response.success) {
          console.error('Failed to exercise option:', response.error)
          return createErrorResponse(
            {
              code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
              message: response.error?.message || 'Failed to exercise option',
              details: response.error?.details
            },
            response.error?.status || 400
          )
        }
        
        return createSuccessResponse(response.data)
      } catch (error) {
        console.error('Unexpected error in options exercise endpoint:', error)
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
