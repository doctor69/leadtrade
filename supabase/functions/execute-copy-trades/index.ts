import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { 
  withAuth, 
  processRequest, 
  createSuccessResponse, 
  createErrorResponse,
  AlpacaClient,
  corsHeaders
} from '../_shared/index.ts'
import type { AuthContext } from '../_shared/auth.ts'

interface CopyTradeRequest {
  leaderId: string
  orderData: {
    symbol: string
    qty: number
    side: 'buy' | 'sell'
    type: string
    time_in_force: string
    limit_price?: number
    [key: string]: any
  }
  leaderPortfolioValue: number
}

serve(async (req) => {
  return processRequest(req, {
    POST: withAuth(async (req: Request, authContext: AuthContext) => {
      try {
        const { leaderId, orderData, leaderPortfolioValue }: CopyTradeRequest = await req.json()
        
        console.log(`Executing copy trades for leader ${leaderId}`)
        
        // Get Supabase client
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        // Get all active followers for this leader
        const { data: subscriptions, error: subsError } = await supabase
          .from('copy_trading_subscriptions')
          .select(`
            *,
            follower:profiles!copy_trading_subscriptions_follower_id_fkey (
              id,
              username,
              alpaca_account_id
            )
          `)
          .eq('leader_id', leaderId)
          .eq('is_active', true)
        
        if (subsError) {
          console.error('Error fetching subscriptions:', subsError)
          return createErrorResponse({ code: 'DB_ERROR', message: 'Failed to fetch subscriptions' }, 500)
        }
        
        if (!subscriptions || subscriptions.length === 0) {
          console.log('No active followers found')
          return createSuccessResponse({ message: 'No followers to copy trade', copiedTrades: 0 })
        }
        
        console.log(`Found ${subscriptions.length} active followers`)
        
        // Calculate the trade size as percentage of leader's portfolio
        // Use limit_price if available, otherwise estimate with market price
        const estimatedPrice = orderData.limit_price || 1 // Will need actual market price for market orders
        const tradeValue = parseFloat(orderData.qty.toString()) * estimatedPrice
        const leaderTradePercentage = (tradeValue / leaderPortfolioValue) * 100
        
        console.log(`Leader trade: ${orderData.qty} shares @ ~$${estimatedPrice}, ~$${tradeValue.toFixed(2)}, ${leaderTradePercentage.toFixed(4)}% of portfolio`)
        
        const copyResults = []
        
        // Execute copy trades for each follower
        for (const subscription of subscriptions) {
          try {
            const followerId = subscription.follower_id
            const followerAllocationPercentage = parseFloat(subscription.allocation_percentage.toString())
            
            console.log(`Processing follower ${followerId} with ${followerAllocationPercentage}% allocation`)
            
            if (!subscription.follower?.alpaca_account_id) {
              console.error(`No Alpaca account for follower ${followerId}`)
              continue
            }
            
            const followerAccountId = subscription.follower.alpaca_account_id
            
            // Create Alpaca client for follower
            const followerAlpacaClient = new AlpacaClient({
              userId: followerId,
              alpacaAccountId: followerAccountId
            })
            
            // Get follower's account info
            const accountResponse = await followerAlpacaClient.brokerRequest(
              `/v1/trading/accounts/${followerAccountId}/account`
            )
            
            if (!accountResponse.success || !accountResponse.data) {
              console.error(`Failed to get account info for follower ${followerId}`)
              continue
            }
            
            const followerPortfolioValue = parseFloat(accountResponse.data.equity || accountResponse.data.portfolio_value || '0')
            
            if (followerPortfolioValue <= 0) {
              console.error(`Invalid portfolio value for follower ${followerId}: ${followerPortfolioValue}`)
              continue
            }
            
            // CORRECT FORMULA: Apply leader's trade percentage to follower's allocated percentage
            // Example: Leader trades 5% of portfolio, follower allocated 20%
            // Follower trades: 5% of 20% = 1% of total portfolio
            const followerTradePercentage = (leaderTradePercentage * followerAllocationPercentage) / 100
            const followerTradeValue = (followerPortfolioValue * followerTradePercentage) / 100
            let followerQty = Math.floor(followerTradeValue / estimatedPrice)
            
            // For SELL orders, check if follower has enough shares
            if (orderData.side === 'sell') {
              try {
                // Get follower's positions
                const positionsResponse = await followerAlpacaClient.brokerRequest(
                  `/v1/trading/accounts/${followerAccountId}/positions`
                )
                
                if (positionsResponse.success && positionsResponse.data) {
                  const positions = Array.isArray(positionsResponse.data) ? positionsResponse.data : []
                  const position = positions.find((p: any) => p.symbol === orderData.symbol)
                  
                  if (!position) {
                    console.log(`Skipping follower ${followerId}: no position in ${orderData.symbol} to sell`)
                    copyResults.push({
                      followerId,
                      success: false,
                      error: `No position in ${orderData.symbol} to sell`
                    })
                    continue
                  }
                  
                  const availableQty = parseFloat(position.qty || position.available_qty || '0')
                  
                  if (availableQty <= 0) {
                    console.log(`Skipping follower ${followerId}: no available shares of ${orderData.symbol} to sell`)
                    copyResults.push({
                      followerId,
                      success: false,
                      error: `No available shares of ${orderData.symbol} to sell`
                    })
                    continue
                  }
                  
                  // Limit sell quantity to available shares
                  if (followerQty > availableQty) {
                    console.log(`Follower ${followerId}: reducing sell qty from ${followerQty} to ${availableQty} (available shares)`)
                    followerQty = Math.floor(availableQty)
                  }
                } else {
                  console.error(`Failed to get positions for follower ${followerId}:`, positionsResponse.error)
                  copyResults.push({
                    followerId,
                    success: false,
                    error: 'Failed to verify position for sell order'
                  })
                  continue
                }
              } catch (error) {
                console.error(`Error checking positions for follower ${followerId}:`, error)
                copyResults.push({
                  followerId,
                  success: false,
                  error: 'Error verifying position for sell order'
                })
                continue
              }
            }
            
            console.log(`Follower ${followerId}: Portfolio $${followerPortfolioValue.toFixed(2)}, ` +
              `Allocation ${followerAllocationPercentage}%, ` +
              `Trade ${followerTradePercentage.toFixed(4)}% = $${followerTradeValue.toFixed(2)}, ` +
              `Qty: ${followerQty}`)
            
            if (followerQty <= 0) {
              console.log(`Skipping follower ${followerId}: calculated quantity is ${followerQty}`)
              continue
            }
            
            // Create the copy trade order
            const copyOrderData: any = {
              symbol: orderData.symbol,
              qty: followerQty,
              side: orderData.side,
              type: orderData.type,
              time_in_force: orderData.time_in_force,
              client_order_id: `copy_${leaderId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }
            
            // Copy optional fields
            if (orderData.limit_price) copyOrderData.limit_price = orderData.limit_price
            if (orderData.stop_price) copyOrderData.stop_price = orderData.stop_price
            if (orderData.trail_price) copyOrderData.trail_price = orderData.trail_price
            if (orderData.trail_percent) copyOrderData.trail_percent = orderData.trail_percent
            
            // Execute the copy trade
            const copyOrderResponse = await followerAlpacaClient.brokerRequest(
              `/v1/trading/accounts/${followerAccountId}/orders`,
              {
                method: 'POST',
                body: copyOrderData
              }
            )
            
            if (copyOrderResponse.success) {
              console.log(`✓ Copy trade successful for follower ${followerId}: ${followerQty} shares`)
              copyResults.push({
                followerId,
                success: true,
                quantity: followerQty,
                tradePercentage: followerTradePercentage,
                orderId: copyOrderResponse.data?.id
              })
            } else {
              console.error(`✗ Copy trade failed for follower ${followerId}:`, copyOrderResponse.error)
              copyResults.push({
                followerId,
                success: false,
                error: copyOrderResponse.error
              })
            }
          } catch (error) {
            console.error(`Error processing copy trade for follower ${subscription.follower_id}:`, error)
            copyResults.push({
              followerId: subscription.follower_id,
              success: false,
              error: error.message
            })
          }
        }
        
        const successfulCopies = copyResults.filter(r => r.success).length
        console.log(`Copy trading completed: ${successfulCopies}/${copyResults.length} successful`)
        
        return createSuccessResponse({
          message: `Copy trading completed`,
          copiedTrades: successfulCopies,
          totalFollowers: copyResults.length,
          results: copyResults
        })
      } catch (error) {
        console.error('Copy trading error:', error)
        return createErrorResponse({
          code: 'COPY_TRADE_ERROR',
          message: error.message
        }, 500)
      }
    })
  })
})
