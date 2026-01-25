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
 * Edge Function handler for Alpaca broker status and health check
 * 
 * GET: Retrieves comprehensive broker status including account, market, and connectivity
 * 
 * Requirements: System monitoring, trading readiness assessment
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
        console.log(`Processing broker status request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        const startTime = Date.now()
        const status: any = {
          timestamp: new Date().toISOString(),
          trading_mode: authContext.tradingMode,
          user_id: authContext.userId,
          checks: {},
          overall_status: 'unknown',
          ready_to_trade: false
        }
        
        // Get account ID from auth context or fetch from database
        let accountId = authContext.alpacaAccountId
        if (!accountId) {
          try {
            const accountsResponse = await alpacaClient.getAccounts()
            if (accountsResponse.success && accountsResponse.data && accountsResponse.data.length > 0) {
              accountId = accountsResponse.data[0].id
            }
          } catch (error) {
            console.error('Failed to fetch account ID:', error)
          }
        }
        
        // Check 1: Account connectivity and status
        try {
          console.log('Checking account status...')
          
          if (accountId) {
            const accountResponse = await alpacaClient.getAccount(accountId)
            
            if (accountResponse.success) {
              const account = accountResponse.data
              status.checks.account = {
                status: 'healthy',
                account_status: account.status,
                account_blocked: account.account_blocked,
                trading_blocked: account.trading_blocked,
                transfers_blocked: account.transfers_blocked,
                pattern_day_trader: account.pattern_day_trader,
                buying_power: parseFloat(account.buying_power || '0'),
                cash: parseFloat(account.cash || '0'),
                portfolio_value: parseFloat(account.portfolio_value || '0')
              }
            } else {
              status.checks.account = {
                status: 'error',
                error: accountResponse.error?.message || 'Failed to fetch account'
              }
            }
          } else {
            status.checks.account = {
              status: 'error',
              error: 'No Alpaca account found for this user'
            }
          }
        } catch (error) {
          status.checks.account = {
            status: 'error',
            error: error instanceof Error ? error.message : 'Account check failed'
          }
        }
        
        // Check 2: Market status
        try {
          console.log('Checking market status...')
          const clockResponse = await alpacaClient.dataRequest('/v2/clock')
          
          if (clockResponse.success) {
            const clock = clockResponse.data
            status.checks.market = {
              status: 'healthy',
              is_open: clock.is_open,
              next_open: clock.next_open,
              next_close: clock.next_close,
              timestamp: clock.timestamp
            }
          } else {
            status.checks.market = {
              status: 'error',
              error: clockResponse.error?.message || 'Failed to fetch market status'
            }
          }
        } catch (error) {
          status.checks.market = {
            status: 'error',
            error: error instanceof Error ? error.message : 'Market check failed'
          }
        }
        
        // Check 3: Orders connectivity
        try {
          console.log('Checking orders connectivity...')
          if (accountId) {
            const ordersResponse = await alpacaClient.getOrders(accountId, { limit: 1, status: 'all' })
            
            if (ordersResponse.success) {
              status.checks.orders = {
                status: 'healthy',
                can_fetch_orders: true
              }
            } else {
              status.checks.orders = {
                status: 'error',
                error: ordersResponse.error?.message || 'Failed to fetch orders'
              }
            }
          } else {
            status.checks.orders = {
              status: 'error',
              error: 'No account ID available for orders check'
            }
          }
        } catch (error) {
          status.checks.orders = {
            status: 'error',
            error: error instanceof Error ? error.message : 'Orders check failed'
          }
        }
        
        // Check 4: Positions connectivity
        try {
          console.log('Checking positions connectivity...')
          if (accountId) {
            const positionsResponse = await alpacaClient.getPositions(accountId)
            
            if (positionsResponse.success) {
              status.checks.positions = {
                status: 'healthy',
                can_fetch_positions: true,
                position_count: Array.isArray(positionsResponse.data) ? positionsResponse.data.length : 0
              }
            } else {
              status.checks.positions = {
                status: 'error',
                error: positionsResponse.error?.message || 'Failed to fetch positions'
              }
            }
          } else {
            status.checks.positions = {
              status: 'error',
              error: 'No account ID available for positions check'
            }
          }
        } catch (error) {
          status.checks.positions = {
            status: 'error',
            error: error instanceof Error ? error.message : 'Positions check failed'
          }
        }
        
        // Check 5: Assets/Market data connectivity
        try {
          console.log('Checking market data connectivity...')
          const assetsResponse = await alpacaClient.brokerRequest('/v2/assets', {
            params: { limit: '1', status: 'active' }
          })
          
          if (assetsResponse.success) {
            status.checks.market_data = {
              status: 'healthy',
              can_fetch_assets: true
            }
          } else {
            status.checks.market_data = {
              status: 'error',
              error: assetsResponse.error?.message || 'Failed to fetch market data'
            }
          }
        } catch (error) {
          status.checks.market_data = {
            status: 'error',
            error: error instanceof Error ? error.message : 'Market data check failed'
          }
        }
        
        // Calculate overall status
        const checkResults = Object.values(status.checks)
        const healthyChecks = checkResults.filter((check: any) => check.status === 'healthy').length
        const totalChecks = checkResults.length
        const healthPercentage = (healthyChecks / totalChecks) * 100
        
        if (healthPercentage === 100) {
          status.overall_status = 'healthy'
        } else if (healthPercentage >= 80) {
          status.overall_status = 'degraded'
        } else if (healthPercentage >= 50) {
          status.overall_status = 'unhealthy'
        } else {
          status.overall_status = 'critical'
        }
        
        // Determine if ready to trade
        const accountHealthy = status.checks.account?.status === 'healthy'
        const accountNotBlocked = !status.checks.account?.account_blocked && !status.checks.account?.trading_blocked
        const ordersWorking = status.checks.orders?.status === 'healthy'
        const positionsWorking = status.checks.positions?.status === 'healthy'
        const hasBuyingPower = (status.checks.account?.buying_power || 0) > 0
        
        status.ready_to_trade = accountHealthy && accountNotBlocked && ordersWorking && positionsWorking && hasBuyingPower
        
        // Add performance metrics
        status.response_time_ms = Date.now() - startTime
        status.checks_completed = totalChecks
        status.checks_passed = healthyChecks
        status.health_percentage = Math.round(healthPercentage)
        
        // Add trading readiness details
        status.trading_readiness = {
          account_active: accountHealthy && accountNotBlocked,
          has_buying_power: hasBuyingPower,
          api_connectivity: ordersWorking && positionsWorking,
          market_data_available: status.checks.market_data?.status === 'healthy',
          overall_ready: status.ready_to_trade
        }
        
        // Add recommendations if not ready to trade
        if (!status.ready_to_trade) {
          status.recommendations = []
          
          if (!accountHealthy) {
            status.recommendations.push('Check account connectivity and credentials')
          }
          if (status.checks.account?.account_blocked) {
            status.recommendations.push('Account is blocked - contact support')
          }
          if (status.checks.account?.trading_blocked) {
            status.recommendations.push('Trading is blocked - check account status')
          }
          if (!hasBuyingPower) {
            status.recommendations.push('Add funds to account or close positions to free up buying power')
          }
          if (!ordersWorking) {
            status.recommendations.push('Orders API is not responding - check connectivity')
          }
          if (!positionsWorking) {
            status.recommendations.push('Positions API is not responding - check connectivity')
          }
        }
        
        console.log(`✅ Broker status check completed: ${status.overall_status} (${healthPercentage}% healthy)`)
        
        return createSuccessResponse(status)
        
      } catch (error) {
        console.error('Unexpected error in broker status endpoint:', error)
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