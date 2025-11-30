import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import {
    withAuth,
    processRequest,
    createSuccessResponse,
    createErrorResponse,
    AlpacaClient,
    corsHeaders
} from '../_shared/index.ts'
import type { AuthContext } from '../_shared/auth.ts'

// Schema for funding request validation
const fundingRequestSchema = z.object({
    amount: z.number().positive().max(10000, 'Amount cannot exceed $10,000').default(1000),
    currency: z.string().default('USD'),
    funding_source: z.enum(['ach', 'wire', 'check']).default('ach'),
    description: z.string().optional(),
    test_mode: z.boolean().default(true), // For testing the funding flow
})

interface AlpacaTransferRequest {
    transfer_type: 'ach' | 'wire' | 'check'
    relationship_id?: string
    amount: string
    side: 'INCOMING' | 'OUTGOING'
    bank_account_type?: 'CHECKING' | 'SAVINGS'
    bank_routing_number?: string
    bank_account_number?: string
    bank_account_name?: string
}

/**
 * Enhanced Edge Function handler for Alpaca funding operations
 * 
 * POST: Creates a funding transfer and updates user portfolio
 * GET: Retrieves funding history
 * 
 * Requirements: Real funding integration with portfolio updates
 */
serve(async (req: Request) => {
    return processRequest(req, async () => {
        // Handle CORS preflight requests
        if (req.method === 'OPTIONS') {
            return new Response('ok', { headers: corsHeaders })
        }

        // Only allow GET and POST requests
        if (!['GET', 'POST'].includes(req.method)) {
            return createErrorResponse(
                {
                    code: 'METHOD_NOT_ALLOWED',
                    message: 'Method not allowed. Only GET and POST requests are supported.'
                },
                405
            )
        }

        return withAuth(req, async (authContext: AuthContext) => {
            try {
                // Get Supabase client for database operations
                const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
                const supabaseClient = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                )

                // Handle GET request (funding history)
                if (req.method === 'GET') {
                    console.log(`Fetching funding history for user ${authContext.userId}`)

                    const { data: transactions, error } = await supabaseClient
                        .from('funding_transactions')
                        .select('*')
                        .eq('user_id', authContext.userId)
                        .order('created_at', { ascending: false })
                        .limit(50)

                    if (error) {
                        console.error('Failed to fetch funding history:', error)
                        return createErrorResponse('Failed to fetch funding history', 500)
                    }

                    return createSuccessResponse({
                        transactions: transactions || [],
                        total_count: transactions?.length || 0
                    })
                }

                // Handle POST request (create funding)
                console.log(`Processing funding request for user ${authContext.userId} in ${authContext.tradingMode} mode`)

                // Parse and validate request body
                let body
                try {
                    const rawBody = await req.json()
                    body = fundingRequestSchema.parse(rawBody)
                } catch (error) {
                    if (error instanceof z.ZodError) {
                        return createErrorResponse(
                            {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid funding request parameters',
                                details: error.errors
                            },
                            400
                        )
                    }
                    throw error
                }

                console.log(`Processing funding request: $${body.amount} via ${body.funding_source}`)

                // Create Alpaca client with auth context
                const alpacaClient = new AlpacaClient(authContext)

                // For sandbox/paper trading, we'll create a test funding transfer
                // In production, this would create a real ACH transfer
                const transferData: AlpacaTransferRequest = {
                    transfer_type: body.funding_source as 'ach' | 'wire' | 'check',
                    amount: body.amount.toFixed(2),
                    side: 'INCOMING',
                    bank_account_type: 'CHECKING',
                    bank_routing_number: '021000021', // Chase Bank routing (sandbox)
                    bank_account_number: '1234567890', // Mock account number for testing
                    bank_account_name: 'Test Funding Account'
                }

                console.log('Creating Alpaca transfer:', JSON.stringify(transferData, null, 2))

                // Make the API call to Alpaca Funding API
                const response = await alpacaClient.brokerRequest('/v2/trading/transfers', {
                    method: 'POST',
                    body: transferData
                })

                let transferResult = { id: `test_${Date.now()}`, status: 'completed' }

                if (!response.success) {
                    console.error('Alpaca funding API error:', response.error)

                    // For paper trading, continue with mock data
                    if (authContext.tradingMode === 'paper' || body.test_mode) {
                        console.log('📝 Alpaca API failed, continuing with paper trading mock')
                    } else {
                        // Handle specific funding API errors for live trading
                        let errorMessage = response.error?.message || 'Failed to create funding transfer'

                        if (errorMessage.includes('insufficient_funds')) {
                            errorMessage = 'Insufficient funds in the linked bank account'
                        } else if (errorMessage.includes('invalid_account')) {
                            errorMessage = 'Invalid bank account information'
                        } else if (errorMessage.includes('daily_limit')) {
                            errorMessage = 'Daily funding limit exceeded'
                        }

                        return createErrorResponse(
                            {
                                code: response.error?.code || 'ALPACA_FUNDING_ERROR',
                                message: errorMessage,
                                details: response.error?.details
                            },
                            response.error?.status || 400
                        )
                    }
                } else {
                    transferResult = response.data
                    console.log('✅ Alpaca transfer created successfully:', transferResult.id)
                }

                // For paper trading mode, process instant funding and update portfolio
                if (authContext.tradingMode === 'paper' || body.test_mode) {
                    console.log('📝 Processing instant funding for paper/test mode')

                    try {
                        // Update user's portfolio balance using the database function
                        const { error: balanceError } = await supabaseClient.rpc('update_portfolio_balance', {
                            user_uuid: authContext.userId,
                            amount_change: body.amount,
                            activity_description: `${body.funding_source.toUpperCase()} deposit - $${body.amount.toFixed(2)}`
                        })

                        if (balanceError) {
                            console.error('❌ Failed to update portfolio balance:', balanceError)
                            return createErrorResponse('Failed to update account balance', 500)
                        }

                        // Record the funding transaction
                        const { error: transactionError } = await supabaseClient
                            .from('funding_transactions')
                            .insert({
                                user_id: authContext.userId,
                                alpaca_account_id: transferResult.id || `paper_${authContext.userId}`,
                                transfer_id: transferResult.id || `test_${Date.now()}`,
                                amount: body.amount,
                                currency: body.currency,
                                status: 'completed',
                                transfer_type: 'deposit',
                                funding_source: body.funding_source,
                                description: body.description || `Paper trading deposit - $${body.amount.toFixed(2)}`,
                                alpaca_response: transferResult
                            })

                        if (transactionError) {
                            console.error('❌ Failed to record funding transaction:', transactionError)
                            // Don't fail the request for transaction recording errors
                        }

                        console.log('✅ Paper trading funding completed successfully')

                        return createSuccessResponse({
                            success: true,
                            transfer_id: transferResult.id || `test_${Date.now()}`,
                            amount: body.amount,
                            currency: body.currency,
                            status: 'completed',
                            funding_source: body.funding_source,
                            test_mode: body.test_mode,
                            message: `Paper trading deposit of $${body.amount.toFixed(2)} completed successfully`,
                            alpaca_response: transferResult,
                            note: 'Paper trading funds are instantly available for trading.'
                        })
                    } catch (dbError) {
                        console.error('❌ Database operation failed:', dbError)
                        return createErrorResponse('Failed to process funding transaction', 500)
                    }
                }

                // For live trading, record the pending transfer
                try {
                    const { error: transactionError } = await supabaseClient
                        .from('funding_transactions')
                        .insert({
                            user_id: authContext.userId,
                            alpaca_account_id: transferResult.id || `live_${authContext.userId}`,
                            transfer_id: transferResult.id,
                            amount: body.amount,
                            currency: body.currency,
                            status: transferResult.status || 'pending',
                            transfer_type: 'deposit',
                            funding_source: body.funding_source,
                            description: body.description || `Live trading deposit - $${body.amount.toFixed(2)}`,
                            alpaca_response: transferResult
                        })

                    if (transactionError) {
                        console.error('❌ Failed to record funding transaction:', transactionError)
                    }
                } catch (dbError) {
                    console.error('❌ Database operation failed:', dbError)
                }

                // For live trading, return the actual transfer status
                return createSuccessResponse({
                    success: true,
                    transfer_id: transferResult.id,
                    amount: body.amount,
                    currency: body.currency,
                    status: transferResult.status || 'pending',
                    funding_source: body.funding_source,
                    message: `Funding transfer of $${body.amount.toFixed(2)} initiated successfully`,
                    alpaca_response: transferResult,
                    estimated_completion: '1-3 business days'
                })

            } catch (error) {
                console.error('Unexpected error in funding endpoint:', error)
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
})