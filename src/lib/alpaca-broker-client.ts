import { edgeFunctionClient, type EdgeFunctionResponse } from './edgeFunctionClient'

// Types for Alpaca API responses
export interface AlpacaAccount {
  id: string
  account_number: string
  status: string
  currency: string
  buying_power: string
  regt_buying_power: string
  daytrading_buying_power: string
  cash: string
  portfolio_value: string
  pattern_day_trader: boolean
  trade_suspended_by_user: boolean
  trading_blocked: boolean
  transfers_blocked: boolean
  account_blocked: boolean
  created_at: string
  shorting_enabled: boolean
  long_market_value: string
  short_market_value: string
  equity: string
  last_equity: string
  multiplier: string
  initial_margin: string
  maintenance_margin: string
  last_maintenance_margin: string
  sma: string
  daytrade_count: number
}

export interface AlpacaPosition {
  asset_id: string
  symbol: string
  exchange: string
  asset_class: string
  qty: string
  avg_entry_price: string
  side: 'long' | 'short'
  market_value: string
  cost_basis: string
  unrealized_pl: string
  unrealized_plpc: string
  unrealized_intraday_pl: string
  unrealized_intraday_plpc: string
  current_price: string
  lastday_price: string
  change_today: string
}

export interface AlpacaOrder {
  id: string
  client_order_id: string
  created_at: string
  updated_at: string
  submitted_at: string
  filled_at: string | null
  expired_at: string | null
  canceled_at: string | null
  failed_at: string | null
  replaced_at: string | null
  replaced_by: string | null
  replaces: string | null
  asset_id: string
  symbol: string
  asset_class: string
  notional: string | null
  qty: string
  filled_qty: string
  filled_avg_price: string | null
  order_class: string
  order_type: string
  type: string
  side: string
  time_in_force: string
  limit_price: string | null
  stop_price: string | null
  status: string
  extended_hours: boolean
  legs: AlpacaOrder[] | null
  trail_percent: string | null
  trail_price: string | null
  hwm: string | null
}

export interface AlpacaActivity {
  id: string
  account_id: string
  activity_type: string
  transaction_time: string
  type: string
  price: string | null
  qty: string | null
  side: string | null
  symbol: string | null
  leaves_qty: string | null
  cum_qty: string | null
  order_id: string | null
}

export interface AlpacaWatchlist {
  id: string
  account_id: string
  created_at: string
  updated_at: string
  name: string
  assets: Array<{
    id: string
    class: string
    exchange: string
    symbol: string
    name: string
    status: string
    tradable: boolean
    marginable: boolean
    shortable: boolean
    easy_to_borrow: boolean
    fractionable: boolean
  }>
}

export interface AlpacaAsset {
  id: string
  class: string
  exchange: string
  symbol: string
  name: string
  status: string
  tradable: boolean
  marginable: boolean
  shortable: boolean
  easy_to_borrow: boolean
  fractionable: boolean
  attributes: string[]
}

export interface AlpacaCalendar {
  date: string
  open: string
  close: string
  session_open: string
  session_close: string
}

export interface AlpacaClock {
  timestamp: string
  is_open: boolean
  next_open: string
  next_close: string
}

// Order creation interfaces
export interface CreateOrderRequest {
  symbol: string
  qty: number
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop' | 'stop_limit'
  time_in_force?: 'day' | 'gtc' | 'ioc' | 'fok'
  limit_price?: number
  stop_price?: number
  trail_price?: number
  trail_percent?: number
  extended_hours?: boolean
  client_order_id?: string
  trade_type?: 'stock' | 'option'
  option_details?: {
    strike: number
    expiration: string
    option_type: 'call' | 'put'
    contract_size?: number
    premium?: number
  }
}

export interface BracketOrderRequest {
  symbol: string
  qty: number
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  time_in_force?: 'day' | 'gtc'
  limit_price?: number
  take_profit: {
    limit_price: number
  }
  stop_loss: {
    stop_price: number
    limit_price?: number
  }
  extended_hours?: boolean
  client_order_id?: string
}

export interface TrailingStopRequest {
  symbol: string
  qty: number
  side: 'buy' | 'sell'
  time_in_force?: 'day' | 'gtc'
  trail_price?: number
  trail_percent?: number
  extended_hours?: boolean
  client_order_id?: string
}

export interface CreateWatchlistRequest {
  name: string
  symbols?: string[]
}

// Query interfaces
export interface OrdersQuery {
  status?: 'open' | 'closed' | 'all'
  limit?: number
  after?: string
  until?: string
  direction?: 'asc' | 'desc'
  nested?: boolean
  symbols?: string
}

export interface ActivitiesQuery {
  activity_type?: string
  date?: string
  until?: string
  after?: string
  direction?: 'asc' | 'desc'
  page_size?: number
  page_token?: string
}

export interface AssetsQuery {
  status?: 'active' | 'inactive'
  asset_class?: 'us_equity' | 'crypto'
  exchange?: string
  attributes?: string
}

export interface CalendarQuery {
  start?: string
  end?: string
}

/**
 * Comprehensive Alpaca Broker API client
 * Provides all broker functionality through Supabase Edge Functions
 */
export class AlpacaBrokerClient {
  /**
   * Account Management
   */
  
  // Get account information
  async getAccount(): Promise<EdgeFunctionResponse<AlpacaAccount>> {
    return edgeFunctionClient.get('alpaca-account')
  }

  // Get account portfolio history
  async getPortfolioHistory(params?: {
    period?: string
    timeframe?: string
    date_end?: string
    extended_hours?: boolean
  }): Promise<EdgeFunctionResponse<any>> {
    return edgeFunctionClient.get('alpaca-portfolio-history', params)
  }

  /**
   * Orders Management
   */
  
  // Get orders
  async getOrders(query?: OrdersQuery): Promise<EdgeFunctionResponse<AlpacaOrder[]>> {
    return edgeFunctionClient.get('alpaca-orders', query)
  }

  // Get specific order
  async getOrder(orderId: string): Promise<EdgeFunctionResponse<AlpacaOrder>> {
    return edgeFunctionClient.get('get-order', { orderId })
  }

  // Create order
  async createOrder(order: CreateOrderRequest): Promise<EdgeFunctionResponse<AlpacaOrder>> {
    return edgeFunctionClient.post('alpaca-orders', order)
  }

  // Cancel order
  async cancelOrder(orderId: string): Promise<EdgeFunctionResponse<{ message: string }>> {
    return edgeFunctionClient.delete('alpaca-orders', { orderId })
  }

  // Cancel all orders
  async cancelAllOrders(): Promise<EdgeFunctionResponse<{ message: string }>> {
    return edgeFunctionClient.delete('cancel-order')
  }

  // Modify order
  async modifyOrder(orderId: string, updates: {
    qty?: number
    time_in_force?: string
    limit_price?: number
    stop_price?: number
    trail?: number
  }): Promise<EdgeFunctionResponse<AlpacaOrder>> {
    return edgeFunctionClient.put('modify-order', updates, { orderId })
  }

  /**
   * Advanced Orders
   */
  
  // Create bracket order
  async createBracketOrder(order: BracketOrderRequest): Promise<EdgeFunctionResponse<AlpacaOrder>> {
    return edgeFunctionClient.post('alpaca-advanced-orders', order, { type: 'bracket' })
  }

  // Create trailing stop order
  async createTrailingStopOrder(order: TrailingStopRequest): Promise<EdgeFunctionResponse<AlpacaOrder>> {
    return edgeFunctionClient.post('alpaca-advanced-orders', order, { type: 'trailing_stop' })
  }

  /**
   * Positions Management
   */
  
  // Get positions
  async getPositions(symbols?: string): Promise<EdgeFunctionResponse<AlpacaPosition[]>> {
    return edgeFunctionClient.get('alpaca-positions', symbols ? { symbols } : undefined)
  }

  // Get specific position
  async getPosition(symbol: string): Promise<EdgeFunctionResponse<AlpacaPosition>> {
    return edgeFunctionClient.get('alpaca-positions', { symbols: symbol })
  }

  // Close position
  async closePosition(symbol: string, qty?: number, percentage?: number): Promise<EdgeFunctionResponse<{ message: string }>> {
    const params: Record<string, string> = { symbol }
    if (qty) params.qty = qty.toString()
    if (percentage) params.percentage = percentage.toString()
    return edgeFunctionClient.delete('alpaca-positions', params)
  }

  // Close all positions
  async closeAllPositions(): Promise<EdgeFunctionResponse<{ message: string }>> {
    return edgeFunctionClient.delete('alpaca-positions')
  }

  /**
   * Account Activities
   */
  
  // Get account activities
  async getActivities(query?: ActivitiesQuery): Promise<EdgeFunctionResponse<AlpacaActivity[]>> {
    return edgeFunctionClient.get('alpaca-account-activities', query)
  }

  /**
   * Watchlists Management
   */
  
  // Get watchlists
  async getWatchlists(): Promise<EdgeFunctionResponse<AlpacaWatchlist[]>> {
    return edgeFunctionClient.get('alpaca-watchlists')
  }

  // Get specific watchlist
  async getWatchlist(watchlistId: string): Promise<EdgeFunctionResponse<AlpacaWatchlist>> {
    return edgeFunctionClient.get('alpaca-watchlists', { watchlistId })
  }

  // Create watchlist
  async createWatchlist(watchlist: CreateWatchlistRequest): Promise<EdgeFunctionResponse<AlpacaWatchlist>> {
    return edgeFunctionClient.post('alpaca-watchlists', watchlist)
  }

  // Update watchlist
  async updateWatchlist(watchlistId: string, name: string): Promise<EdgeFunctionResponse<AlpacaWatchlist>> {
    return edgeFunctionClient.put('alpaca-watchlists', { name }, { watchlistId })
  }

  // Delete watchlist
  async deleteWatchlist(watchlistId: string): Promise<EdgeFunctionResponse<{ message: string }>> {
    return edgeFunctionClient.delete('alpaca-watchlists', { watchlistId })
  }

  // Add symbols to watchlist
  async addSymbolsToWatchlist(watchlistId: string, symbols: string[]): Promise<EdgeFunctionResponse<AlpacaWatchlist>> {
    return edgeFunctionClient.post('alpaca-watchlists', { symbols }, { watchlistId, action: 'add' })
  }

  // Remove symbols from watchlist
  async removeSymbolsFromWatchlist(watchlistId: string, symbols: string[]): Promise<EdgeFunctionResponse<{ message: string }>> {
    return edgeFunctionClient.delete('alpaca-watchlists', { watchlistId, action: 'remove' })
  }

  /**
   * Assets and Market Data
   */
  
  // Get assets
  async getAssets(query?: AssetsQuery): Promise<EdgeFunctionResponse<AlpacaAsset[]>> {
    return edgeFunctionClient.get('alpaca-assets', query)
  }

  // Get specific asset
  async getAsset(symbol: string): Promise<EdgeFunctionResponse<AlpacaAsset>> {
    return edgeFunctionClient.get('alpaca-assets', { symbol })
  }

  // Get market calendar
  async getCalendar(query?: CalendarQuery): Promise<EdgeFunctionResponse<AlpacaCalendar[]>> {
    return edgeFunctionClient.get('alpaca-calendar', query)
  }

  // Get market clock
  async getClock(): Promise<EdgeFunctionResponse<AlpacaClock>> {
    return edgeFunctionClient.get('alpaca-clock')
  }

  /**
   * Options Trading
   */
  
  // Get options positions
  async getOptionsPositions(): Promise<EdgeFunctionResponse<any[]>> {
    return edgeFunctionClient.get('alpaca-options-positions')
  }

  // Get options orders
  async getOptionsOrders(query?: OrdersQuery): Promise<EdgeFunctionResponse<AlpacaOrder[]>> {
    return edgeFunctionClient.get('alpaca-options-orders', query)
  }

  // Get order executions (fills)
  async getOrderExecutions(query?: {
    order_id?: string
    symbol?: string
    start_date?: string
    end_date?: string
    limit?: number
    page_token?: string
  }): Promise<EdgeFunctionResponse<any>> {
    return edgeFunctionClient.get('alpaca-order-executions', query)
  }

  /**
   * Funding and Transfers
   */
  
  // Get funding information
  async getFunding(): Promise<EdgeFunctionResponse<any>> {
    return edgeFunctionClient.get('alpaca-funding')
  }

  /**
   * Broker Status and Health
   */
  
  // Get comprehensive broker status
  async getBrokerStatus(): Promise<EdgeFunctionResponse<any>> {
    return edgeFunctionClient.get('alpaca-broker-status')
  }

  // Get risk metrics
  async getRiskMetrics(): Promise<EdgeFunctionResponse<any>> {
    return edgeFunctionClient.get('alpaca-risk-management')
  }

  // Assess trade risk
  async assessTradeRisk(assessment: {
    symbol: string
    qty: number
    side: 'buy' | 'sell'
    order_type?: 'market' | 'limit' | 'stop' | 'stop_limit'
    price?: number
    check_day_trading?: boolean
    check_buying_power?: boolean
    check_position_limits?: boolean
  }): Promise<EdgeFunctionResponse<any>> {
    return edgeFunctionClient.post('alpaca-risk-management', assessment)
  }

  /**
   * Utility Methods
   */
  
  // Check if market is open
  async isMarketOpen(): Promise<boolean> {
    try {
      const response = await this.getClock()
      return response.success && response.data?.is_open || false
    } catch {
      return false
    }
  }

  // Get current buying power
  async getBuyingPower(): Promise<number> {
    try {
      const response = await this.getAccount()
      return response.success ? parseFloat(response.data?.buying_power || '0') : 0
    } catch {
      return 0
    }
  }

  // Get portfolio value
  async getPortfolioValue(): Promise<number> {
    try {
      const response = await this.getAccount()
      return response.success ? parseFloat(response.data?.portfolio_value || '0') : 0
    } catch {
      return 0
    }
  }

  // Calculate position value
  calculatePositionValue(position: AlpacaPosition): number {
    return parseFloat(position.market_value || '0')
  }

  // Calculate unrealized P&L
  calculateUnrealizedPL(position: AlpacaPosition): number {
    return parseFloat(position.unrealized_pl || '0')
  }

  // Calculate unrealized P&L percentage
  calculateUnrealizedPLPercent(position: AlpacaPosition): number {
    return parseFloat(position.unrealized_plpc || '0') * 100
  }
}

// Export singleton instance
export const alpacaBrokerClient = new AlpacaBrokerClient()
export default alpacaBrokerClient