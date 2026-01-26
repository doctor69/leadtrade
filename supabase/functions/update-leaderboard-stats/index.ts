import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { 
  withAuth, 
  processRequest, 
  createSuccessResponse, 
  createErrorResponse,
  AlpacaClient,
  corsHeaders,
  createSupabaseClient
} from '../_shared/index.ts'
import type { AuthContext } from '../_shared/auth.ts'

/**
 * Edge Function to update leaderboard statistics
 * 
 * This function calculates performance metrics from Alpaca account data
 * and updates the leaderboard_stats table
 * 
 * POST: Update stats for the authenticated user
 * 
 * Requirements: Copy Trading, Leaderboard
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

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        console.log(`Updating leaderboard stats for user ${authContext.userId}`)
        
        // Check if user has share_trades enabled
        const supabase = createSupabaseClient(req)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('share_trades, show_asset_amounts')
          .eq('id', authContext.userId)
          .single()
        
        if (profileError || !profile) {
          return createErrorResponse(
            {
              code: 'PROFILE_NOT_FOUND',
              message: 'User profile not found'
            },
            404
          )
        }
        
        if (!profile.share_trades) {
          return createErrorResponse(
            {
              code: 'SHARING_DISABLED',
              message: 'User has not enabled trade sharing'
            },
            403
          )
        }
        
        // Get Alpaca account data
        const alpacaClient = new AlpacaClient(authContext)
        
        // Fetch account info
        const accountResponse = await alpacaClient.brokerRequest(
          `/v1/trading/accounts/${authContext.alpacaAccountId}/account`
        )
        
        if (!accountResponse.success || !accountResponse.data) {
          return createErrorResponse(
            {
              code: 'ACCOUNT_FETCH_FAILED',
              message: 'Failed to fetch account data from Alpaca'
            },
            400
          )
        }
        
        const account = accountResponse.data
        const portfolioValue = parseFloat(account.equity || account.portfolio_value || '0')
        
        // Fetch portfolio history to calculate returns
        const historyResponse = await alpacaClient.brokerRequest(
          `/v1/trading/accounts/${authContext.alpacaAccountId}/account/portfolio/history`,
          { params: { period: 'all', timeframe: '1D' } }
        )
        
        let totalReturn = 0
        let totalReturnPercent = 0
        
        if (historyResponse.success && historyResponse.data) {
          const history = historyResponse.data
          if (history.equity && history.equity.length > 0) {
            const initialValue = history.equity[0]
            const currentValue = history.equity[history.equity.length - 1]
            
            if (initialValue > 0 && currentValue > 0) {
              totalReturn = currentValue - initialValue
              totalReturnPercent = ((currentValue - initialValue) / initialValue) * 100
            }
          }
        }
        
        // Fetch activities to calculate trade statistics
        const activitiesResponse = await alpacaClient.brokerRequest(
          `/v1/trading/accounts/${authContext.alpacaAccountId}/account/activities`,
          { params: { activity_types: 'FILL', page_size: '500' } }
        )
        
        let tradesCount = 0
        let winningTrades = 0
        let losingTrades = 0
        let totalHoldTimeHours = 0
        let completedPositions = 0
        
        if (activitiesResponse.success && activitiesResponse.data) {
          const activities = activitiesResponse.data
          
          // Group fills by symbol to calculate P&L per position
          const positionMap = new Map<string, any[]>()
          
          for (const activity of activities) {
            if (activity.type === 'FILL') {
              const symbol = activity.symbol
              if (!positionMap.has(symbol)) {
                positionMap.set(symbol, [])
              }
              positionMap.get(symbol)!.push(activity)
            }
          }
          
          // Calculate statistics for each position
          for (const [symbol, fills] of positionMap.entries()) {
            if (fills.length < 2) continue // Need at least entry and exit
            
            // Sort by timestamp
            fills.sort((a, b) => new Date(a.transaction_time).getTime() - new Date(b.transaction_time).getTime())
            
            let position = 0
            let costBasis = 0
            let entryTime: Date | null = null
            
            for (const fill of fills) {
              const qty = parseFloat(fill.qty)
              const price = parseFloat(fill.price)
              const side = fill.side
              
              if (side === 'buy') {
                if (position === 0) {
                  entryTime = new Date(fill.transaction_time)
                }
                position += qty
                costBasis += qty * price
              } else if (side === 'sell') {
                if (position > 0) {
                  const exitTime = new Date(fill.transaction_time)
                  const avgCost = costBasis / position
                  const pnl = (price - avgCost) * Math.min(qty, position)
                  
                  if (pnl > 0) winningTrades++
                  else if (pnl < 0) losingTrades++
                  
                  if (entryTime) {
                    const holdTimeMs = exitTime.getTime() - entryTime.getTime()
                    totalHoldTimeHours += holdTimeMs / (1000 * 60 * 60)
                    completedPositions++
                  }
                  
                  position -= qty
                  if (position <= 0) {
                    position = 0
                    costBasis = 0
                    entryTime = null
                  } else {
                    costBasis = (costBasis / (position + qty)) * position
                  }
                }
              }
            }
          }
          
          tradesCount = winningTrades + losingTrades
        }
        
        const winRate = tradesCount > 0 ? (winningTrades / tradesCount) * 100 : 0
        const avgHoldTimeHours = completedPositions > 0 ? totalHoldTimeHours / completedPositions : null
        
        // Determine risk level and trading style
        let riskLevel: 'low' | 'medium' | 'high' = 'medium'
        if (Math.abs(totalReturnPercent) < 5) riskLevel = 'low'
        else if (Math.abs(totalReturnPercent) > 20) riskLevel = 'high'
        
        let tradingStyle: 'conservative' | 'moderate' | 'active' = 'moderate'
        if (tradesCount < 10) tradingStyle = 'conservative'
        else if (tradesCount > 50) tradingStyle = 'active'
        
        // Get follower count
        const { count: followersCount } = await supabase
          .from('copy_trading_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('leader_id', authContext.userId)
          .eq('is_active', true)
        
        // Upsert stats
        const { error: upsertError } = await supabase
          .from('leaderboard_stats')
          .upsert({
            user_id: authContext.userId,
            portfolio_value: portfolioValue,
            total_return: totalReturn,
            total_return_percent: totalReturnPercent,
            trades_count: tradesCount,
            winning_trades: winningTrades,
            losing_trades: losingTrades,
            win_rate: winRate,
            avg_hold_time_hours: avgHoldTimeHours,
            risk_level: riskLevel,
            trading_style: tradingStyle,
            followers_count: followersCount || 0,
            last_calculated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
        
        if (upsertError) {
          console.error('Failed to upsert leaderboard stats:', upsertError)
          return createErrorResponse(
            {
              code: 'DATABASE_ERROR',
              message: 'Failed to update leaderboard statistics',
              details: upsertError
            },
            500
          )
        }
        
        return createSuccessResponse({
          message: 'Leaderboard statistics updated successfully',
          stats: {
            portfolio_value: portfolioValue,
            total_return: totalReturn,
            total_return_percent: totalReturnPercent,
            trades_count: tradesCount,
            win_rate: winRate,
            followers_count: followersCount || 0
          }
        })
      } catch (error) {
        console.error('Unexpected error updating leaderboard stats:', error)
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
