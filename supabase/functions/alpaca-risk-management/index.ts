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

// Schema for risk assessment request
const riskAssessmentSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  qty: z.number().positive('Quantity must be positive'),
  side: z.enum(['buy', 'sell'], { required_error: 'Side must be buy or sell' }),
  order_type: z.enum(['market', 'limit', 'stop', 'stop_limit']).default('market'),
  price: z.number().positive().optional(),
  check_day_trading: z.boolean().default(true),
  check_buying_power: z.boolean().default(true),
  check_position_limits: z.boolean().default(true),
});

/**
 * Edge Function handler for Alpaca risk management
 * 
 * POST: Performs comprehensive risk assessment for proposed trades
 * GET: Retrieves current risk metrics and limits
 * 
 * Requirements: Risk management, compliance, position sizing
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
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Method not allowed. Only GET and POST requests are supported.'
        },
        405
      )
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        console.log(`Processing risk management request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // Handle GET request (get current risk metrics)
        if (req.method === 'GET') {
          console.log('Fetching current risk metrics...')
          
          // Get account information
          let accountId = authContext.alpacaAccountId
          if (!accountId) {
            const accountsResponse = await alpacaClient.getAccounts()
            if (!accountsResponse.success || !accountsResponse.data || accountsResponse.data.length === 0) {
              return createErrorResponse(
                {
                  code: ERROR_CODES.ALPACA_API_ERROR,
                  message: 'No Alpaca account found for this user'
                },
                404
              )
            }
            accountId = accountsResponse.data[0].id
          }
          
          const accountResponse = await alpacaClient.getAccount(accountId)
          if (!accountResponse.success) {
            return createErrorResponse(
              {
                code: accountResponse.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                message: 'Failed to fetch account for risk assessment',
                details: accountResponse.error?.details
              },
              accountResponse.error?.status || 400
            )
          }
          
          const account = accountResponse.data
          
          // Get current positions
          const positionsResponse = await alpacaClient.brokerRequest('/v2/positions')
          const positions = positionsResponse.success ? positionsResponse.data : []
          
          // Get recent orders for day trading analysis
          const ordersResponse = await alpacaClient.brokerRequest('/v2/orders', {
            params: { 
              status: 'all', 
              limit: '100',
              after: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Last 24 hours
            }
          })
          const recentOrders = ordersResponse.success ? ordersResponse.data : []
          
          // Calculate risk metrics
          const portfolioValue = parseFloat(account.portfolio_value || '0')
          const buyingPower = parseFloat(account.buying_power || '0')
          const cash = parseFloat(account.cash || '0')
          const equity = parseFloat(account.equity || '0')
          
          // Calculate position concentration
          const positionValues = positions.map((pos: any) => ({
            symbol: pos.symbol,
            value: Math.abs(parseFloat(pos.market_value || '0')),
            percentage: portfolioValue > 0 ? (Math.abs(parseFloat(pos.market_value || '0')) / portfolioValue) * 100 : 0
          }))
          
          const maxPositionConcentration = positionValues.length > 0 
            ? Math.max(...positionValues.map(p => p.percentage))
            : 0
          
          // Count day trades
          const today = new Date().toISOString().split('T')[0]
          const dayTrades = recentOrders.filter((order: any) => {
            const orderDate = new Date(order.created_at).toISOString().split('T')[0]
            return orderDate === today && order.status === 'filled'
          })
          
          const dayTradeCount = account.daytrade_count || 0
          const isPatternDayTrader = account.pattern_day_trader || false
          
          // Calculate leverage
          const longMarketValue = parseFloat(account.long_market_value || '0')
          const shortMarketValue = parseFloat(account.short_market_value || '0')
          const totalMarketValue = longMarketValue + Math.abs(shortMarketValue)
          const leverage = equity > 0 ? totalMarketValue / equity : 0
          
          const riskMetrics = {
            account_status: {
              account_blocked: account.account_blocked,
              trading_blocked: account.trading_blocked,
              pattern_day_trader: isPatternDayTrader,
              day_trade_count: dayTradeCount,
              multiplier: parseFloat(account.multiplier || '1')
            },
            
            financial_metrics: {
              portfolio_value: portfolioValue,
              buying_power: buyingPower,
              cash: cash,
              equity: equity,
              leverage: leverage,
              margin_used: portfolioValue - cash
            },
            
            position_metrics: {
              total_positions: positions.length,
              max_position_concentration_pct: maxPositionConcentration,
              long_market_value: longMarketValue,
              short_market_value: shortMarketValue,
              net_market_value: longMarketValue - Math.abs(shortMarketValue)
            },
            
            day_trading_metrics: {
              day_trades_today: dayTrades.length,
              day_trades_remaining: isPatternDayTrader ? 'unlimited' : Math.max(0, 3 - dayTradeCount),
              can_day_trade: isPatternDayTrader || dayTradeCount < 3
            },
            
            risk_limits: {
              max_position_size_pct: authContext.tradingMode === 'paper' ? 50 : 25, // Max 25% of portfolio in one position
              max_leverage: authContext.tradingMode === 'paper' ? 4 : 2, // Max 2x leverage for live trading
              min_cash_reserve_pct: 10, // Keep 10% cash reserve
              max_daily_loss_pct: 5 // Max 5% daily loss
            },
            
            risk_assessment: {
              overall_risk: leverage > 2 ? 'high' : leverage > 1.5 ? 'medium' : 'low',
              concentration_risk: maxPositionConcentration > 25 ? 'high' : maxPositionConcentration > 15 ? 'medium' : 'low',
              liquidity_risk: (cash / portfolioValue) < 0.1 ? 'high' : (cash / portfolioValue) < 0.2 ? 'medium' : 'low'
            }
          }
          
          return createSuccessResponse(riskMetrics)
        }
        
        // Handle POST request (assess trade risk)
        if (req.method === 'POST') {
          try {
            const body = await req.json()
            const validatedRequest = riskAssessmentSchema.parse(body)
            
            console.log(`Assessing risk for ${validatedRequest.side} ${validatedRequest.qty} ${validatedRequest.symbol}`)
            
            // Get account information
            let accountId = authContext.alpacaAccountId
            if (!accountId) {
              const accountsResponse = await alpacaClient.getAccounts()
              if (!accountsResponse.success || !accountsResponse.data || accountsResponse.data.length === 0) {
                return createErrorResponse(
                  {
                    code: ERROR_CODES.ALPACA_API_ERROR,
                    message: 'No Alpaca account found for this user'
                  },
                  404
                )
              }
              accountId = accountsResponse.data[0].id
            }
            
            const accountResponse = await alpacaClient.getAccount(accountId)
            if (!accountResponse.success) {
              return createErrorResponse(
                {
                  code: accountResponse.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: 'Failed to fetch account for risk assessment',
                  details: accountResponse.error?.details
                },
                accountResponse.error?.status || 400
              )
            }
            
            const account = accountResponse.data
            const portfolioValue = parseFloat(account.portfolio_value || '0')
            const buyingPower = parseFloat(account.buying_power || '0')
            const cash = parseFloat(account.cash || '0')
            
            // Get current position for the symbol
            let currentPosition = null
            try {
              const positionResponse = await alpacaClient.brokerRequest(`/v2/positions/${validatedRequest.symbol}`)
              if (positionResponse.success) {
                currentPosition = positionResponse.data
              }
            } catch (error) {
              // Position doesn't exist, which is fine
            }
            
            // Get asset information for price estimation
            const assetResponse = await alpacaClient.brokerRequest(`/v2/assets/${validatedRequest.symbol}`)
            const asset = assetResponse.success ? assetResponse.data : null
            
            // Estimate trade value
            let estimatedPrice = validatedRequest.price
            if (!estimatedPrice) {
              // For market orders, we need to estimate the price
              // In a real implementation, you'd get the current market price
              estimatedPrice = 100 // Placeholder - should get from market data
            }
            
            const tradeValue = estimatedPrice * validatedRequest.qty
            
            // Risk assessment results
            const riskAssessment = {
              trade_details: {
                symbol: validatedRequest.symbol,
                side: validatedRequest.side,
                qty: validatedRequest.qty,
                estimated_price: estimatedPrice,
                estimated_value: tradeValue,
                order_type: validatedRequest.order_type
              },
              
              checks: {
                account_status: {
                  passed: !account.account_blocked && !account.trading_blocked,
                  blocked: account.account_blocked,
                  trading_blocked: account.trading_blocked,
                  message: account.account_blocked ? 'Account is blocked' : 
                          account.trading_blocked ? 'Trading is blocked' : 'Account is active'
                },
                
                buying_power: {
                  passed: validatedRequest.check_buying_power ? tradeValue <= buyingPower : true,
                  required: tradeValue,
                  available: buyingPower,
                  sufficient: tradeValue <= buyingPower,
                  message: tradeValue <= buyingPower ? 'Sufficient buying power' : 
                          `Insufficient buying power. Need $${tradeValue.toFixed(2)}, have $${buyingPower.toFixed(2)}`
                },
                
                position_limits: {
                  passed: true, // Will be calculated below
                  current_position_value: currentPosition ? Math.abs(parseFloat(currentPosition.market_value || '0')) : 0,
                  new_position_value: 0, // Will be calculated
                  max_allowed_pct: 25,
                  message: ''
                },
                
                day_trading: {
                  passed: true, // Will be calculated below
                  is_day_trade: false,
                  day_trades_used: account.daytrade_count || 0,
                  day_trades_remaining: account.pattern_day_trader ? 'unlimited' : Math.max(0, 3 - (account.daytrade_count || 0)),
                  pattern_day_trader: account.pattern_day_trader || false,
                  message: ''
                }
              },
              
              risk_metrics: {
                position_concentration_pct: 0, // Will be calculated
                leverage_impact: 0,
                cash_reserve_after_trade: cash - (validatedRequest.side === 'buy' ? tradeValue : 0)
              },
              
              overall_assessment: {
                approved: false, // Will be determined
                risk_level: 'low',
                warnings: [] as string[],
                recommendations: [] as string[]
              }
            }
            
            // Calculate position concentration
            if (validatedRequest.side === 'buy') {
              const currentValue = currentPosition ? Math.abs(parseFloat(currentPosition.market_value || '0')) : 0
              const newPositionValue = currentValue + tradeValue
              riskAssessment.risk_metrics.position_concentration_pct = portfolioValue > 0 ? (newPositionValue / portfolioValue) * 100 : 0
              riskAssessment.checks.position_limits.new_position_value = newPositionValue
              
              if (riskAssessment.risk_metrics.position_concentration_pct > 25) {
                riskAssessment.checks.position_limits.passed = false
                riskAssessment.checks.position_limits.message = `Position would exceed 25% concentration limit (${riskAssessment.risk_metrics.position_concentration_pct.toFixed(1)}%)`
                riskAssessment.overall_assessment.warnings.push('High position concentration')
              } else {
                riskAssessment.checks.position_limits.message = `Position concentration: ${riskAssessment.risk_metrics.position_concentration_pct.toFixed(1)}%`
              }
            }
            
            // Check day trading rules (simplified)
            if (currentPosition && validatedRequest.side === 'sell') {
              // This could be a day trade if there was a buy today
              riskAssessment.checks.day_trading.is_day_trade = true
              if (!account.pattern_day_trader && (account.daytrade_count || 0) >= 3) {
                riskAssessment.checks.day_trading.passed = false
                riskAssessment.checks.day_trading.message = 'Day trading limit exceeded'
                riskAssessment.overall_assessment.warnings.push('Day trading limit would be exceeded')
              }
            }
            
            // Determine overall approval
            const allChecksPassed = Object.values(riskAssessment.checks).every((check: any) => check.passed)
            riskAssessment.overall_assessment.approved = allChecksPassed
            
            // Set risk level
            if (riskAssessment.risk_metrics.position_concentration_pct > 20 || tradeValue > portfolioValue * 0.3) {
              riskAssessment.overall_assessment.risk_level = 'high'
            } else if (riskAssessment.risk_metrics.position_concentration_pct > 10 || tradeValue > portfolioValue * 0.15) {
              riskAssessment.overall_assessment.risk_level = 'medium'
            }
            
            // Add recommendations
            if (riskAssessment.risk_metrics.cash_reserve_after_trade < portfolioValue * 0.1) {
              riskAssessment.overall_assessment.recommendations.push('Consider maintaining higher cash reserves')
            }
            
            if (riskAssessment.risk_metrics.position_concentration_pct > 15) {
              riskAssessment.overall_assessment.recommendations.push('Consider diversifying across more positions')
            }
            
            console.log(`✅ Risk assessment completed: ${riskAssessment.overall_assessment.approved ? 'APPROVED' : 'REJECTED'}`)
            
            return createSuccessResponse(riskAssessment)
            
          } catch (error) {
            const validationError = error as Error;
            if (validationError instanceof z.ZodError) {
              return createErrorResponse(
                {
                  code: ERROR_CODES.INVALID_REQUEST,
                  message: 'Invalid risk assessment parameters',
                  details: validationError.errors
                },
                400
              )
            }
            throw validationError
          }
        }
        
        // This should never happen due to the method check above
        return createErrorResponse(
          {
            code: ERROR_CODES.INVALID_REQUEST,
            message: 'Method not allowed'
          },
          405
        )
      } catch (error) {
        console.error('Unexpected error in risk management endpoint:', error)
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