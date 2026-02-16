/**
 * LEADTRADE - Social Copy Trading Platform
 * Copyright (c) 2025 doctor
 * 
 * Licensed under the Fair Source License.
 * Non-commercial use permitted. Commercial use requires a paid license.
 * See LICENSE file for details or contact license@leadtrade.app
 */

// Comprehensive API service for all endpoints
import { edgeFunctionClient } from './edgeFunctionClient';
import { marketDataCache, userDataCache, cacheKeys, cacheUtils } from './cache';
import logger from './logger';

// Types for mirror trading
export interface MirrorTradingSubscription {
  id: string;
  follower_id: string;
  leader_id: string;
  allocation_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MirrorTradingStats {
  total_followers: number;
  total_following: number;
  total_mirrored_trades: number;
  success_rate: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Account & Portfolio Types
export interface AccountData {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  buying_power: number | string;
  regt_buying_power: number | string;
  daytrading_buying_power: number | string;
  cash: number | string;
  portfolio_value: number | string;
  equity: number | string;
  last_equity: number | string;
  multiplier: number | string;
  initial_margin: number | string;
  maintenance_margin: number | string;
  sma: number | string;
  daytrade_count: number;
}

export interface Position {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  qty: number;
  avg_entry_price: number;
  side: 'long' | 'short';
  market_value: number;
  cost_basis: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  unrealized_intraday_pl: number;
  unrealized_intraday_plpc: number;
  current_price: number;
  lastday_price: number;
  change_today: number;
}

export interface Order {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at?: string;
  expired_at?: string;
  canceled_at?: string;
  failed_at?: string;
  replaced_at?: string;
  replaced_by?: string;
  replaces?: string;
  asset_id: string;
  symbol: string;
  asset_class: string;
  notional?: number;
  qty: number;
  filled_qty: number;
  filled_avg_price?: number;
  order_class: string;
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  limit_price?: number;
  stop_price?: number;
  status: string;
  extended_hours: boolean;
  legs?: any[];
  trail_percent?: number;
  trail_price?: number;
  hwm?: number;
}

export interface Asset {
  id: string;
  class: string;
  exchange: string;
  symbol: string;
  name: string;
  status: string;
  tradable: boolean;
  marginable: boolean;
  shortable: boolean;
  easy_to_borrow: boolean;
  fractionable: boolean;
  attributes: string[];
}

export interface PortfolioHistory {
  timestamp: string[];
  equity: number[];
  profit_loss: number[];
  profit_loss_pct: number[];
  base_value: number;
  timeframe: string;
}

export interface MarketData {
  symbol: string;
  bars?: any[];
  quotes?: any[];
  trades?: any[];
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  totalReturn: number;
  totalReturnPercent: number;
  portfolioValue: number;
  tradesCount: number;
  winRate: number;
  rank: number;
  showAssetAmounts: boolean;
  followers?: number;
  avgHoldTime?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  tradingStyle?: 'conservative' | 'moderate' | 'active';
  lastActive?: string;
}

export interface UserProfile {
  user: any;
  profile: any;
  userDetails: any;
  alpacaAccount: any;
}

// API Service Class
class ApiService {
  // Check if user is authenticated before making API calls
  private async checkAuthentication(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      // Import auth utilities
      const { checkAuthStatus } = await import('./auth');

      // Check Supabase auth status
      const supabaseAuth = checkAuthStatus();
      logger.log('ApiService Supabase auth check:', supabaseAuth);
      return supabaseAuth;
    } catch (error) {
      logger.error('Authentication check error:', error);
      return false;
    }
  }



  // Account & Trading APIs
  async getAccount(forceRefresh = false): Promise<ApiResponse<AccountData>> {
    try {
      // Check authentication first
      const isAuthenticated = await this.checkAuthentication();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'Authentication required. Please sign in to access your account data.'
        };
      }

      // ALWAYS clear cache for now to debug
      await userDataCache.delete('account:current');

      // Use caching for account data (1 minute TTL for account info)
      const cachedData = await userDataCache.getOrSet(
        'account:current',
        async () => {
          logger.log('Fetching fresh account data from API...');
          const response = await edgeFunctionClient.get<AccountData>('alpaca-account');
          
          logger.log('Account API response:', response);
          
          if (!response.success) {
            throw new Error(response.error?.message || 'Failed to fetch account data');
          }
          
          // The response.data already contains the account data directly
          const accountData = response.data;
          
          logger.log('Raw account data from API:', accountData);
          logger.log('Account data keys:', accountData ? Object.keys(accountData) : 'null');
          
          if (!accountData) {
            throw new Error('No account data returned from API');
          }
          
          // Normalize account data - convert string numbers to actual numbers
          const normalized = {
            ...accountData,
            buying_power: typeof accountData.buying_power === 'string' ? parseFloat(accountData.buying_power) : accountData.buying_power,
            regt_buying_power: typeof accountData.regt_buying_power === 'string' ? parseFloat(accountData.regt_buying_power) : accountData.regt_buying_power,
            daytrading_buying_power: typeof accountData.daytrading_buying_power === 'string' ? parseFloat(accountData.daytrading_buying_power) : accountData.daytrading_buying_power,
            cash: typeof accountData.cash === 'string' ? parseFloat(accountData.cash) : accountData.cash,
            portfolio_value: typeof accountData.portfolio_value === 'string' ? parseFloat(accountData.portfolio_value) : accountData.portfolio_value,
            equity: typeof accountData.equity === 'string' ? parseFloat(accountData.equity) : accountData.equity,
            last_equity: typeof accountData.last_equity === 'string' ? parseFloat(accountData.last_equity) : accountData.last_equity,
            multiplier: typeof accountData.multiplier === 'string' ? parseFloat(accountData.multiplier) : accountData.multiplier,
            initial_margin: typeof accountData.initial_margin === 'string' ? parseFloat(accountData.initial_margin) : accountData.initial_margin,
            maintenance_margin: typeof accountData.maintenance_margin === 'string' ? parseFloat(accountData.maintenance_margin) : accountData.maintenance_margin,
            sma: typeof accountData.sma === 'string' ? parseFloat(accountData.sma) : accountData.sma,
          };
          
          logger.log('Normalized account data:', {
            cash: normalized.cash,
            portfolio_value: normalized.portfolio_value,
            buying_power: normalized.buying_power
          });
          
          return normalized;
        },
        60 * 1000 // 1 minute cache
      );

      return { success: true, data: cachedData };
    } catch (error) {
      logger.error('getAccount error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch account data' 
      };
    }
  }

  async getPositions(symbol?: string): Promise<ApiResponse<Position[]>> {
    try {
      // Check authentication first
      const isAuthenticated = await this.checkAuthentication();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'Authentication required. Please sign in to view your positions.'
        };
      }

      // Use caching for positions data (30 seconds TTL)
      const cacheKey = symbol ? `positions:${symbol}` : 'positions:all';
      const cachedData = await userDataCache.getOrSet(
        cacheKey,
        async () => {
          const params: Record<string, string> = {};
          if (symbol) params.symbol = symbol;

          const response = await edgeFunctionClient.get<Position[]>('alpaca-positions', params);
          if (!response.success) {
            throw new Error(response.error?.message || 'Failed to fetch positions');
          }
          return response.data;
        },
        30 * 1000 // 30 seconds cache
      );

      return { success: true, data: cachedData };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch positions' 
      };
    }
  }

  async getOrders(params?: {
    status?: 'open' | 'closed' | 'all';
    limit?: number;
    symbols?: string;
  }): Promise<ApiResponse<Order[]>> {
    try {
      // Check authentication first
      const isAuthenticated = await this.checkAuthentication();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'Authentication required. Please sign in to view your orders.'
        };
      }

      // Use caching for orders data (15 seconds TTL for open orders, 2 minutes for closed)
      const cacheKey = `orders:${params?.status || 'all'}:${params?.symbols || 'all'}:${params?.limit || 50}`;
      const cacheTTL = params?.status === 'open' ? 15 * 1000 : 2 * 60 * 1000;
      
      const cachedData = await userDataCache.getOrSet(
        cacheKey,
        async () => {
          const edgeParams: Record<string, string> = {
            status: params?.status || 'all'  // Default to 'all' if not specified
          };
          if (params?.limit) edgeParams.limit = params.limit.toString();
          if (params?.symbols) edgeParams.symbols = params.symbols;

          const response = await edgeFunctionClient.get<Order[]>('alpaca-orders', edgeParams);
          if (!response.success) {
            throw new Error(response.error?.message || 'Failed to fetch orders');
          }
          return response.data;
        },
        cacheTTL
      );

      return { success: true, data: cachedData };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch orders' 
      };
    }
  }

  async placeOrder(orderData: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'stop_limit';
    time_in_force?: 'day' | 'gtc' | 'ioc' | 'fok';
    limit_price?: number;
    stop_price?: number;
    extended_hours?: boolean;
    trade_type?: 'stock' | 'option';
    option_details?: {
      strike: number;
      expiration: string;
      option_type: 'call' | 'put';
      contract_size?: number;
      premium?: number;
    };
  }): Promise<ApiResponse<Order>> {
    try {
      // Check authentication first
      const isAuthenticated = await this.checkAuthentication();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'Authentication required. Please sign in to place orders.'
        };
      }

      const response = await edgeFunctionClient.post<Order>('alpaca-orders', orderData);

      if (response.success) {
        // Invalidate relevant caches after placing order
        this.invalidateOrderCaches();
        this.invalidatePositionCaches();
        this.invalidateAccountCache();
        
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error?.message || 'Failed to place order' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to place order' };
    }
  }

  async getAssets(params?: {
    status?: 'active' | 'inactive';
    asset_class?: 'us_equity' | 'crypto' | 'us_option';
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<Asset[]>> {
    try {
      const edgeParams: Record<string, string> = {};
      if (params?.status) edgeParams.status = params.status;
      if (params?.asset_class) edgeParams.asset_class = params.asset_class;
      if (params?.limit) edgeParams.limit = params.limit.toString();

      let response;
      
      // If search term is provided, use the search endpoint
      if (params?.search && params.search.trim().length > 0) {
        edgeParams.search = params.search;
        edgeParams.tradable_only = 'true';
        response = await edgeFunctionClient.get<{assets: Asset[]}>('alpaca-assets-search', edgeParams);
        
        // Extract assets from the search response format
        if (response.success && response.data?.assets) {
          return { success: true, data: response.data.assets };
        }
      } else {
        // For general asset listing, use the securities endpoint
        response = await edgeFunctionClient.get<{assets: Asset[]}>('alpaca-securities', edgeParams);
        
        // Extract assets from the securities response format
        if (response.success && response.data?.assets) {
          return { success: true, data: response.data.assets };
        }
      }

      if (response.success) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error?.message || 'Failed to fetch assets' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to fetch assets' };
    }
  }

  async getPortfolioHistory(params?: {
    period?: '1D' | '1W' | '1M' | '3M' | '1A' | '2A' | '5A' | 'all';
    timeframe?: '1Min' | '5Min' | '15Min' | '1H' | '1D';
  }): Promise<ApiResponse<PortfolioHistory>> {
    try {
      // Check authentication first
      const isAuthenticated = await this.checkAuthentication();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'Authentication required. Please sign in to view your portfolio history.'
        };
      }

      // Use caching for portfolio history (5 minutes TTL for longer periods, 1 minute for intraday)
      const period = params?.period || '1D';
      const timeframe = params?.timeframe || '1D';
      const cacheKey = `portfolio-history:${period}:${timeframe}`;
      const cacheTTL = ['1D', '1Min', '5Min', '15Min', '1H'].includes(period) ? 60 * 1000 : 5 * 60 * 1000;
      
      const cachedData = await userDataCache.getOrSet(
        cacheKey,
        async () => {
          const edgeParams: Record<string, string> = {};
          if (params?.period) edgeParams.period = params.period;
          if (params?.timeframe) edgeParams.timeframe = params.timeframe;

          const response = await edgeFunctionClient.get<PortfolioHistory>('alpaca-portfolio-history', edgeParams);
          if (!response.success) {
            throw new Error(response.error?.message || 'Failed to fetch portfolio history');
          }
          return response.data;
        },
        cacheTTL
      );

      return { success: true, data: cachedData };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch portfolio history' 
      };
    }
  }

  // Note: Funding, Activities, Documents, Events, and Account Update APIs
  // would be implemented as Edge Functions when needed

  // Order Management APIs
  async getOrder(orderId: string): Promise<ApiResponse<any>> {
    try {
      // Use consolidated alpaca-orders edge function with GET method
      const response = await edgeFunctionClient.post<any>('alpaca-orders', {
        method: 'GET',
        orderId
      });

      if (response.success) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error?.message || 'Failed to fetch order' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to fetch order' };
    }
  }

  async cancelOrder(orderId: string): Promise<ApiResponse<any>> {
    try {
      // Use consolidated alpaca-orders edge function with DELETE method
      const response = await edgeFunctionClient.post<any>('alpaca-orders', {
        method: 'DELETE',
        orderId
      });

      if (response.success) {
        // Invalidate relevant caches after canceling order
        this.invalidateOrderCaches();
        this.invalidateAccountCache();
        
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error?.message || 'Failed to cancel order' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to cancel order' };
    }
  }

  async modifyOrder(orderId: string, updateData: any): Promise<ApiResponse<any>> {
    try {
      // Use consolidated alpaca-orders edge function with PATCH method
      const response = await edgeFunctionClient.post<any>('alpaca-orders', {
        method: 'PATCH',
        orderId,
        ...updateData
      });

      if (response.success) {
        // Invalidate relevant caches after modifying order
        this.invalidateOrderCaches();
        
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error?.message || 'Failed to modify order' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to modify order' };
    }
  }

  // Note: Watchlist APIs would be implemented as Edge Functions when needed

  // Market Data APIs - Using Edge Functions only
  async getQuotes(symbolsOrParams: string | {
    symbols: string;
    start?: string;
    end?: string;
    limit?: number;
    feed?: string;
  }): Promise<ApiResponse<any>> {
    try {
      // Handle both string and object parameters for backward compatibility
      const edgeParams: Record<string, string> = {};
      let symbols: string;

      if (typeof symbolsOrParams === 'string') {
        symbols = symbolsOrParams;
        edgeParams.symbols = symbolsOrParams;
      } else {
        symbols = symbolsOrParams.symbols;
        edgeParams.symbols = symbolsOrParams.symbols;
        if (symbolsOrParams.start) edgeParams.start = symbolsOrParams.start;
        if (symbolsOrParams.end) edgeParams.end = symbolsOrParams.end;
        if (symbolsOrParams.limit) edgeParams.limit = symbolsOrParams.limit.toString();
        if (symbolsOrParams.feed) edgeParams.feed = symbolsOrParams.feed;
      }

      // Use market data caching (30 seconds TTL)
      const cacheKey = `quotes:${symbols}:${JSON.stringify(edgeParams)}`;
      const cachedData = await marketDataCache.getOrSet(
        cacheKey,
        async () => {
          // Use alpaca-market-data-enhanced/quotes endpoint
          const response = await edgeFunctionClient.get<MarketData>('alpaca-market-data-enhanced/quotes', edgeParams);
          if (!response.success) {
            throw new Error(response.error?.message || 'Failed to fetch quotes');
          }
          return response.data;
        },
        30 * 1000 // 30 seconds cache
      );

      return { success: true, data: cachedData };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch quotes' 
      };
    }
  }

  async getBars(params: {
    symbols: string;
    timeframe?: '1Min' | '5Min' | '15Min' | '30Min' | '1Hour' | '1Day' | '1Week' | '1Month';
    start?: string;
    end?: string;
    limit?: number;
    feed?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const edgeParams: Record<string, string> = {
        symbols: params.symbols
      };
      if (params.timeframe) edgeParams.timeframe = params.timeframe;
      if (params.start) edgeParams.start = params.start;
      if (params.end) edgeParams.end = params.end;
      if (params.limit) edgeParams.limit = params.limit.toString();
      if (params.feed) edgeParams.feed = params.feed;

      // Use market data caching with different TTLs based on timeframe
      const timeframe = params.timeframe || '1Day';
      const cacheKey = `bars:${params.symbols}:${JSON.stringify(edgeParams)}`;
      
      // Shorter cache for intraday data, longer for daily/weekly
      const cacheTTL = ['1Min', '5Min', '15Min', '30Min'].includes(timeframe) 
        ? 30 * 1000  // 30 seconds for intraday
        : 5 * 60 * 1000; // 5 minutes for daily/weekly
      
      const cachedData = await marketDataCache.getOrSet(
        cacheKey,
        async () => {
          // Use alpaca-market-data-enhanced/bars endpoint
          const response = await edgeFunctionClient.get<MarketData>('alpaca-market-data-enhanced/bars', edgeParams);
          if (!response.success) {
            throw new Error(response.error?.message || 'Failed to fetch market data');
          }
          return response.data;
        },
        cacheTTL
      );

      return { success: true, data: cachedData };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch market data' 
      };
    }
  }

  // Note: Leaderboard, Auth, and User Profile APIs would be implemented as Edge Functions when needed

  // =============================================================================
  // OPTIONS TRADING APIs
  // =============================================================================

  /**
   * Get options contracts with filtering
   * @param params Query parameters for filtering options
   */
  async getOptionsContracts(params?: {
    underlying_symbols?: string;
    status?: 'active' | 'inactive';
    expiration_date?: string;
    expiration_date_gte?: string;
    expiration_date_lte?: string;
    root_symbol?: string;
    type?: 'call' | 'put';
    style?: 'american' | 'european';
    strike_price_gte?: string;
    strike_price_lte?: string;
    limit?: number;
    page_token?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const edgeParams: Record<string, string> = {};
      if (params?.underlying_symbols) edgeParams.underlying_symbols = params.underlying_symbols;
      if (params?.status) edgeParams.status = params.status;
      if (params?.expiration_date) edgeParams.expiration_date = params.expiration_date;
      if (params?.expiration_date_gte) edgeParams.expiration_date_gte = params.expiration_date_gte;
      if (params?.expiration_date_lte) edgeParams.expiration_date_lte = params.expiration_date_lte;
      if (params?.root_symbol) edgeParams.root_symbol = params.root_symbol;
      if (params?.type) edgeParams.type = params.type;
      if (params?.style) edgeParams.style = params.style;
      if (params?.strike_price_gte) edgeParams.strike_price_gte = params.strike_price_gte;
      if (params?.strike_price_lte) edgeParams.strike_price_lte = params.strike_price_lte;
      if (params?.limit) edgeParams.limit = params.limit.toString();
      if (params?.page_token) edgeParams.page_token = params.page_token;

      const response = await edgeFunctionClient.get<any>('alpaca-options-contracts', edgeParams);
      
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error?.message || 'Failed to fetch options contracts' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to fetch options contracts' };
    }
  }

  /**
   * Get specific options contract by ID
   * @param contractId The contract ID
   */
  async getOptionsContract(contractId: string): Promise<ApiResponse<any>> {
    try {
      const response = await edgeFunctionClient.get<any>(`alpaca-options-contracts/${contractId}`);
      
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error?.message || 'Failed to fetch options contract' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to fetch options contract' };
    }
  }

  /**
   * Request options trading approval for an account
   * @param level Options approval level (0-3)
   *   0 = No options trading
   *   1 = Covered calls and cash-secured puts
   *   2 = Long calls and puts
   *   3 = Spreads
   */
  async requestOptionsApproval(level: number): Promise<ApiResponse<any>> {
    try {
      // First get the account to get the account ID
      const accountResult = await this.getAccount();
      if (!accountResult.success || !accountResult.data) {
        return { success: false, error: 'Failed to get account information' };
      }
      
      const accountId = accountResult.data.id;
      
      // Call the options approval endpoint with account ID in path
      const response = await edgeFunctionClient.post<any>(`alpaca-account/${accountId}/options_approval`, { level });
      
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error?.message || 'Failed to request options approval' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to request options approval' };
    }
  }

  /**
   * Get account configuration including options approval level
   */
  async getAccountConfiguration(): Promise<ApiResponse<any>> {
    try {
      const response = await edgeFunctionClient.get<any>('alpaca-account/configuration');
      
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error?.message || 'Failed to fetch account configuration' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to fetch account configuration' };
    }
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  // Cache invalidation methods
  private invalidateOrderCaches(): void {
    // Clear all order-related cache entries
    const orderKeys = ['orders:all', 'orders:open', 'orders:closed'];
    orderKeys.forEach(key => {
      userDataCache.delete(key);
      // Also clear with different limits and symbols
      for (let i = 1; i <= 5; i++) {
        userDataCache.delete(`${key}:all:${i * 10}`);
        userDataCache.delete(`${key}:all:${i * 50}`);
      }
    });
  }

  private invalidatePositionCaches(): void {
    // Clear all position-related cache entries
    userDataCache.delete('positions:all');
    // Clear individual symbol position caches (we don't know which symbols, so clear all)
    // This is handled by the cache's TTL, but we could implement a more sophisticated approach
  }

  private invalidateAccountCache(): void {
    // Clear account-related cache entries
    userDataCache.delete('account:current');
  }

  // Leaderboard APIs
  async getLeaderboard(params?: {
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all';
    limit?: number;
    sort_by?: 'return' | 'win_rate' | 'trades' | 'followers';
  }): Promise<ApiResponse<LeaderboardEntry[]>> {
    try {
      const edgeParams: Record<string, string> = {};
      if (params?.timeframe) edgeParams.timeframe = params.timeframe;
      if (params?.limit) edgeParams.limit = params.limit.toString();
      if (params?.sort_by) edgeParams.sort_by = params.sort_by;

      const response = await edgeFunctionClient.get<LeaderboardEntry[]>('get-leaderboard', edgeParams);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error?.message || 'Failed to fetch leaderboard'
        };
      }

      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch leaderboard' 
      };
    }
  }

  async updateLeaderboardStats(): Promise<ApiResponse<any>> {
    try {
      // Check authentication first
      const isAuthenticated = await this.checkAuthentication();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const response = await edgeFunctionClient.post<any>('update-leaderboard-stats', {});
      
      if (!response.success) {
        return {
          success: false,
          error: response.error?.message || 'Failed to update leaderboard stats'
        };
      }

      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update leaderboard stats' 
      };
    }
  }

  private invalidatePortfolioCaches(): void {
    // Clear portfolio history caches
    const periods = ['1D', '1W', '1M', '3M', '1A', '2A', '5A', 'all'];
    const timeframes = ['1Min', '5Min', '15Min', '1H', '1D'];
    
    periods.forEach(period => {
      timeframes.forEach(timeframe => {
        userDataCache.delete(`portfolio-history:${period}:${timeframe}`);
      });
    });
  }

  // Public method to clear all user-related caches (useful after logout)
  clearUserCaches(): void {
    this.invalidateOrderCaches();
    this.invalidatePositionCaches();
    this.invalidateAccountCache();
    this.invalidatePortfolioCaches();
  }

  // Public method to clear market data caches
  clearMarketDataCaches(symbol?: string): void {
    if (symbol) {
      // Clear specific symbol caches
      marketDataCache.delete(cacheKeys.marketData(symbol));
    } else {
      // Clear all market data
      marketDataCache.clear();
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;