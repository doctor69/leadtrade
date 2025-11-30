// Trading related TypeScript interfaces and types

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  pe?: number;
}

export interface Position {
  id: string;
  symbol: string;
  qty: number;
  avg_entry_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  side: 'long' | 'short';
  created_at: string;
}

export interface AccountData {
  id: string;
  buying_power: number;
  portfolio_value: number;
  equity: number;
  cash: number;
  day_trade_buying_power: number;
  initial_margin: number;
  maintenance_margin: number;
  last_equity: number;
}

export interface Order {
  id: string;
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit';
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  limit_price?: number;
  stop_price?: number;
  status: 'new' | 'partially_filled' | 'filled' | 'done_for_day' | 'canceled' | 'expired' | 'replaced' | 'pending_cancel' | 'pending_replace' | 'accepted' | 'pending_new' | 'accepted_for_bidding' | 'stopped' | 'rejected' | 'suspended' | 'calculated';
  filled_qty: number;
  filled_avg_price?: number;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id?: string;
  username: string;
  total_return?: number;
  total_return_percent?: number;
  totalReturn: number;
  totalReturnPercent: number;
  portfolio_value?: number;
  portfolioValue: number;
  trades_count?: number;
  tradesCount: number;
  win_rate?: number;
  winRate: number;
  rank: number;
  showAssetAmounts: boolean;
  followers?: number;
  avgHoldTime?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  tradingStyle?: 'conservative' | 'moderate' | 'active';
  lastActive?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PortfolioHistory {
  date: string;
  equity: number;
  profit_loss: number;
  profit_loss_pct: number;
  base_value: number;
  timeframe: string;
}

export interface Trade {
  id: string;
  order_id: string;
  symbol: string;
  qty: number;
  price: number;
  side: 'buy' | 'sell';
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
  updated_at: string;
}

// Copy Trading Data Models

export interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  alpaca_access_token?: string;
  alpaca_refresh_token?: string;
  trading_mode: 'paper' | 'live';
  share_trades: boolean;
  show_asset_amounts: boolean;
  theme_color: string;
  created_at: string;
  updated_at: string;
}

export interface CopyTradingSubscription {
  id: string;
  follower_id: string;
  leader_id: string;
  allocation_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TradeExecution {
  id: string;
  original_trade_id: string; // Alpaca order ID
  leader_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  trade_type: 'stock' | 'option';
  option_details?: OptionDetails;
  portfolio_percentage?: number;
  executed_at: string;
  created_at: string;
  updated_at: string;
}

export interface CopiedTrade {
  id: string;
  original_trade_id: string;
  follower_id: string;
  alpaca_order_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  allocated_amount?: number;
  execution_status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'failed';
  error_message?: string;
  executed_at: string;
  created_at: string;
  updated_at: string;
}

export interface OptionDetails {
  strike: number;
  expiration: string;
  option_type: 'call' | 'put';
  contract_size?: number; // Number of shares per contract (default 100)
  premium?: number; // Option premium price
  implied_volatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface OptionChain {
  symbol: string;
  expiration_dates: string[];
  strikes: {
    [expiration: string]: {
      calls: OptionContract[];
      puts: OptionContract[];
    };
  };
}

export interface OptionContract {
  symbol: string;
  strike: number;
  expiration: string;
  option_type: 'call' | 'put';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  open_interest: number;
  implied_volatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

// Alpaca Option Contract (from Alpaca API)
export interface AlpacaOptionContract {
  id: string;
  symbol: string;
  name: string;
  status: 'active' | 'inactive';
  tradable: boolean;
  expiration_date: string;
  underlying_symbol: string;
  underlying_asset_id: string;
  type: 'call' | 'put';
  style: 'american' | 'european';
  strike_price: string;
  multiplier: string;
  size: string;
  open_interest?: string;
  open_interest_date?: string;
  close_price?: string;
  close_price_date?: string;
  root_symbol: string;
  deliverable?: string;
}

export interface LeaderboardData {
  user_id: string;
  username: string;
  total_trades: number;
  avg_return: number;
  total_followers: number;
  share_trades: boolean;
  show_asset_amounts: boolean;
}

// Trading Configuration Types
export interface AlpacaConfig {
  baseUrl: string;
  dataUrl: string;
  wsUrl: string;
  keyId: string;
  secretKey: string;
}

export interface TradingModeConfig {
  paper: AlpacaConfig;
  live: AlpacaConfig;
}

// Enhanced Trade Execution Interface
export interface TradeExecutionRequest {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  limit_price?: number;
  stop_price?: number;
  trade_type: 'stock' | 'option';
  option_details?: OptionDetails;
}

// API Response types
export interface AlpacaAsset {
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
}

export interface AlpacaQuote {
  symbol: string;
  bid: number;
  ask: number;
  bidsize: number;
  asksize: number;
  timestamp: string;
}

export interface AlpacaBar {
  t: string; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  n: number; // trade count
  vw: number; // volume weighted average price
}

// Account Management Types
export interface AccountUpdateRequest {
  contact?: {
    email_address?: string;
    phone_number?: string;
    street_address?: string[];
    city?: string;
    state?: string;
    postal_code?: string;
  };
  identity?: {
    given_name?: string;
    family_name?: string;
    date_of_birth?: string;
    country_of_citizenship?: string;
    funding_source?: string[];
  };
  disclosures?: {
    is_control_person?: boolean;
    is_affiliated_exchange_or_finra?: boolean;
    is_politically_exposed?: boolean;
    immediate_family_exposed?: boolean;
  };
  trusted_contact?: {
    given_name?: string;
    family_name?: string;
    email_address?: string;
  };
}

export interface OptionsApprovalRequest {
  level: number; // 0-3
}

export interface OptionsApprovalResponse {
  status: string;
  level: number;
}

export interface AccountActivity {
  id: string;
  account_id: string;
  activity_type: string;
  date: string;
  net_amount: string;
  description: string;
  status: string;
}
// 
Trading Configuration Types
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

export interface TradingConfigUpdate {
  dtbp_check?: 'entry' | 'exit' | 'both'
  trade_confirm_email?: 'all' | 'none'
  suspend_trade?: boolean
  no_shorting?: boolean
  fractional_trading?: boolean
  max_margin_multiplier?: string
  pdt_check?: 'entry' | 'exit' | 'both'
  ptp_no_exception_entry?: boolean
  max_options_trading_level?: number
}

// Rebalancing API Types
export interface RebalancingPortfolio {
  id: string;
  name: string;
  description?: string;
  weights: Record<string, number>; // symbol -> weight (0-1)
  cooldown_days: number;
  rebalance_conditions?: {
    drift_threshold?: number; // Percentage drift to trigger rebalance
    min_days_between?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateRebalancingPortfolioRequest {
  name: string;
  description?: string;
  weights: Record<string, number>;
  cooldown_days: number;
  rebalance_conditions?: {
    drift_threshold?: number;
    min_days_between?: number;
  };
}

export interface RebalancingSubscription {
  id: string;
  portfolio_id: string;
  account_id: string;
  allocation_percentage: number; // Percentage of account to allocate to this portfolio
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRebalancingSubscriptionRequest {
  account_id: string;
  allocation_percentage: number;
}

export interface RebalancingRun {
  id: string;
  portfolio_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'canceled';
  type: 'manual' | 'automatic' | 'scheduled';
  orders: RebalancingOrder[];
  failed_orders: RebalancingOrder[];
  skipped_orders: RebalancingOrder[];
  total_accounts: number;
  completed_accounts: number;
  failed_accounts: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface RebalancingOrder {
  account_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  order_id?: string;
  status: 'pending' | 'submitted' | 'filled' | 'failed' | 'skipped';
  error_message?: string;
}

export interface CreateRebalancingRunRequest {
  portfolio_id: string;
  type?: 'manual' | 'automatic' | 'scheduled';
  account_ids?: string[]; // Optional: specific accounts to rebalance
}

export interface ListRebalancingRunsParams {
  portfolio_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}
