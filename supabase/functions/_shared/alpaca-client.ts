// Add Deno types reference
/// <reference lib="deno.ns" />

import type { AuthContext } from './auth.ts'

export interface AlpacaRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, any>
  params?: Record<string, string>
}

export interface AlpacaResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    status: number
    message: string
    code: string
    details?: any
  }
}

// Alpaca API Types
export interface AlpacaAccount {
  id: string
  account_number: string
  status: string
  crypto_status?: string
  currency: string
  buying_power: string
  regt_buying_power: string
  daytrading_buying_power: string
  non_marginable_buying_power: string
  cash: string
  accrued_fees: string
  pending_transfer_out: string
  pending_transfer_in: string
  portfolio_value: string
  pattern_day_trader: boolean
  pdt_removed?: boolean
  pdt_removed_at?: string
  trading_blocked: boolean
  transfers_blocked: boolean
  account_blocked: boolean
  created_at: string
  trade_suspended_by_user: boolean
  multiplier: string
  shorting_enabled: boolean
  equity: string
  last_equity: string
  long_market_value: string
  short_market_value: string
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
  asset_marginable: boolean
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
  filled_at?: string
  expired_at?: string
  canceled_at?: string
  failed_at?: string
  replaced_at?: string
  replaced_by?: string
  replaces?: string
  asset_id: string
  symbol: string
  asset_class: string
  notional?: string
  qty?: string
  filled_qty: string
  filled_avg_price?: string
  order_class: string
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'
  side: 'buy' | 'sell'
  time_in_force: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok'
  limit_price?: string
  stop_price?: string
  status: 'new' | 'partially_filled' | 'filled' | 'done_for_day' | 'canceled' | 'expired' | 'replaced' | 'pending_cancel' | 'pending_replace' | 'accepted' | 'pending_new' | 'accepted_for_bidding' | 'stopped' | 'rejected' | 'suspended' | 'calculated'
  extended_hours: boolean
  legs?: AlpacaOrder[]
  trail_percent?: string
  trail_price?: string
  hwm?: string
}

export interface CreateOrderRequest {
  symbol: string
  qty?: string
  notional?: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'
  time_in_force: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok'
  limit_price?: string
  stop_price?: string
  trail_price?: string
  trail_percent?: string
  extended_hours?: boolean
  client_order_id?: string
  order_class?: 'simple' | 'bracket' | 'oco' | 'oto'
  take_profit?: {
    limit_price: string
  }
  stop_loss?: {
    stop_price: string
    limit_price?: string
  }
}

export interface AlpacaAsset {
  id: string
  class: 'us_equity' | 'crypto' | 'us_option'
  exchange: string
  symbol: string
  name: string
  status: 'active' | 'inactive'
  tradable: boolean
  marginable: boolean
  shortable: boolean
  easy_to_borrow: boolean
  fractionable: boolean
  min_order_size?: string
  min_trade_increment?: string
  price_increment?: string
  maintenance_margin_requirement?: string
  attributes?: string[]
}

export interface TradingConfiguration {
  dtbp_check: 'entry' | 'exit' | 'both'
  trade_confirm_email: 'all' | 'none'
  suspend_trade: boolean
  no_shorting: boolean
  fractional_trading: boolean
  max_margin_multiplier: string
  pdt_check: 'entry' | 'exit' | 'both'
  ptp_no_exception_entry: boolean
  max_options_trading_level: number
}

/**
 * Get Alpaca credentials for a user
 * @param userId The user ID
 * @param userEmail The user email
 * @returns Promise with credentials or null if not found
 */
export async function getAlpacaCredentials(userId: string, userEmail: string) {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user's Alpaca account info
    const { data: alpacaAccount, error } = await supabase
      .from('alpaca_accounts')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !alpacaAccount) {
      console.log(`No Alpaca account found for user ${userEmail}`)
      return null
    }

    return {
      accountId: alpacaAccount.alpaca_account_id,
      accountNumber: alpacaAccount.alpaca_account_number,
      status: alpacaAccount.alpaca_account_status,
      accountType: alpacaAccount.account_type
    }
  } catch (error) {
    console.error('Error getting Alpaca credentials:', error)
    return null
  }
}

/**
 * Shared Alpaca API client for Edge Functions
 * Handles credential management, request formatting, and error handling
 */
export class AlpacaClient {
  private authContext: AuthContext
  private baseUrl: string
  private dataBaseUrl: string
  private tradingBaseUrl: string
  private logger: (message: string, data?: any) => void

  /**
   * Creates a new Alpaca API client
   * @param authContext The authenticated user context
   * @param logger Optional logging function
   */
  constructor(
    authContext: AuthContext,
    logger: (message: string, data?: any) => void = console.log
  ) {
    this.authContext = authContext
    this.logger = logger

    // Set base URLs based on trading mode
    if (authContext.tradingMode === 'paper') {
      this.baseUrl = Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL') || 'https://broker-api.sandbox.alpaca.markets'
      this.dataBaseUrl = Deno.env.get('PUBLIC_ALPACA_DATA_SANDBOX_BASE_URL') || 'https://data.sandbox.alpaca.markets'
      this.tradingBaseUrl = Deno.env.get('PUBLIC_ALPACA_TRADING_SANDBOX_BASE_URL') || 'https://paper-api.alpaca.markets'
    } else {
      this.baseUrl = Deno.env.get('PUBLIC_ALPACA_BROKER_LIVE_BASE_URL') || 'https://broker-api.alpaca.markets'
      this.dataBaseUrl = Deno.env.get('PUBLIC_ALPACA_DATA_LIVE_BASE_URL') || 'https://data.alpaca.markets'
      this.tradingBaseUrl = Deno.env.get('PUBLIC_ALPACA_TRADING_LIVE_BASE_URL') || 'https://api.alpaca.markets'
    }
  }

  /**
   * Makes a request to the Alpaca Broker API
   * @param endpoint The API endpoint (without base URL)
   * @param options Request options
   * @returns Promise with the API response
   */
  async brokerRequest<T = any>(
    endpoint: string,
    options: AlpacaRequestOptions = {}
  ): Promise<AlpacaResponse<T>> {
    return this.request<T>(`${this.baseUrl}${endpoint}`, options)
  }

  /**
   * Makes a request to the Alpaca Data API
   * @param endpoint The API endpoint (without base URL)
   * @param options Request options
   * @returns Promise with the API response
   */
  async dataRequest<T = any>(
    endpoint: string,
    options: AlpacaRequestOptions = {}
  ): Promise<AlpacaResponse<T>> {
    return this.request<T>(`${this.dataBaseUrl}${endpoint}`, options)
  }

  /**
   * Makes a request to the Alpaca Trading API
   * @param endpoint The API endpoint (without base URL)
   * @param options Request options
   * @returns Promise with the API response
   */
  async tradingRequest<T = any>(
    endpoint: string,
    options: AlpacaRequestOptions = {}
  ): Promise<AlpacaResponse<T>> {
    return this.request<T>(`${this.tradingBaseUrl}${endpoint}`, options)
  }

  /**
   * Makes a request to the Alpaca API
   * @param url The full API URL
   * @param options Request options
   * @returns Promise with the API response
   */
  private async request<T = any>(
    url: string,
    { method = 'GET', body, params }: AlpacaRequestOptions
  ): Promise<AlpacaResponse<T>> {
    try {
      // Add query parameters if provided
      if (params) {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value)
          }
        })

        const queryString = queryParams.toString()
        if (queryString) {
          url = `${url}${url.includes('?') ? '&' : '?'}${queryString}`
        }
      }

      // Get Alpaca API credentials based on trading mode
      const apiKey = this.authContext.tradingMode === 'paper'
        ? Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY')
        : Deno.env.get('PUBLIC_ALPACA_BROKER_LIVE_API_KEY')

      const apiSecret = this.authContext.tradingMode === 'paper'
        ? Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET')
        : Deno.env.get('PUBLIC_ALPACA_BROKER_LIVE_API_SECRET')

      // Log request details
      this.logger('Alpaca API Request', {
        url,
        method,
        tradingMode: this.authContext.tradingMode,
        userId: this.authContext.userId,
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        authMethod: 'Basic',
        body: body ? JSON.stringify(body) : undefined
      })

      if (!apiKey || !apiSecret) {
        throw new Error(`Missing Alpaca API credentials for ${this.authContext.tradingMode} mode`)
      }

      // Use HTTP Basic authentication as required by Broker API
      const credentials = `${apiKey}:${apiSecret}`
      const encodedCredentials = btoa(credentials)

      // Prepare request options
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Authorization': `Basic ${encodedCredentials}`,
          'Content-Type': 'application/json',
        }
      }

      // Add body if provided
      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        requestOptions.body = JSON.stringify(body)
      }

      // Make the request
      const startTime = Date.now()
      const response = await fetch(url, requestOptions)
      const responseTime = Date.now() - startTime

      // Parse response
      let data: T | undefined
      let errorText: string | undefined

      if (response.status !== 204) { // No content
        try {
          if (response.headers.get('Content-Type')?.includes('application/json')) {
            data = await response.json() as T
          } else {
            errorText = await response.text()
          }
        } catch (e) {
          errorText = 'Failed to parse response'
        }
      }

      // Log response details
      this.logger('Alpaca API Response', {
        url,
        method,
        status: response.status,
        responseTime,
        success: response.ok,
        data: data ? JSON.stringify(data).substring(0, 500) : undefined,
        error: !response.ok ? errorText : undefined
      })

      // Return formatted response
      if (!response.ok) {
        return {
          success: false,
          error: {
            status: response.status,
            message: errorText || `Alpaca API error: ${response.status}`,
            code: 'ALPACA_API_ERROR',
            details: data
          }
        }
      }

      return {
        success: true,
        data
      }
    } catch (error) {
      // Log and handle unexpected errors
      this.logger('Alpaca API Error', {
        url,
        method,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'ALPACA_REQUEST_FAILED'
        }
      }
    }
  }

  // =============================================================================
  // BROKER API METHODS - Based on Alpaca Broker API Postman Collection
  // =============================================================================

  // =============================================================================
  // ASSETS & SECURITIES
  // =============================================================================

  /**
   * Get all available assets/securities
   * GET /v1/assets
   */
  async getAssets(params?: {
    status?: 'active' | 'inactive'
    asset_class?: 'us_equity' | 'crypto' | 'us_option'
    exchange?: string
    attributes?: string
  }): Promise<AlpacaResponse<AlpacaAsset[]>> {
    return this.brokerRequest<AlpacaAsset[]>('/v1/assets', { params })
  }

  /**
   * Get a specific asset by symbol or asset ID
   * GET /v1/assets/{symbol_or_asset_id}
   */
  async getAsset(symbolOrAssetId: string): Promise<AlpacaResponse<AlpacaAsset>> {
    return this.brokerRequest<AlpacaAsset>(`/v1/assets/${symbolOrAssetId}`)
  }

  // =============================================================================
  // ACCOUNTS MANAGEMENT
  // =============================================================================

  /**
   * Get all accounts with optional filtering
   * GET /v1/accounts
   */
  async getAccounts(params?: {
    query?: string
    created_after?: string
    created_before?: string
    status?: string
    sort?: string
    entities?: string
  }): Promise<AlpacaResponse<AlpacaAccount[]>> {
    return this.brokerRequest<AlpacaAccount[]>('/v1/accounts', { params })
  }

  /**
   * Get account information (basic metadata only)
   * GET /v1/accounts/{account_id}
   */
  async getAccount(accountId: string): Promise<AlpacaResponse<AlpacaAccount>> {
    return this.brokerRequest<AlpacaAccount>(`/v1/accounts/${accountId}`)
  }

  /**
   * Get trading account details with financial information (Broker API)
   * GET /v1/trading/accounts/{account_id}/account
   * This returns buying_power, cash, portfolio_value, equity, etc.
   */
  async getTradingAccount(accountId: string): Promise<AlpacaResponse<AlpacaAccount>> {
    return this.brokerRequest<AlpacaAccount>(`/v1/trading/accounts/${accountId}/account`)
  }

  /**
   * Update account information
   * PATCH /v1/accounts/{account_id}
   */
  async updateAccount(
    accountId: string,
    updates: {
      contact?: {
        email_address?: string
        phone_number?: string
        street_address?: string[]
        city?: string
        state?: string
        postal_code?: string
      }
      identity?: {
        given_name?: string
        family_name?: string
        date_of_birth?: string
        country_of_citizenship?: string
        funding_source?: string[]
      }
      disclosures?: {
        is_control_person?: boolean
        is_affiliated_exchange_or_finra?: boolean
        is_politically_exposed?: boolean
        immediate_family_exposed?: boolean
      }
      trusted_contact?: {
        given_name?: string
        family_name?: string
        email_address?: string
      }
    }
  ): Promise<AlpacaResponse<AlpacaAccount>> {
    return this.brokerRequest<AlpacaAccount>(`/v1/accounts/${accountId}`, {
      method: 'PATCH',
      body: updates
    })
  }

  /**
   * Close an account
   * DELETE /v1/accounts/{account_id}
   */
  async closeAccount(accountId: string): Promise<AlpacaResponse<void>> {
    return this.brokerRequest<void>(`/v1/accounts/${accountId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Request options approval for an account
   * POST /v1/accounts/{account_id}/options_approval
   * 
   * @param accountId The account ID
   * @param level Options approval level (0-3)
   * @param fixtures Optional sandbox fixtures for testing (sandbox only)
   */
  async requestOptionsApproval(
    accountId: string,
    level: number,
    fixtures?: { status: 'APPROVED' | 'REJECTED' | 'LOWER_LEVEL_APPROVED'; level?: number }
  ): Promise<AlpacaResponse<{ status: string; level: number }>> {
    const body: any = { level }
    
    // Add fixtures for sandbox testing
    if (fixtures) {
      body.fixtures = fixtures
    }
    
    return this.brokerRequest<{ status: string; level: number }>(
      `/v1/accounts/${accountId}/options/approval`,
      {
        method: 'POST',
        body
      }
    )
  }

  /**
   * Get account portfolio history
   * GET /v1/trading/accounts/{account_id}/account/portfolio/history
   */
  async getPortfolioHistory(
    accountId: string,
    params?: {
      period?: '1D' | '7D' | '1M' | '3M' | '6M' | '1A' | '2A' | '5A' | 'all'
      timeframe?: '1Min' | '5Min' | '15Min' | '1H' | '1D'
      end_date?: string
      extended_hours?: boolean
    }
  ): Promise<AlpacaResponse<any>> {
    return this.brokerRequest(`/v1/trading/accounts/${accountId}/account/portfolio/history`, { params })
  }

  /**
   * Get account activities with pagination support
   * GET /v1/accounts/{account_id}/activities
   */
  async getActivities(
    accountId: string,
    params?: {
      activity_types?: string
      date?: string
      until?: string
      after?: string
      direction?: 'asc' | 'desc'
      page_size?: string
      page_token?: string
    }
  ): Promise<AlpacaResponse<any[]>> {
    return this.brokerRequest<any[]>(`/v1/accounts/${accountId}/activities`, { params })
  }

  // =============================================================================
  // TRADING OPERATIONS
  // =============================================================================

  /**
   * Get all positions for an account
   * GET /v1/trading/accounts/{account_id}/positions
   */
  async getPositions(accountId: string, params?: Record<string, string>): Promise<AlpacaResponse<AlpacaPosition[]>> {
    return this.brokerRequest<AlpacaPosition[]>(`/v1/trading/accounts/${accountId}/positions`, { params })
  }

  /**
   * Get a specific position
   * GET /v1/trading/accounts/{account_id}/positions/{symbol_or_asset_id}
   */
  async getPosition(accountId: string, symbolOrAssetId: string): Promise<AlpacaResponse<AlpacaPosition>> {
    return this.brokerRequest<AlpacaPosition>(`/v1/trading/accounts/${accountId}/positions/${symbolOrAssetId}`)
  }

  /**
   * Close all positions
   * DELETE /v1/trading/accounts/{account_id}/positions
   */
  async closeAllPositions(accountId: string, cancelOrders?: boolean): Promise<AlpacaResponse<any>> {
    const params = cancelOrders ? { cancel_orders: 'true' } : undefined
    return this.brokerRequest(`/v1/trading/accounts/${accountId}/positions`, {
      method: 'DELETE',
      params
    })
  }

  /**
   * Close a specific position
   * DELETE /v1/trading/accounts/{account_id}/positions/{symbol_or_asset_id}
   */
  async closePosition(
    accountId: string,
    symbolOrAssetId: string,
    qty?: string,
    percentage?: string
  ): Promise<AlpacaResponse<AlpacaOrder>> {
    const body: any = {}
    if (qty) body.qty = qty
    if (percentage) body.percentage = percentage

    return this.brokerRequest<AlpacaOrder>(`/v1/trading/accounts/${accountId}/positions/${symbolOrAssetId}`, {
      method: 'DELETE',
      body: Object.keys(body).length > 0 ? body : undefined
    })
  }

  /**
   * Get all orders for an account
   * GET /v1/trading/accounts/{account_id}/orders
   */
  async getOrders(
    accountId: string,
    params?: {
      status?: 'open' | 'closed' | 'all'
      limit?: number
      after?: string
      until?: string
      direction?: 'asc' | 'desc'
      nested?: boolean
      symbols?: string
    }
  ): Promise<AlpacaResponse<AlpacaOrder[]>> {
    return this.brokerRequest<AlpacaOrder[]>(`/v1/trading/accounts/${accountId}/orders`, { params })
  }

  /**
   * Create a new order
   * POST /v1/trading/accounts/{account_id}/orders
   */
  async createOrder(accountId: string, orderData: CreateOrderRequest): Promise<AlpacaResponse<AlpacaOrder>> {
    return this.brokerRequest<AlpacaOrder>(`/v1/trading/accounts/${accountId}/orders`, {
      method: 'POST',
      body: orderData
    })
  }

  /**
   * Get a specific order
   * GET /v1/trading/accounts/{account_id}/orders/{order_id}
   */
  async getOrder(accountId: string, orderId: string): Promise<AlpacaResponse<AlpacaOrder>> {
    return this.brokerRequest<AlpacaOrder>(`/v1/trading/accounts/${accountId}/orders/${orderId}`)
  }

  /**
   * Replace an order
   * PATCH /v1/trading/accounts/{account_id}/orders/{order_id}
   */
  async replaceOrder(
    accountId: string,
    orderId: string,
    orderData: Partial<CreateOrderRequest>
  ): Promise<AlpacaResponse<AlpacaOrder>> {
    return this.brokerRequest<AlpacaOrder>(`/v1/trading/accounts/${accountId}/orders/${orderId}`, {
      method: 'PATCH',
      body: orderData
    })
  }

  /**
   * Cancel an order
   * DELETE /v1/trading/accounts/{account_id}/orders/{order_id}
   */
  async cancelOrder(accountId: string, orderId: string): Promise<AlpacaResponse<void>> {
    return this.brokerRequest<void>(`/v1/trading/accounts/${accountId}/orders/${orderId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Cancel all orders
   * DELETE /v1/trading/accounts/{account_id}/orders
   */
  async cancelAllOrders(accountId: string): Promise<AlpacaResponse<any>> {
    return this.brokerRequest(`/v1/trading/accounts/${accountId}/orders`, {
      method: 'DELETE'
    })
  }

  // =============================================================================
  // ACCOUNT CONFIGURATION
  // =============================================================================

  /**
   * Get account configuration
   * GET /v1/accounts/{account_id}/account/configurations
   */
  async getAccountConfiguration(accountId: string): Promise<AlpacaResponse<TradingConfiguration>> {
    return this.brokerRequest<TradingConfiguration>(`/v1/accounts/${accountId}/account/configurations`)
  }

  /**
   * Update account configuration
   * PATCH /v1/accounts/{account_id}/account/configurations
   */
  async updateAccountConfiguration(
    accountId: string,
    config: Partial<TradingConfiguration>
  ): Promise<AlpacaResponse<TradingConfiguration>> {
    return this.brokerRequest<TradingConfiguration>(`/v1/accounts/${accountId}/account/configurations`, {
      method: 'PATCH',
      body: config
    })
  }

  // =============================================================================
  // PATTERN DAY TRADER (PDT) MANAGEMENT
  // =============================================================================

  /**
   * Remove Pattern Day Trader (PDT) flag from an account (one-time only)
   * POST /v1/accounts/{account_id}/pdt_removal
   * 
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  async removePDTFlag(accountId: string): Promise<AlpacaResponse<{ message: string; pdt_removed: boolean; pdt_removed_at: string }>> {
    return this.brokerRequest<{ message: string; pdt_removed: boolean; pdt_removed_at: string }>(
      `/v1/accounts/${accountId}/pdt_removal`,
      {
        method: 'POST'
      }
    )
  }

  // =============================================================================
  // WATCHLISTS
  // =============================================================================

  /**
   * Get watchlists
   * GET /v1/accounts/{account_id}/watchlists
   */
  async getWatchlists(accountId: string): Promise<AlpacaResponse<any[]>> {
    return this.brokerRequest<any[]>(`/v1/accounts/${accountId}/watchlists`)
  }

  /**
   * Create a watchlist
   * POST /v1/accounts/{account_id}/watchlists
   */
  async createWatchlist(
    accountId: string,
    watchlist: { name: string; symbols?: string[] }
  ): Promise<AlpacaResponse<any>> {
    return this.brokerRequest(`/v1/accounts/${accountId}/watchlists`, {
      method: 'POST',
      body: watchlist
    })
  }

  /**
   * Get a specific watchlist
   * GET /v1/accounts/{account_id}/watchlists/{watchlist_id}
   */
  async getWatchlist(accountId: string, watchlistId: string): Promise<AlpacaResponse<any>> {
    return this.brokerRequest(`/v1/accounts/${accountId}/watchlists/${watchlistId}`)
  }

  /**
   * Update a watchlist
   * PUT /v1/accounts/{account_id}/watchlists/{watchlist_id}
   */
  async updateWatchlist(
    accountId: string,
    watchlistId: string,
    watchlist: { name: string; symbols?: string[] }
  ): Promise<AlpacaResponse<any>> {
    return this.brokerRequest(`/v1/accounts/${accountId}/watchlists/${watchlistId}`, {
      method: 'PUT',
      body: watchlist
    })
  }

  /**
   * Delete a watchlist
   * DELETE /v1/accounts/{account_id}/watchlists/{watchlist_id}
   */
  async deleteWatchlist(accountId: string, watchlistId: string): Promise<AlpacaResponse<void>> {
    return this.brokerRequest<void>(`/v1/accounts/${accountId}/watchlists/${watchlistId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Add symbol to watchlist
   * POST /v1/accounts/{account_id}/watchlists/{watchlist_id}
   */
  async addToWatchlist(
    accountId: string,
    watchlistId: string,
    symbol: string
  ): Promise<AlpacaResponse<any>> {
    return this.brokerRequest(`/v1/accounts/${accountId}/watchlists/${watchlistId}`, {
      method: 'POST',
      body: { symbol }
    })
  }

  /**
   * Remove symbol from watchlist
   * DELETE /v1/accounts/{account_id}/watchlists/{watchlist_id}/{symbol}
   */
  async removeFromWatchlist(
    accountId: string,
    watchlistId: string,
    symbol: string
  ): Promise<AlpacaResponse<void>> {
    return this.brokerRequest<void>(`/v1/accounts/${accountId}/watchlists/${watchlistId}/${symbol}`, {
      method: 'DELETE'
    })
  }

  // =============================================================================
  // DOCUMENT MANAGEMENT
  // =============================================================================

  /**
   * Upload a document for an account
   * POST /v1/accounts/{account_id}/documents/upload
   */
  async uploadDocument(
    accountId: string,
    document: {
      document_type: 'identity_verification' | 'address_verification' | 'w8ben' | 'other'
      document_sub_type?: string
      content: string // base64 encoded
      mime_type: 'application/pdf' | 'image/jpeg' | 'image/png'
    }
  ): Promise<AlpacaResponse<{ id: string; document_type: string; created_at: string }>> {
    return this.brokerRequest(`/v1/accounts/${accountId}/documents/upload`, {
      method: 'POST',
      body: document
    })
  }

  /**
   * List all documents for an account
   * GET /v1/accounts/{account_id}/documents
   */
  async listDocuments(accountId: string): Promise<AlpacaResponse<any[]>> {
    return this.brokerRequest<any[]>(`/v1/accounts/${accountId}/documents`)
  }

  /**
   * Get a specific document (returns pre-signed URL)
   * GET /v1/accounts/{account_id}/documents/{document_id}
   */
  async getDocument(accountId: string, documentId: string): Promise<AlpacaResponse<{ download_url: string }>> {
    return this.brokerRequest<{ download_url: string }>(`/v1/accounts/${accountId}/documents/${documentId}`)
  }

  // =============================================================================
  // BANK RELATIONSHIPS
  // =============================================================================

  /**
   * Create a bank relationship for an account
   * POST /v1/accounts/{account_id}/recipient_banks
   */
  async createBankRelationship(
    accountId: string,
    bankData: {
      name: string
      bank_code: string
      bank_code_type: 'aba' | 'bic' | 'ABA' | 'BIC'
      account_number: string
      country?: string
      state_province?: string
      postal_code?: string
      city?: string
      street_address?: string
    }
  ): Promise<AlpacaResponse<any>> {
    return this.brokerRequest(`/v1/accounts/${accountId}/recipient_banks`, {
      method: 'POST',
      body: bankData
    })
  }

  /**
   * List all bank relationships for an account
   * GET /v1/accounts/{account_id}/recipient_banks
   */
  async listBankRelationships(
    accountId: string,
    params?: {
      status?: string
      bank_name?: string
    }
  ): Promise<AlpacaResponse<any[]>> {
    return this.brokerRequest<any[]>(`/v1/accounts/${accountId}/recipient_banks`, { params })
  }

  /**
   * Delete a bank relationship
   * DELETE /v1/accounts/{account_id}/recipient_banks/{bank_id}
   */
  async deleteBankRelationship(accountId: string, bankId: string): Promise<AlpacaResponse<void>> {
    return this.brokerRequest<void>(`/v1/accounts/${accountId}/recipient_banks/${bankId}`, {
      method: 'DELETE'
    })
  }

  // =============================================================================
  // ACH RELATIONSHIPS
  // =============================================================================

  /**
   * Create an ACH relationship for an account
   * POST /v1/accounts/{account_id}/ach_relationships
   * Note: Alpaca requires bank_account_type to be uppercase (CHECKING or SAVINGS)
   */
  async createACHRelationship(
    accountId: string,
    achData: {
      account_owner_name: string
      bank_account_type: 'CHECKING' | 'SAVINGS' | 'checking' | 'savings'
      bank_account_number: string
      bank_routing_number: string
      nickname?: string
      processor_token?: string // For Plaid integration
    }
  ): Promise<AlpacaResponse<any>> {
    // Normalize bank_account_type to uppercase for Alpaca API
    const normalizedData = {
      ...achData,
      bank_account_type: achData.bank_account_type.toUpperCase() as 'CHECKING' | 'SAVINGS'
    }
    
    return this.brokerRequest(`/v1/accounts/${accountId}/ach_relationships`, {
      method: 'POST',
      body: normalizedData
    })
  }

  /**
   * List all ACH relationships for an account
   * GET /v1/accounts/{account_id}/ach_relationships
   */
  async listACHRelationships(
    accountId: string,
    params?: {
      status?: string
    }
  ): Promise<AlpacaResponse<any[]>> {
    return this.brokerRequest<any[]>(`/v1/accounts/${accountId}/ach_relationships`, { params })
  }

  /**
   * Delete an ACH relationship
   * DELETE /v1/accounts/{account_id}/ach_relationships/{ach_relationship_id}
   */
  async deleteACHRelationship(accountId: string, achRelationshipId: string): Promise<AlpacaResponse<void>> {
    return this.brokerRequest<void>(`/v1/accounts/${accountId}/ach_relationships/${achRelationshipId}`, {
      method: 'DELETE'
    })
  }

  // =============================================================================
  // TRANSFER OPERATIONS
  // =============================================================================

  /**
   * Create a transfer (ACH, wire, or sandbox)
   * POST /v1/accounts/{account_id}/transfers
   */
  async createTransfer(
    accountId: string,
    transferData: {
      transfer_type: 'ach' | 'wire' | 'sandbox'
      amount: string
      direction: 'INCOMING' | 'OUTGOING'
      timing?: 'immediate' | 'next_day'
      relationship_id?: string
      bank_id?: string
      additional_information?: string
      fee_payment_method?: 'user' | 'invoice'
    }
  ): Promise<AlpacaResponse<any>> {
    return this.brokerRequest(`/v1/accounts/${accountId}/transfers`, {
      method: 'POST',
      body: transferData
    })
  }

  /**
   * List all transfers for an account
   * GET /v1/accounts/{account_id}/transfers
   */
  async listTransfers(
    accountId: string,
    params?: {
      direction?: 'INCOMING' | 'OUTGOING'
      limit?: string
      offset?: string
    }
  ): Promise<AlpacaResponse<any[]>> {
    return this.brokerRequest<any[]>(`/v1/accounts/${accountId}/transfers`, { params })
  }

  /**
   * Cancel a pending transfer
   * DELETE /v1/accounts/{account_id}/transfers/{transfer_id}
   */
  async cancelTransfer(accountId: string, transferId: string): Promise<AlpacaResponse<void>> {
    return this.brokerRequest<void>(`/v1/accounts/${accountId}/transfers/${transferId}`, {
      method: 'DELETE'
    })
  }

  // =============================================================================
  // OPTIONS TRADING
  // =============================================================================

  /**
   * Exercise an option position
   * POST /v1/trading/accounts/{account_id}/options/exercise
   * 
   * Requirements: 7.3, 7.4, 7.5
   */
  async exerciseOption(
    accountId: string,
    symbolOrContractId: string
  ): Promise<AlpacaResponse<{ message: string; symbol: string }>> {
    return this.brokerRequest<{ message: string; symbol: string }>(
      `/v1/trading/accounts/${accountId}/options/exercise`,
      {
        method: 'POST',
        body: { symbol_or_contract_id: symbolOrContractId }
      }
    )
  }

  // =============================================================================
  // CORPORATE ACTIONS
  // =============================================================================

  /**
   * Get corporate action announcements with filtering
   * GET /v1/corporate_actions/announcements
   * 
   * Requirements: 8.1, 8.2, 8.3, 8.4
   */
  async getCorporateActions(params?: {
    ca_types?: string
    symbol?: string
    cusip?: string
    date_type?: 'declaration_date' | 'ex_date' | 'record_date' | 'payable_date'
    since?: string
    until?: string
    page_token?: string
    page_size?: string
  }): Promise<AlpacaResponse<any[]>> {
    return this.brokerRequest<any[]>('/v1/corporate_actions/announcements', { params })
  }

  /**
   * Get a specific corporate action announcement by ID
   * GET /v1/corporate_actions/announcements/{id}
   * 
   * Requirements: 8.1, 8.2, 8.3, 8.4
   */
  async getCorporateAction(announcementId: string): Promise<AlpacaResponse<any>> {
    return this.brokerRequest<any>(`/v1/corporate_actions/announcements/${announcementId}`)
  }

  // =============================================================================
  // JOURNAL OPERATIONS
  // =============================================================================

  /**
   * Create a journal entry (JNLC for cash or JNLS for securities)
   * POST /v1/journals
   * 
   * Requirements: 11.1, 11.2, 11.3
   */
  async createJournal(journalData: {
    entry_type: 'JNLC' | 'JNLS'
    from_account: string
    to_account: string
    amount?: string // Required for JNLC
    symbol?: string // Required for JNLS
    qty?: string // Required for JNLS
    description?: string
  }): Promise<AlpacaResponse<any>> {
    return this.brokerRequest('/v1/journals', {
      method: 'POST',
      body: journalData
    })
  }

  /**
   * Create batch journal entries (one-to-many or many-to-one)
   * POST /v1/journals/batch
   * 
   * Requirements: 11.3
   */
  async createBatchJournals(batchData: {
    entry_type: 'JNLC'
    from_account?: string // For one-to-many
    to_account?: string // For many-to-one
    entries: Array<{
      from_account?: string
      to_account?: string
      amount: string
    }>
    description?: string
  }): Promise<AlpacaResponse<any>> {
    return this.brokerRequest('/v1/journals/batch', {
      method: 'POST',
      body: batchData
    })
  }

  /**
   * List all journals with optional filtering
   * GET /v1/journals
   * 
   * Requirements: 11.1, 11.2, 11.3
   */
  async listJournals(params?: {
    after?: string
    before?: string
    status?: 'pending' | 'executed' | 'canceled' | 'rejected'
    entry_type?: 'JNLC' | 'JNLS'
    to_account?: string
    from_account?: string
  }): Promise<AlpacaResponse<any[]>> {
    return this.brokerRequest<any[]>('/v1/journals', { params })
  }

  /**
   * Cancel a pending journal entry
   * DELETE /v1/journals/{journal_id}
   * 
   * Requirements: 11.4, 11.5
   */
  async cancelJournal(journalId: string): Promise<AlpacaResponse<void>> {
    return this.brokerRequest<void>(`/v1/journals/${journalId}`, {
      method: 'DELETE'
    })
  }

  // =============================================================================
  // KYC/CIP INTEGRATION
  // =============================================================================

  /**
   * Upload CIP (Customer Identification Program) information
   * POST /v1/accounts/{account_id}/cip
   * 
   * Requirements: 15.1, 15.2
   */
  async uploadCIP(
    accountId: string,
    cipData: {
      provider_name: string
      kyc?: Record<string, any>
      document?: Record<string, any>
      photo?: Record<string, any>
      identity?: Record<string, any>
      watchlist?: Record<string, any>
    }
  ): Promise<AlpacaResponse<{
    id: string
    status: string
    provider_name: string
    created_at: string
  }>> {
    return this.brokerRequest(`/v1/accounts/${accountId}/cip`, {
      method: 'POST',
      body: cipData
    })
  }

  /**
   * Get CIP verification results for an account
   * GET /v1/accounts/{account_id}/cip
   * 
   * Requirements: 15.2, 15.4
   */
  async getCIP(accountId: string): Promise<AlpacaResponse<{
    id: string
    status: string
    provider_name: string
    risk_level?: string
    verification_results?: Record<string, any>
    failure_reasons?: string[]
    created_at: string
    completed_at?: string
  }>> {
    return this.brokerRequest(`/v1/accounts/${accountId}/cip`)
  }

  /**
   * Generate Onfido SDK token for identity verification
   * POST /v1/accounts/{account_id}/cip/onfido/sdk_token
   * 
   * Requirements: 15.3
   */
  async generateOnfidoSDKToken(
    accountId: string,
    referrer?: string
  ): Promise<AlpacaResponse<{
    sdk_token: string
    applicant_id: string
    expires_at: string
  }>> {
    return this.brokerRequest(`/v1/accounts/${accountId}/cip/onfido/sdk_token`, {
      method: 'POST',
      body: referrer ? { referrer } : {}
    })
  }

  /**
   * Submit Onfido verification outcome
   * POST /v1/accounts/{account_id}/cip/onfido/outcome
   * 
   * Requirements: 15.3, 15.4
   */
  async submitOnfidoOutcome(
    accountId: string,
    outcomeData: {
      applicant_id: string
      check_id: string
      result: 'clear' | 'consider' | 'rejected'
      sub_result?: string
      breakdown?: Record<string, any>
    }
  ): Promise<AlpacaResponse<{
    status: string
    message: string
  }>> {
    return this.brokerRequest(`/v1/accounts/${accountId}/cip/onfido/outcome`, {
      method: 'POST',
      body: outcomeData
    })
  }

  // =============================================================================
  // OAUTH CLIENT MANAGEMENT
  // =============================================================================

  /**
   * Get OAuth client details
   * GET /v1/oauth/clients/{client_id}
   * 
   * Requirements: 14.1
   */
  async getOAuthClient(clientId: string): Promise<AlpacaResponse<{
    id: string
    name: string
    redirect_uris: string[]
    logo_uri?: string
    policy_uri?: string
    tos_uri?: string
    description?: string
    created_at: string
    updated_at: string
  }>> {
    return this.brokerRequest(`/v1/oauth/clients/${clientId}`)
  }

  /**
   * Authorize OAuth request and generate authorization code
   * POST /v1/oauth/authorize
   * 
   * Requirements: 14.2
   */
  async authorizeOAuth(authData: {
    client_id: string
    redirect_uri: string
    response_type: 'code'
    scope: string
    state?: string
    account_id?: string
  }): Promise<AlpacaResponse<{
    code: string
    state?: string
  }>> {
    return this.brokerRequest('/v1/oauth/authorize', {
      method: 'POST',
      body: authData
    })
  }

  /**
   * Issue OAuth access token
   * POST /v1/oauth/token
   * 
   * Requirements: 14.3, 14.4
   */
  async issueOAuthToken(tokenData: {
    grant_type: 'authorization_code' | 'refresh_token'
    code?: string // Required for authorization_code
    refresh_token?: string // Required for refresh_token
    client_id: string
    client_secret: string
    redirect_uri?: string // Required for authorization_code
  }): Promise<AlpacaResponse<{
    access_token: string
    token_type: 'Bearer'
    expires_in: number
    refresh_token?: string
    scope: string
  }>> {
    return this.brokerRequest('/v1/oauth/token', {
      method: 'POST',
      body: tokenData
    })
  }

  /**
   * Revoke OAuth access token
   * POST /v1/oauth/revoke
   * 
   * Requirements: 14.5
   */
  async revokeOAuthToken(tokenData: {
    token: string
    token_type_hint?: 'access_token' | 'refresh_token'
  }): Promise<AlpacaResponse<void>> {
    return this.brokerRequest<void>('/v1/oauth/revoke', {
      method: 'POST',
      body: tokenData
    })
  }

  // =============================================================================
  // CONVENIENCE METHODS
  // =============================================================================

  /**
   * Buy stock with market order
   */
  async buyStock(
    accountId: string,
    symbol: string,
    qty: string,
    timeInForce: 'day' | 'gtc' = 'day'
  ): Promise<AlpacaResponse<AlpacaOrder>> {
    return this.createOrder(accountId, {
      symbol,
      qty,
      side: 'buy',
      type: 'market',
      time_in_force: timeInForce
    })
  }

  /**
   * Sell stock with market order
   */
  async sellStock(
    accountId: string,
    symbol: string,
    qty: string,
    timeInForce: 'day' | 'gtc' = 'day'
  ): Promise<AlpacaResponse<AlpacaOrder>> {
    return this.createOrder(accountId, {
      symbol,
      qty,
      side: 'sell',
      type: 'market',
      time_in_force: timeInForce
    })
  }

  /**
   * Buy stock with limit order
   */
  async buyStockLimit(
    accountId: string,
    symbol: string,
    qty: string,
    limitPrice: string,
    timeInForce: 'day' | 'gtc' = 'day'
  ): Promise<AlpacaResponse<AlpacaOrder>> {
    return this.createOrder(accountId, {
      symbol,
      qty,
      side: 'buy',
      type: 'limit',
      limit_price: limitPrice,
      time_in_force: timeInForce
    })
  }

  /**
   * Sell stock with limit order
   */
  async sellStockLimit(
    accountId: string,
    symbol: string,
    qty: string,
    limitPrice: string,
    timeInForce: 'day' | 'gtc' = 'day'
  ): Promise<AlpacaResponse<AlpacaOrder>> {
    return this.createOrder(accountId, {
      symbol,
      qty,
      side: 'sell',
      type: 'limit',
      limit_price: limitPrice,
      time_in_force: timeInForce
    })
  }

  // ============================================================================
  // Rebalancing API Methods
  // ============================================================================

  /**
   * Create a rebalancing portfolio
   * POST /v1/rebalancing/portfolios
   */
  async createRebalancingPortfolio(data: {
    name: string
    description?: string
    weights: Record<string, number>
    cooldown_days: number
    rebalance_conditions?: {
      drift_threshold?: number
      min_days_between?: number
    }
  }): Promise<AlpacaResponse> {
    return this.request('/v1/rebalancing/portfolios', {
      method: 'POST',
      body: data
    })
  }

  /**
   * Get rebalancing portfolio details
   * GET /v1/rebalancing/portfolios/{portfolio_id}
   */
  async getRebalancingPortfolio(portfolioId: string): Promise<AlpacaResponse> {
    return this.request(`/v1/rebalancing/portfolios/${portfolioId}`)
  }

  /**
   * List all rebalancing portfolios
   * GET /v1/rebalancing/portfolios
   */
  async listRebalancingPortfolios(): Promise<AlpacaResponse> {
    return this.request('/v1/rebalancing/portfolios')
  }

  /**
   * Update a rebalancing portfolio
   * PATCH /v1/rebalancing/portfolios/{portfolio_id}
   */
  async updateRebalancingPortfolio(
    portfolioId: string,
    data: {
      name?: string
      description?: string
      weights?: Record<string, number>
      cooldown_days?: number
      rebalance_conditions?: {
        drift_threshold?: number
        min_days_between?: number
      }
    }
  ): Promise<AlpacaResponse> {
    return this.request(`/v1/rebalancing/portfolios/${portfolioId}`, {
      method: 'PATCH',
      body: data
    })
  }

  /**
   * Delete a rebalancing portfolio
   * DELETE /v1/rebalancing/portfolios/{portfolio_id}
   */
  async deleteRebalancingPortfolio(portfolioId: string): Promise<AlpacaResponse> {
    return this.request(`/v1/rebalancing/portfolios/${portfolioId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Create a subscription to a rebalancing portfolio
   * POST /v1/rebalancing/portfolios/{portfolio_id}/subscriptions
   */
  async createRebalancingSubscription(
    portfolioId: string,
    data: {
      account_id: string
      allocation_percentage: number
    }
  ): Promise<AlpacaResponse> {
    return this.request(`/v1/rebalancing/portfolios/${portfolioId}/subscriptions`, {
      method: 'POST',
      body: data
    })
  }

  /**
   * List subscriptions for a portfolio
   * GET /v1/rebalancing/portfolios/{portfolio_id}/subscriptions
   */
  async listRebalancingSubscriptions(portfolioId: string): Promise<AlpacaResponse> {
    return this.request(`/v1/rebalancing/portfolios/${portfolioId}/subscriptions`)
  }

  /**
   * Get subscription details
   * GET /v1/rebalancing/portfolios/{portfolio_id}/subscriptions/{subscription_id}
   */
  async getRebalancingSubscription(
    portfolioId: string,
    subscriptionId: string
  ): Promise<AlpacaResponse> {
    return this.request(
      `/v1/rebalancing/portfolios/${portfolioId}/subscriptions/${subscriptionId}`
    )
  }

  /**
   * Update a subscription
   * PATCH /v1/rebalancing/portfolios/{portfolio_id}/subscriptions/{subscription_id}
   */
  async updateRebalancingSubscription(
    portfolioId: string,
    subscriptionId: string,
    data: {
      allocation_percentage?: number
      is_active?: boolean
    }
  ): Promise<AlpacaResponse> {
    return this.request(
      `/v1/rebalancing/portfolios/${portfolioId}/subscriptions/${subscriptionId}`,
      {
        method: 'PATCH',
        body: data
      }
    )
  }

  /**
   * Delete a subscription
   * DELETE /v1/rebalancing/portfolios/{portfolio_id}/subscriptions/{subscription_id}
   */
  async deleteRebalancingSubscription(
    portfolioId: string,
    subscriptionId: string
  ): Promise<AlpacaResponse> {
    return this.request(
      `/v1/rebalancing/portfolios/${portfolioId}/subscriptions/${subscriptionId}`,
      {
        method: 'DELETE'
      }
    )
  }

  /**
   * Create a rebalancing run
   * POST /v1/rebalancing/runs
   */
  async createRebalancingRun(data: {
    portfolio_id: string
    type?: 'manual' | 'automatic' | 'scheduled'
    account_ids?: string[]
  }): Promise<AlpacaResponse> {
    return this.request('/v1/rebalancing/runs', {
      method: 'POST',
      body: data
    })
  }

  /**
   * Get rebalancing run details
   * GET /v1/rebalancing/runs/{run_id}
   */
  async getRebalancingRun(runId: string): Promise<AlpacaResponse> {
    return this.request(`/v1/rebalancing/runs/${runId}`)
  }

  /**
   * List rebalancing runs
   * GET /v1/rebalancing/runs
   */
  async listRebalancingRuns(params?: {
    portfolio_id?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<AlpacaResponse> {
    return this.request('/v1/rebalancing/runs', {
      params: params as Record<string, string>
    })
  }

  /**
   * Cancel a rebalancing run
   * DELETE /v1/rebalancing/runs/{run_id}
   */
  async cancelRebalancingRun(runId: string): Promise<AlpacaResponse> {
    return this.request(`/v1/rebalancing/runs/${runId}`, {
      method: 'DELETE'
    })
  }

  // =============================================================================
  // REPORTING API
  // =============================================================================

  /**
   * Get aggregate positions across all accounts
   * GET /v1/reports/aggregate_positions
   * 
   * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
   */
  async getAggregatePositions(params?: {
    date?: string // YYYY-MM-DD format
    symbols?: string // Comma-separated list
    account_ids?: string // Comma-separated list
    include_firm_accounts?: boolean
    page_token?: string
    limit?: number
  }): Promise<AlpacaResponse<{
    positions: Array<{
      symbol: string
      asset_id: string
      asset_class: string
      total_qty: string
      total_market_value: string
      total_cost_basis: string
      total_unrealized_pl: string
      total_unrealized_plpc: string
      account_count: number
      accounts: Array<{
        account_id: string
        qty: string
        market_value: string
        cost_basis: string
        unrealized_pl: string
      }>
    }>
    next_page_token?: string
  }>> {
    const queryParams: Record<string, string> = {}
    
    if (params) {
      if (params.date) queryParams.date = params.date
      if (params.symbols) queryParams.symbols = params.symbols
      if (params.account_ids) queryParams.account_ids = params.account_ids
      if (params.include_firm_accounts !== undefined) {
        queryParams.include_firm_accounts = params.include_firm_accounts.toString()
      }
      if (params.page_token) queryParams.page_token = params.page_token
      if (params.limit) queryParams.limit = params.limit.toString()
    }

    return this.brokerRequest('/v1/reports/aggregate_positions', { params: queryParams })
  }

  /**
   * Get end-of-day positions for all accounts
   * GET /v1/reports/eod_positions
   * 
   * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
   */
  async getEODPositions(params?: {
    date: string // YYYY-MM-DD format (required)
    symbols?: string // Comma-separated list
    account_ids?: string // Comma-separated list
    include_firm_accounts?: boolean
    page_token?: string
    limit?: number
  }): Promise<AlpacaResponse<{
    date: string
    positions: Array<{
      account_id: string
      account_number: string
      symbol: string
      asset_id: string
      asset_class: string
      qty: string
      market_value: string
      cost_basis: string
      unrealized_pl: string
      unrealized_plpc: string
      avg_entry_price: string
      side: 'long' | 'short'
      exchange: string
    }>
    next_page_token?: string
  }>> {
    if (!params?.date) {
      return {
        success: false,
        error: {
          status: 400,
          message: 'Date parameter is required for EOD positions',
          code: 'MISSING_REQUIRED_PARAMETER'
        }
      }
    }

    const queryParams: Record<string, string> = {
      date: params.date
    }
    
    if (params.symbols) queryParams.symbols = params.symbols
    if (params.account_ids) queryParams.account_ids = params.account_ids
    if (params.include_firm_accounts !== undefined) {
      queryParams.include_firm_accounts = params.include_firm_accounts.toString()
    }
    if (params.page_token) queryParams.page_token = params.page_token
    if (params.limit) queryParams.limit = params.limit.toString()

    return this.brokerRequest('/v1/reports/eod_positions', { params: queryParams })
  }
}
