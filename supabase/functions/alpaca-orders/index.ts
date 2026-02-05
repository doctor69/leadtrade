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
  withRateLimit,
  getRateLimitConfig,
  createLogger,
  logApiRequest,
  logApiResponse
} from '../_shared/index.ts'
import type { AuthContext } from '../_shared/auth.ts'

// Schema for options details
const optionDetailsSchema = z.object({
  strike: z.number().positive('Strike price must be positive'),
  expiration: z.string().min(1, 'Expiration date is required'),
  option_type: z.enum(['call', 'put'], { required_error: 'Option type must be call or put' }),
  contract_size: z.number().positive().default(100),
  premium: z.number().positive().optional(),
});

// Schema for creating orders
const createOrderSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  qty: z.number().positive('Quantity must be positive'),
  side: z.enum(['buy', 'sell'], { required_error: 'Side must be buy or sell' }),
  type: z.enum(['market', 'limit', 'stop', 'stop_limit'], { required_error: 'Order type is required' }),
  time_in_force: z.enum(['day', 'gtc', 'ioc', 'fok']).default('day'),
  limit_price: z.number().positive().optional(),
  stop_price: z.number().positive().optional(),
  trail_price: z.number().positive().optional(),
  trail_percent: z.number().positive().optional(),
  extended_hours: z.boolean().default(false),
  client_order_id: z.string().optional(),
  trade_type: z.enum(['stock', 'option']).default('stock'),
  option_details: optionDetailsSchema.optional(),
});

// Schema for query parameters
const ordersQuerySchema = z.object({
  status: z.enum(['open', 'closed', 'all']).default('open'),
  limit: z.coerce.number().min(1).max(500).default(50),
  after: z.string().optional(),
  until: z.string().optional(),
  direction: z.enum(['asc', 'desc']).default('desc'),
  nested: z.coerce.boolean().default(true),
  symbols: z.string().optional(), // comma-separated symbols
});

// Helper function to construct option symbol in OCC format
function constructOptionSymbol(underlyingSymbol: string, optionDetails: {
  strike: number;
  expiration: string;
  option_type: 'call' | 'put';
}): string {
  // Parse expiration date
  const expirationDate = new Date(optionDetails.expiration);
  const year = expirationDate.getFullYear().toString().slice(-2);
  const month = (expirationDate.getMonth() + 1).toString().padStart(2, '0');
  const day = expirationDate.getDate().toString().padStart(2, '0');
  
  // Format strike price (multiply by 1000 and pad to 8 digits)
  const strikeFormatted = Math.round(optionDetails.strike * 1000).toString().padStart(8, '0');
  
  // Option type (C for call, P for put)
  const optionType = optionDetails.option_type.toUpperCase().charAt(0);
  
  return `${underlyingSymbol}${year}${month}${day}${optionType}${strikeFormatted}`;
}

/**
 * Edge Function handler for Alpaca orders
 * 
 * GET: Retrieves orders with filtering options
 * POST: Places a new order
 * DELETE: Cancels an existing order
 * 
 * Requirements: 1.1, 1.2, 5.2
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow GET, POST, and DELETE requests
    if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
      return createErrorResponse(
        {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Method not allowed. Only GET, POST, and DELETE requests are supported.'
        },
        405
      )
    }

    return withAuth(req, async (authContext: AuthContext) => {
      // Apply rate limiting
      const rateLimitConfig = getRateLimitConfig('orders');
      
      return withRateLimit(req, rateLimitConfig, authContext.userId, async () => {
        try {
          // Create logger with context
          const logger = createLogger('alpaca-orders', authContext.userId, {
            tradingMode: authContext.tradingMode,
            alpacaAccountId: authContext.alpacaAccountId
          });
          
          logger.info(`Processing orders request in ${authContext.tradingMode} mode`);
          
          // Create Alpaca client with auth context
          const alpacaClient = new AlpacaClient(authContext, (message, data) => {
            logger.debug(message, data);
          });
          
          // Get account ID from auth context or fetch from database
          let accountId = authContext.alpacaAccountId
          if (!accountId) {
            const accountsResponse = await alpacaClient.getAccounts()
            if (!accountsResponse.success || !accountsResponse.data || accountsResponse.data.length === 0) {
              return createErrorResponse(
                {
                  code: 'NO_ALPACA_ACCOUNT',
                  message: 'No Alpaca account found for this user'
                },
                404
              )
            }
            accountId = accountsResponse.data[0].id
          }
        
        // Handle GET request (list orders)
        if (req.method === 'GET') {
          // Parse URL and extract query parameters
          const url = new URL(req.url)
          const queryParams = Object.fromEntries(url.searchParams)
          
          // Validate query parameters
          try {
            const validatedQuery = ordersQuerySchema.parse(queryParams)
            
            // Build query parameters for Alpaca API
            const params: Record<string, string> = {
              status: validatedQuery.status,
              limit: validatedQuery.limit.toString(),
              direction: validatedQuery.direction,
              nested: validatedQuery.nested.toString()
            }
            
            // For 'all' status, we need to make two separate requests
            // because Alpaca's API doesn't always return both open and closed in one call
            if (validatedQuery.status === 'all') {
              logger.info('Fetching all orders (open + closed)');
              
              // Fetch both open and closed orders separately
              const [openResponse, closedResponse] = await Promise.all([
                alpacaClient.getOrders(accountId, {
                  status: 'open',
                  limit: Math.floor(validatedQuery.limit / 2),
                  direction: validatedQuery.direction,
                  nested: validatedQuery.nested,
                  symbols: validatedQuery.symbols
                }),
                alpacaClient.getOrders(accountId, {
                  status: 'closed',
                  limit: Math.floor(validatedQuery.limit / 2),
                  direction: validatedQuery.direction,
                  nested: validatedQuery.nested,
                  symbols: validatedQuery.symbols
                })
              ])
              
              logger.info('Open orders response', { success: openResponse.success, count: openResponse.data?.length || 0 });
              logger.info('Closed orders response', { success: closedResponse.success, count: closedResponse.data?.length || 0 });
              
              if (!openResponse.success && !closedResponse.success) {
                return createErrorResponse(
                  {
                    code: 'ALPACA_API_ERROR',
                    message: 'Failed to fetch orders'
                  },
                  400
                )
              }
              
              // Combine results
              const allOrders = [
                ...(openResponse.success ? openResponse.data || [] : []),
                ...(closedResponse.success ? closedResponse.data || [] : [])
              ]
              
              logger.info('Combined orders', { total: allOrders.length });
              
              // Sort by created_at descending
              allOrders.sort((a, b) => {
                const dateA = new Date(a.created_at || 0).getTime()
                const dateB = new Date(b.created_at || 0).getTime()
                return validatedQuery.direction === 'desc' ? dateB - dateA : dateA - dateB
              })
              
              return createSuccessResponse(allOrders.slice(0, validatedQuery.limit))
            }
            
            if (validatedQuery.after) params.after = validatedQuery.after
            if (validatedQuery.until) params.until = validatedQuery.until
            if (validatedQuery.symbols) params.symbols = validatedQuery.symbols
            
            // Make request to Alpaca Broker API
            const response = await alpacaClient.getOrders(accountId, {
              status: validatedQuery.status,
              limit: validatedQuery.limit,
              after: validatedQuery.after,
              until: validatedQuery.until,
              direction: validatedQuery.direction,
              nested: validatedQuery.nested,
              symbols: validatedQuery.symbols
            })
            
            if (!response.success) {
              console.error('Failed to fetch orders:', response.error)
              return createErrorResponse(
                {
                  code: response.error?.code || 'ALPACA_API_ERROR',
                  message: response.error?.message || 'Failed to fetch orders',
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
                  code: 'INVALID_REQUEST',
                  message: 'Invalid query parameters',
                  details: validationError.errors
                },
                400
              )
            }
            throw validationError
          }
        }
        
        // Handle POST request (create order)
        if (req.method === 'POST') {
          try {
            const body = await req.json()
            const validatedOrder = createOrderSchema.parse(body)
            
            // Validate limit price for limit orders
            if (validatedOrder.type === 'limit' && !validatedOrder.limit_price) {
              return createErrorResponse(
                {
                  code: 'VALIDATION_ERROR',
                  message: 'Limit price required for limit orders',
                  details: 'Please provide a limit price for your limit order.'
                },
                400
              )
            }
            
            // Validate stop price for stop orders
            if ((validatedOrder.type === 'stop' || validatedOrder.type === 'stop_limit') && !validatedOrder.stop_price) {
              return createErrorResponse(
                {
                  code: 'VALIDATION_ERROR',
                  message: 'Stop price required for stop orders',
                  details: 'Please provide a stop price for your stop order.'
                },
                400
              )
            }
            
            // Validate options trading requirements
            if (validatedOrder.trade_type === 'option') {
              if (!validatedOrder.option_details) {
                return createErrorResponse(
                  {
                    code: 'VALIDATION_ERROR',
                    message: 'Option details required for options trading',
                    details: 'Please provide complete option details including strike price, expiration, and option type.'
                  },
                  400
                )
              }
              
              logger.info('Processing options order')
              
              // Construct option symbol in OCC format for Alpaca
              const optionSymbol = constructOptionSymbol(validatedOrder.symbol, validatedOrder.option_details)
              logger.info(`Constructed option symbol: ${optionSymbol}`)
              validatedOrder.symbol = optionSymbol
            }
            
            // Prepare order payload for Alpaca API
            let orderPayload: any = {
              symbol: validatedOrder.symbol,
              qty: validatedOrder.qty,
              side: validatedOrder.side,
              type: validatedOrder.type,
              time_in_force: validatedOrder.time_in_force,
              extended_hours: validatedOrder.extended_hours
            }
            
            // Add optional fields
            if (validatedOrder.limit_price) orderPayload.limit_price = validatedOrder.limit_price
            if (validatedOrder.stop_price) orderPayload.stop_price = validatedOrder.stop_price
            if (validatedOrder.trail_price) orderPayload.trail_price = validatedOrder.trail_price
            if (validatedOrder.trail_percent) orderPayload.trail_percent = validatedOrder.trail_percent
            if (validatedOrder.client_order_id) orderPayload.client_order_id = validatedOrder.client_order_id
            
            // Add options-specific fields
            if (validatedOrder.trade_type === 'option') {
              // For options, the symbol is already in OCC format
              // Set order_class to simple for options
              orderPayload.order_class = 'simple'
            }
            
            logger.info('Creating order', { orderPayload, tradeType: validatedOrder.trade_type });
            
            // Make request to Alpaca Broker API
            const response = await alpacaClient.createOrder(accountId, orderPayload)
            
            if (!response.success) {
              console.error('Failed to create order:', response.error)
              return createErrorResponse(
                {
                  code: response.error?.code || 'ALPACA_API_ERROR',
                  message: response.error?.message || 'Failed to create order',
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            // Trigger leaderboard stats update in the background (don't wait for it)
            // Only if user has share_trades enabled
            try {
              const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.52.0');
              const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
              );
              
              const { data: profile } = await supabase
                .from('profiles')
                .select('share_trades')
                .eq('id', authContext.userId)
                .single();
              
              if (profile?.share_trades) {
                // Call update-leaderboard-stats in the background
                fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/update-leaderboard-stats`, {
                  method: 'POST',
                  headers: {
                    'Authorization': req.headers.get('Authorization') || '',
                    'Content-Type': 'application/json'
                  }
                }).catch(err => {
                  logger.error('Failed to update leaderboard stats', err);
                });
              }
            } catch (err) {
              // Silently fail - don't block order response
              logger.error('Error checking share_trades status', err instanceof Error ? err : undefined);
            }
            
            // Trigger copy trades for followers if this user is a leader
            try {
              const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.52.0');
              const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
              );
              
              // Check if this user has active followers
              const { data: followers, error: followersError } = await supabase
                .from('copy_trading_subscriptions')
                .select('follower_id')
                .eq('leader_id', authContext.userId)
                .eq('is_active', true);
              
              const hasFollowers = !followersError && followers && followers.length > 0;
              
              if (hasFollowers) {
                console.log(`User ${authContext.userId} has ${followers.length} followers, triggering copy trades`);
                
                // Get leader's account data to calculate portfolio value
                const accountResponse = await alpacaClient.brokerRequest(
                  `/v1/trading/accounts/${accountId}/account`
                );
                
                if (accountResponse.success && accountResponse.data) {
                  const leaderPortfolioValue = parseFloat(
                    accountResponse.data.equity || 
                    accountResponse.data.portfolio_value || 
                    '0'
                  );
                  
                  if (leaderPortfolioValue > 0) {
                    // Trigger copy trades in background (non-blocking)
                    // This will also send email to the leader
                    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/execute-copy-trades`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': req.headers.get('Authorization') || '',
                        'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
                      },
                      body: JSON.stringify({
                        leaderId: authContext.userId,
                        orderData: orderPayload,
                        leaderPortfolioValue
                      })
                    }).catch(error => {
                      console.error('Failed to trigger copy trades:', error);
                    });
                  } else {
                    console.log('Leader portfolio value is 0, skipping copy trades');
                  }
                } else {
                  console.error('Failed to get leader account data:', accountResponse.error);
                }
              } else {
                // No followers - send email directly to the trader
                console.log(`User ${authContext.userId} has no followers, sending trade confirmation email`);
                
                // Get user profile for email
                const { data: userProfile } = await supabase
                  .from('profiles')
                  .select('email, full_name')
                  .eq('id', authContext.userId)
                  .single();
                
                if (userProfile?.email) {
                  // Queue email notification
                  const { queueEmail } = await import('../_shared/email-queue-helper.ts');
                  const { RESEND_TEMPLATES } = await import('../_shared/email-helper.ts');
                  
                  const sideColor = validatedOrder.side === 'buy' ? '#10b981' : '#ef4444';
                  
                  await queueEmail({
                    category: 'trading',
                    to: userProfile.email,
                    templateId: RESEND_TEMPLATES.LEADER_TRADE,
                    templateData: {
                      userName: userProfile.full_name || 'Trader',
                      symbol: validatedOrder.symbol,
                      side: validatedOrder.side.toUpperCase(),
                      quantity: validatedOrder.qty,
                      followerCount: 0,
                      sideColor: sideColor,
                    }
                  }).catch(error => {
                    console.error('Failed to queue trade email:', error);
                  });
                }
              }
            } catch (error) {
              console.error('Error checking for copy trade followers:', error);
            }
            
            return createSuccessResponse(response.data, 201)
          } catch (error) {
            const validationError = error as Error;
            if (validationError instanceof z.ZodError) {
              return createErrorResponse(
                {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid order parameters',
                  details: validationError.errors
                },
                400
              )
            }
            throw validationError
          }
        }
        
        // Handle DELETE request (cancel order)
        if (req.method === 'DELETE') {
          const url = new URL(req.url)
          const orderId = url.searchParams.get('orderId')
          
          if (!orderId) {
            return createErrorResponse(
              {
                code: 'INVALID_REQUEST',
                message: 'Order ID is required',
                details: 'Please provide an order ID to cancel'
              },
              400
            )
          }
          
          // Make request to Alpaca Broker API
          const response = await alpacaClient.cancelOrder(accountId, orderId)
          
          if (!response.success) {
            console.error(`Failed to cancel order ${orderId}:`, response.error)
            return createErrorResponse(
              {
                code: response.error?.code || 'ALPACA_API_ERROR',
                message: response.error?.message || 'Failed to cancel order',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          return createSuccessResponse({ message: `Order ${orderId} cancelled successfully` })
        }
        
          // This should never happen due to the method check above
          return createErrorResponse(
            {
              code: 'METHOD_NOT_ALLOWED',
              message: 'Method not allowed'
            },
            405
          )
        } catch (error) {
          logger.error('Unexpected error in orders endpoint', error instanceof Error ? error : undefined);
          return createErrorResponse(
            {
              code: 'INTERNAL_ERROR',
              message: error instanceof Error ? error.message : 'An unexpected error occurred'
            },
            500
          )
        }
      });
    })
  })
})