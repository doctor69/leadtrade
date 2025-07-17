// Comprehensive API service for all endpoints
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
  buying_power: number;
  regt_buying_power: number;
  daytrading_buying_power: number;
  cash: number;
  portfolio_value: number;
  equity: number;
  last_equity: number;
  multiplier: number;
  initial_margin: number;
  maintenance_margin: number;
  sma: number;
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
    
    // Check for auth cookies
    const hasAccessToken = document.cookie.includes('sb-access-token');
    const hasRefreshToken = document.cookie.includes('sb-refresh-token');
    
    return hasAccessToken && hasRefreshToken;
  }

  // Account & Trading APIs
  async getAccount(): Promise<ApiResponse<AccountData>> {
    try {
      // Check authentication first
      const isAuthenticated = await this.checkAuthentication();
      if (!isAuthenticated) {
        return { 
          success: false, 
          error: 'Authentication required. Please sign in to access your account data.' 
        };
      }

      const response = await fetch('/api/alpaca/account');
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to fetch account data' };
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

      const url = symbol ? `/api/alpaca/positions?symbol=${symbol}` : '/api/alpaca/positions';
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to fetch positions' };
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

      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.symbols) searchParams.append('symbols', params.symbols);
      
      const url = `/api/alpaca/orders${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to fetch orders' };
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

      const response = await fetch('/api/alpaca/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to place order' };
    }
  }

  async getAssets(params?: {
    status?: 'active' | 'inactive';
    asset_class?: 'us_equity' | 'crypto';
    search?: string;
  }): Promise<ApiResponse<Asset[]>> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.asset_class) searchParams.append('asset_class', params.asset_class);
      if (params?.search) searchParams.append('search', params.search);
      
      const url = `/api/alpaca/assets${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const response = await fetch(url);
      return await response.json();
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

      const searchParams = new URLSearchParams();
      if (params?.period) searchParams.append('period', params.period);
      if (params?.timeframe) searchParams.append('timeframe', params.timeframe);
      
      const url = `/api/alpaca/portfolio-history${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to fetch portfolio history' };
    }
  }

  // Market Data APIs
  async getBars(params: {
    symbols: string;
    timeframe?: '1Min' | '5Min' | '15Min' | '30Min' | '1Hour' | '1Day' | '1Week' | '1Month';
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<ApiResponse<MarketData>> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('symbols', params.symbols);
      if (params.timeframe) searchParams.append('timeframe', params.timeframe);
      if (params.start) searchParams.append('start', params.start);
      if (params.end) searchParams.append('end', params.end);
      if (params.limit) searchParams.append('limit', params.limit.toString());
      
      const response = await fetch(`/api/alpaca/market-data/bars?${searchParams.toString()}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to fetch market data' };
    }
  }

  async getQuotes(params: {
    symbols: string;
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<ApiResponse<MarketData>> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('symbols', params.symbols);
      if (params.start) searchParams.append('start', params.start);
      if (params.end) searchParams.append('end', params.end);
      if (params.limit) searchParams.append('limit', params.limit.toString());
      
      const response = await fetch(`/api/alpaca/market-data/quotes?${searchParams.toString()}`);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to fetch quotes' };
    }
  }

  // Leaderboard API
  async getLeaderboard(params?: {
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all';
    limit?: number;
  }): Promise<ApiResponse<LeaderboardEntry[]>> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.timeframe) searchParams.append('timeframe', params.timeframe);
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      
      const url = `/api/leaderboard${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to fetch leaderboard' };
    }
  }

  // Auth APIs
  async signIn(email: string, password: string): Promise<Response> {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    
    return fetch('/api/auth/signin', {
      method: 'POST',
      body: formData,
    });
  }

  async signUp(email: string, password: string): Promise<Response> {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    
    return fetch('/api/auth/signup', {
      method: 'POST',
      body: formData,
    });
  }

  async signOut(): Promise<Response> {
    return fetch('/api/auth/signout', {
      method: 'POST',
    });
  }

  // User Profile API
  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await fetch('/api/user/profile');
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to fetch user profile' };
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
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;