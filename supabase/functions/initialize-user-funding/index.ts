import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { 
  processRequest, 
  createSuccessResponse, 
  createErrorResponse,
  corsHeaders
} from '../_shared/index.ts'

// Schema for initialization request
const initRequestSchema = z.object({
  user_id: z.string().uuid('Valid user ID is required'),
  initial_amount: z.number().positive().default(1000),
  funding_source: z.enum(['ach', 'wire', 'check']).default('ach'),
  description: z.string().optional(),
})

/**
 * Edge Function to initialize user funding after signup
 * 
 * POST: Initializes new user with $1000 paper trading funds
 * 
 * Requirements: Automatic funding for new users
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
          code: 'METHOD_NOT_ALLOWED',
          message: 'Method not allowed. Only POST requests are supported.'
        },
        405
      )
    }

    try {
      console.log('Processing user funding initialization...')
      
      // Parse and validate request body
      let body
      try {
        const rawBody = await req.json()
        body = initRequestSchema.parse(rawBody)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return createErrorResponse(
            {
              code: 'VALIDATION_ERROR',
              message: 'Invalid initialization parameters',
              details: error.errors
            },
            400
          )
        }
        throw error
      }

      console.log(`Initializing funding for user ${body.user_id} with $${body.initial_amount}`)

      // Get Supabase client for database operations
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Check if user already has funding
      const { data: existingPortfolio, error: portfolioError } = await supabaseClient
        .from('user_portfolios')
        .select('total_value, cash_balance')
        .eq('user_id', body.user_id)
        .single()

      if (portfolioError) {
        console.error('Failed to check existing portfolio:', portfolioError)
        return createErrorResponse('Failed to check user portfolio', 500)
      }

      // If user already has funds, don't add more
      if (existingPortfolio && parseFloat(existingPortfolio.total_value) > 0) {
        console.log(`User ${body.user_id} already has funding: $${existingPortfolio.total_value}`)
        return createSuccessResponse({
          success: true,
          message: 'User already has funding',
          current_balance: parseFloat(existingPortfolio.total_value),
          skipped: true
        })
      }

      try {
        // Update user's portfolio balance using the database function
        const { error: balanceError } = await supabaseClient.rpc('update_portfolio_balance', {
          user_uuid: body.user_id,
          amount_change: body.initial_amount,
          activity_description: body.description || `Welcome to LEADTRADE! Initial paper trading funding - $${body.initial_amount.toFixed(2)}`
        })
        
        if (balanceError) {
          console.error('❌ Failed to update portfolio balance:', balanceError)
          return createErrorResponse('Failed to update account balance', 500)
        }
        
        // Record the funding transaction
        const { error: transactionError } = await supabaseClient
          .from('funding_transactions')
          .insert({
            user_id: body.user_id,
            alpaca_account_id: `paper_${body.user_id}`,
            transfer_id: `init_${Date.now()}`,
            amount: body.initial_amount,
            currency: 'USD',
            status: 'completed',
            transfer_type: 'deposit',
            funding_source: body.funding_source,
            description: body.description || `Initial paper trading funding - $${body.initial_amount.toFixed(2)}`,
            alpaca_response: {
              type: 'initial_funding',
              user_id: body.user_id,
              amount: body.initial_amount,
              timestamp: new Date().toISOString()
            }
          })
        
        if (transactionError) {
          console.error('❌ Failed to record funding transaction:', transactionError)
          // Don't fail the request for transaction recording errors
        }
        
        console.log(`✅ Initial funding of $${body.initial_amount} completed for user ${body.user_id}`)
        
        return createSuccessResponse({
          success: true,
          user_id: body.user_id,
          amount: body.initial_amount,
          currency: 'USD',
          status: 'completed',
          funding_source: body.funding_source,
          message: `Initial paper trading funding of $${body.initial_amount.toFixed(2)} completed successfully`,
          note: 'Welcome to LEADTRADE! Your paper trading funds are ready to use.'
        })
        
      } catch (dbError) {
        console.error('❌ Database operation failed:', dbError)
        return createErrorResponse('Failed to process funding initialization', 500)
      }

    } catch (error) {
      console.error('Unexpected error in funding initialization:', error)
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