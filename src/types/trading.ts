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
  user_id: string;
  username: string;
  total_return: number;
  total_return_percent: number;
  portfolio_value: number;
  trades_count: number;
  win_rate: number;
  rank: number;
  created_at: string;
  updated_at: string;
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