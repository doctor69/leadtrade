// API utilities for Alpaca and Supabase integration
import { supabase } from './supabase';
import type { StockData, Position, AccountData, Order, LeaderboardEntry } from '@/types/trading';

// Alpaca API configuration
const ALPACA_BASE_URL = import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL;
const ALPACA_KEY_ID = import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY;
const ALPACA_SECRET = import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET;

// Create Alpaca headers
const createAlpacaHeaders = () => {
  const credentials = btoa(`${ALPACA_KEY_ID}:${ALPACA_SECRET}`);
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Basic ${credentials}`,
  };
};

// Alpaca API functions
export const alpacaApi = {
  // Get account information
  async getAccount(): Promise<AccountData | null> {
    try {
      const response = await fetch(`${ALPACA_BASE_URL}/account`, {
        headers: createAlpacaHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch account data');
      return await response.json();
    } catch (error) {
      console.error('Error fetching account:', error);
      return null;
    }
  },

  // Get positions
  async getPositions(): Promise<Position[]> {
    try {
      const response = await fetch(`${ALPACA_BASE_URL}/positions`, {
        headers: createAlpacaHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch positions');
      return await response.json();
    } catch (error) {
      console.error('Error fetching positions:', error);
      return [];
    }
  },

  // Get orders
  async getOrders(status?: string): Promise<Order[]> {
    try {
      const url = new URL(`${ALPACA_BASE_URL}/orders`);
      if (status) url.searchParams.append('status', status);
      
      const response = await fetch(url.toString(), {
        headers: createAlpacaHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch orders');
      return await response.json();
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  },

  // Place order
  async placeOrder(orderData: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    time_in_force: 'day' | 'gtc';
    limit_price?: number;
  }): Promise<Order | null> {
    try {
      const response = await fetch(`${ALPACA_BASE_URL}/orders`, {
        method: 'POST',
        headers: createAlpacaHeaders(),
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) throw new Error('Failed to place order');
      return await response.json();
    } catch (error) {
      console.error('Error placing order:', error);
      return null;
    }
  },

  // Get assets (stocks)
  async getAssets(search?: string): Promise<any[]> {
    try {
      const url = new URL(`${ALPACA_BASE_URL}/assets`);
      url.searchParams.append('status', 'active');
      url.searchParams.append('asset_class', 'us_equity');
      if (search) url.searchParams.append('search', search);
      
      const response = await fetch(url.toString(), {
        headers: createAlpacaHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch assets');
      return await response.json();
    } catch (error) {
      console.error('Error fetching assets:', error);
      return [];
    }
  },

  // Get latest quote
  async getLatestQuote(symbol: string): Promise<any | null> {
    try {
      const response = await fetch(`${ALPACA_BASE_URL}/stocks/${symbol}/quotes/latest`, {
        headers: createAlpacaHeaders(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch quote');
      return await response.json();
    } catch (error) {
      console.error('Error fetching quote:', error);
      return null;
    }
  },
};

// Supabase API functions
export const supabaseApi = {
  // Get leaderboard
  async getLeaderboard(timeframe: string = 'weekly'): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('timeframe', timeframe)
        .order('rank', { ascending: true })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  },

  // Update user portfolio
  async updatePortfolio(userId: string, portfolioData: {
    total_value: number;
    cash: number;
    positions: any[];
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('portfolios')
        .upsert({
          user_id: userId,
          ...portfolioData,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating portfolio:', error);
      return false;
    }
  },

  // Get user portfolio history
  async getPortfolioHistory(userId: string, timeframe: string = '1W'): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('portfolio_history')
        .select('*')
        .eq('user_id', userId)
        .eq('timeframe', timeframe)
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching portfolio history:', error);
      return [];
    }
  },

  // Save trade
  async saveTrade(tradeData: {
    user_id: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    order_type: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trades')
        .insert({
          ...tradeData,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving trade:', error);
      return false;
    }
  },
};

// Utility functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};