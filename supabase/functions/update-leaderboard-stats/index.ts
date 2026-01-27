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
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
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
        
        console.log(`Using Alpaca account ID: ${accountId}`)
        
        // Fetch account info
        const accountResponse = await alpacaClient.brokerRequest(
          `/v1/trading/accounts/${accountId}/account`
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
          `/v1/trading/accounts/${accountId}/account/portfolio/history`,
          { params: { period: 'all', timeframe: '1D' } }
        )
        
        let totalReturn = 0
        let totalReturnPercent = 0
        
        if (historyResponse.success && historyResponse.data) {
          const history = historyResponse.data
          console.log(`Portfolio history data:`, JSON.stringify(history))
          
          if (history.equity && history.equity.length > 1) {
            const initialValue = history.equity[0]
            const currentValue = history.equity[history.equity.length - 1]
            
            console.log(`Initial value: ${initialValue}, Current value: ${currentValue}`)
            
            if (initialValue > 0 && currentValue > 0) {
              totalReturn = currentValue - initialValue
              totalReturnPercent = ((currentValue - initialValue) / initialValue) * 100
              console.log(`Calculated return: ${totalReturn}, Return %: ${totalReturnPercent}`)
            }
          } else {
            console.log(`Insufficient equity data: ${history.equity?.length || 0} points`)
          }
        } else {
          console.log(`Portfolio history fetch failed or no data`)
        }
        
        // Fetch activities to calculate trade statistics (limit to recent 100 for performance)
        const activitiesResponse = await alpacaClient.brokerRequest(
          `/v1/trading/accounts/${accountId}/account/activities`,
          { params: { activity_types: 'FILL', page_size: '100' } }
        )
        
        let tradesCount = 0
        let winningTrades = 0
        let losingTrades = 0
        
        // Simplified trade counting - just count fills
        if (activitiesResponse.success && activitiesResponse.data) {
          const activities = activitiesResponse.data
          tradesCount = activities.length
          
          // Estimate win rate from profitable vs unprofitable fills
          for (const activity of activities) {
            if (activity.type === 'FILL') {
              // Simple heuristic: if it's a sell with profit info
              if (activity.side === 'sell' && activity.net_amount) {
                const netAmount = parseFloat(activity.net_amount)
                if (netAmount > 0) winningTrades++
                else if (netAmount < 0) losingTrades++
              }
            }
          }
        }
        
        const winRate = tradesCount > 0 ? (winningTrades / tradesCount) * 100 : 0
        
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
            avg_hold_time_hours: null,
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
