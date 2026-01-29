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
  return processRequest(req, async () => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow POST
    if (req.method !== 'POST') {
      return createErrorResponse({
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST requests are allowed'
      }, 405)
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        const requestBody = await req.json()
        console.log('Request body:', JSON.stringify(requestBody))
        
        const { leaderId, orderData, leaderPortfolioValue } = requestBody as CopyTradeRequest
        
        if (!leaderId || !orderData || !leaderPortfolioValue) {
          console.error('Missing required fields:', { leaderId, orderData: !!orderData, leaderPortfolioValue })
          return createErrorResponse({
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: leaderId, orderData, or leaderPortfolioValue'
          }, 400)
        }
        
        console.log(`Executing copy trades for leader ${leaderId}`)
        
        // Get Supabase client
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        // Get all active followers for this leader
        const { data: subscriptions, error: subsError } = await supabase
          .from('copy_trading_subscriptions')
          .select('*')
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
        
        // Get follower profiles and their Alpaca accounts separately
        const followerIds = subscriptions.map(sub => sub.follower_id)
        
        console.log(`Fetching data for ${followerIds.length} followers:`, followerIds)
        
        const [profilesResult, alpacaAccountsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, username')
            .in('id', followerIds),
          supabase
            .from('alpaca_accounts')
            .select('user_id, alpaca_account_id, account_type, account_status')
            .in('user_id', followerIds)
        ])
        
        console.log(`Profiles found: ${profilesResult.data?.length || 0}`)
        console.log(`Alpaca accounts found (before status filter): ${alpacaAccountsResult.data?.length || 0}`)
        if (alpacaAccountsResult.data) {
          console.log('All Alpaca accounts:', alpacaAccountsResult.data.map(a => ({ 
            user_id: a.user_id, 
            account_id: a.alpaca_account_id,
            type: a.account_type,
            status: a.account_status
          })))
        }
        
        // Filter for ACTIVE accounts
        const activeAccounts = alpacaAccountsResult.data?.filter(a => a.account_status === 'ACTIVE') || []
        console.log(`Active Alpaca accounts: ${activeAccounts.length}`)
        if (activeAccounts.length > 0) {
          console.log('Active accounts:', activeAccounts.map(a => ({ 
            user_id: a.user_id, 
            account_id: a.alpaca_account_id,
            type: a.account_type 
          })))
        }
        
        if (profilesResult.error) {
          console.error('Error fetching follower profiles:', profilesResult.error)
          return createErrorResponse({ code: 'DB_ERROR', message: 'Failed to fetch follower profiles' }, 500)
        }
        
        if (alpacaAccountsResult.error) {
          console.error('Error fetching Alpaca accounts:', alpacaAccountsResult.error)
          return createErrorResponse({ code: 'DB_ERROR', message: 'Failed to fetch Alpaca accounts' }, 500)
        }
        
        // Map profiles and accounts to subscriptions, and filter out followers without Alpaca accounts
        const subscriptionsWithProfiles = subscriptions
          .map(sub => {
            const profile = profilesResult.data?.find(p => p.id === sub.follower_id)
            const alpacaAccount = activeAccounts.find(a => a.user_id === sub.follower_id)
            
            return {
              ...sub,
              follower: {
                id: sub.follower_id,
                username: profile?.username || 'Unknown',
                alpaca_account_id: alpacaAccount?.alpaca_account_id,
                account_type: alpacaAccount?.account_type as 'paper' | 'live' | undefined
              }
            }
          })
          .filter(sub => {
            // Only include followers who have an active Alpaca account
            if (!sub.follower.alpaca_account_id) {
              console.log(`Skipping follower ${sub.follower_id} (${sub.follower.username}): No Alpaca account`)
              return false
            }
            return true
          })
        
        if (subscriptionsWithProfiles.length === 0) {
          console.log('No followers with Alpaca accounts found')
          return createSuccessResponse({ 
            message: 'No followers with Alpaca accounts to copy trade', 
            copiedTrades: 0,
            totalFollowers: subscriptions.length,
            followersWithAccounts: 0
          })
        }
        
        console.log(`Processing ${subscriptionsWithProfiles.length} followers with Alpaca accounts (out of ${subscriptions.length} total followers)`)
        
        // Get the current market price for accurate quantity calculation
        let estimatedPrice = orderData.limit_price || 1
        
        // For market orders, fetch the latest price from Alpaca
        if (!orderData.limit_price && orderData.type === 'market') {
          try {
            // Use the leader's auth context to fetch market data
            const leaderAlpacaClient = new AlpacaClient(authContext)
            const latestQuote = await leaderAlpacaClient.dataRequest(
              `/v2/stocks/${orderData.symbol}/quotes/latest`
            )
            
            if (latestQuote.success && latestQuote.data?.quote) {
              // Use the mid-point between bid and ask for better accuracy
              const bid = parseFloat(latestQuote.data.quote.bp || latestQuote.data.quote.bid_price || '0')
              const ask = parseFloat(latestQuote.data.quote.ap || latestQuote.data.quote.ask_price || '0')
              if (bid > 0 && ask > 0) {
                estimatedPrice = (bid + ask) / 2
              } else if (ask > 0) {
                estimatedPrice = ask
              } else if (bid > 0) {
                estimatedPrice = bid
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch market price for ${orderData.symbol}, using fallback:`, error)
          }
        }
        
        // Calculate the trade size as percentage of leader's portfolio
        const tradeValue = parseFloat(orderData.qty.toString()) * estimatedPrice
        const leaderTradePercentage = (tradeValue / leaderPortfolioValue) * 100
        
        console.log(`Leader trade: ${orderData.qty} shares @ ~$${estimatedPrice.toFixed(2)}, ~$${tradeValue.toFixed(2)}, ${leaderTradePercentage.toFixed(4)}% of portfolio`)
        
        const copyResults = []
        
        // Execute copy trades for each follower
        for (const subscription of subscriptionsWithProfiles) {
          try {
            const followerId = subscription.follower_id
            const followerAllocationPercentage = parseFloat(subscription.allocation_percentage.toString())
            
            console.log(`Processing follower ${followerId} with ${followerAllocationPercentage}% allocation`)
            
            // At this point, we know the follower has an Alpaca account (filtered earlier)
            const followerAccountId = subscription.follower.alpaca_account_id!
            const followerTradingMode = (subscription.follower.account_type || 'paper') as 'paper' | 'live'
            console.log(`Follower ${followerId} account details:`, {
              accountId: followerAccountId,
              accountType: subscription.follower.account_type,
              tradingMode: followerTradingMode,
              fullFollowerObject: subscription.follower
            })
            
            // Create Alpaca client for follower with proper AuthContext
            const followerAlpacaClient = new AlpacaClient({
              userId: followerId,
              alpacaAccountId: followerAccountId,
              tradingMode: followerTradingMode,
              sessionToken: '', // Not needed for broker API calls
              isAuthenticated: true,
              alpacaAccessToken: '' // Not needed for broker API calls
            })
            
            // Get follower's account info
            console.log(`Fetching account info for follower ${followerId} from /v1/trading/accounts/${followerAccountId}/account`)
            const accountResponse = await followerAlpacaClient.brokerRequest(
              `/v1/trading/accounts/${followerAccountId}/account`
            )
            
            console.log(`Account response for follower ${followerId}:`, { 
              success: accountResponse.success, 
              hasData: !!accountResponse.data,
              error: accountResponse.error 
            })
            
            if (!accountResponse.success || !accountResponse.data) {
              console.error(`Failed to get account info for follower ${followerId}:`, accountResponse.error)
              copyResults.push({
                followerId,
                success: false,
                error: 'Failed to get account info'
              })
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
            
            // Calculate quantity with fractional shares support
            // Alpaca supports up to 9 decimal places for fractional shares
            let followerQty = followerTradeValue / estimatedPrice
            
            // Round to 9 decimal places (Alpaca's precision)
            followerQty = Math.round(followerQty * 1000000000) / 1000000000
            
            console.log(`Follower ${followerId}: Portfolio $${followerPortfolioValue.toFixed(2)}, ` +
              `Allocation ${followerAllocationPercentage}%, ` +
              `Trade ${followerTradePercentage.toFixed(4)}% = $${followerTradeValue.toFixed(2)}, ` +
              `Price: $${estimatedPrice.toFixed(2)}, ` +
              `Qty: ${followerQty}`)
            
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
                    followerQty = availableQty // Keep fractional shares
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
                  error: error instanceof Error ? error.message : 'Error verifying position for sell order'
                })
                continue
              }
            }
            
            // Skip if quantity is too small (less than $0.01 worth)
            if (followerQty <= 0 || followerQty * estimatedPrice < 0.01) {
              console.log(`Skipping follower ${followerId}: calculated quantity ${followerQty} is too small (value: $${(followerQty * estimatedPrice).toFixed(4)})`)
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
              error: error instanceof Error ? error.message : 'Unknown error processing copy trade'
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
          message: error instanceof Error ? error.message : 'Unknown copy trading error'
        }, 500)
      }
    })
  })
})
