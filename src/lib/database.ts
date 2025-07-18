// Database service for copy trading system
import { supabase } from './supabase';
import type { 
  UserProfile, 
  CopyTradingSubscription, 
  TradeExecution, 
  CopiedTrade, 
  LeaderboardData 
} from '../types/trading';

export class DatabaseService {
  // User Profile operations
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  }

  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Error updating user profile:', error);
      return false;
    }

    return true;
  }

  // Copy Trading Subscription operations
  static async getFollowerSubscriptions(followerId: string): Promise<CopyTradingSubscription[]> {
    const { data, error } = await supabase
      .from('copy_trading_subscriptions')
      .select('*')
      .eq('follower_id', followerId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching follower subscriptions:', error);
      return [];
    }

    return data || [];
  }

  static async getLeaderFollowers(leaderId: string): Promise<CopyTradingSubscription[]> {
    const { data, error } = await supabase
      .from('copy_trading_subscriptions')
      .select('*')
      .eq('leader_id', leaderId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching leader followers:', error);
      return [];
    }

    return data || [];
  }

  static async createSubscription(subscription: Omit<CopyTradingSubscription, 'id' | 'created_at' | 'updated_at'>): Promise<CopyTradingSubscription | null> {
    const { data, error } = await supabase
      .from('copy_trading_subscriptions')
      .insert(subscription)
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      return null;
    }

    return data;
  }

  static async updateSubscription(subscriptionId: string, updates: Partial<CopyTradingSubscription>): Promise<boolean> {
    const { error } = await supabase
      .from('copy_trading_subscriptions')
      .update(updates)
      .eq('id', subscriptionId);

    if (error) {
      console.error('Error updating subscription:', error);
      return false;
    }

    return true;
  }

  static async deleteSubscription(subscriptionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('copy_trading_subscriptions')
      .delete()
      .eq('id', subscriptionId);

    if (error) {
      console.error('Error deleting subscription:', error);
      return false;
    }

    return true;
  }

  // Trade Execution operations
  static async createTradeExecution(trade: Omit<TradeExecution, 'id' | 'created_at' | 'updated_at'>): Promise<TradeExecution | null> {
    const { data, error } = await supabase
      .from('trade_executions')
      .insert(trade)
      .select()
      .single();

    if (error) {
      console.error('Error creating trade execution:', error);
      return null;
    }

    return data;
  }

  static async getTradeExecutions(leaderId: string, limit: number = 50): Promise<TradeExecution[]> {
    const { data, error } = await supabase
      .from('trade_executions')
      .select('*')
      .eq('leader_id', leaderId)
      .order('executed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching trade executions:', error);
      return [];
    }

    return data || [];
  }

  static async getTradeExecution(tradeId: string): Promise<TradeExecution | null> {
    const { data, error } = await supabase
      .from('trade_executions')
      .select('*')
      .eq('id', tradeId)
      .single();

    if (error) {
      console.error('Error fetching trade execution:', error);
      return null;
    }

    return data;
  }

  // Copied Trade operations
  static async createCopiedTrade(copiedTrade: Omit<CopiedTrade, 'id' | 'created_at' | 'updated_at'>): Promise<CopiedTrade | null> {
    const { data, error } = await supabase
      .from('copied_trades')
      .insert(copiedTrade)
      .select()
      .single();

    if (error) {
      console.error('Error creating copied trade:', error);
      return null;
    }

    return data;
  }

  static async getCopiedTrades(followerId: string, limit: number = 50): Promise<CopiedTrade[]> {
    const { data, error } = await supabase
      .from('copied_trades')
      .select('*')
      .eq('follower_id', followerId)
      .order('executed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching copied trades:', error);
      return [];
    }

    return data || [];
  }

  static async updateCopiedTrade(copiedTradeId: string, updates: Partial<CopiedTrade>): Promise<boolean> {
    const { error } = await supabase
      .from('copied_trades')
      .update(updates)
      .eq('id', copiedTradeId);

    if (error) {
      console.error('Error updating copied trade:', error);
      return false;
    }

    return true;
  }

  static async getCopiedTradesForOriginal(originalTradeId: string): Promise<CopiedTrade[]> {
    const { data, error } = await supabase
      .from('copied_trades')
      .select('*')
      .eq('original_trade_id', originalTradeId);

    if (error) {
      console.error('Error fetching copied trades for original:', error);
      return [];
    }

    return data || [];
  }

  // Leaderboard operations
  static async getLeaderboardData(): Promise<LeaderboardData[]> {
    const { data, error } = await supabase
      .rpc('get_leaderboard_data');

    if (error) {
      console.error('Error fetching leaderboard data:', error);
      return [];
    }

    return data || [];
  }

  // Utility functions
  static async getTotalAllocationForFollower(followerId: string): Promise<number> {
    const { data, error } = await supabase
      .from('copy_trading_subscriptions')
      .select('allocation_percentage')
      .eq('follower_id', followerId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching total allocation:', error);
      return 0;
    }

    return data?.reduce((total, sub) => total + sub.allocation_percentage, 0) || 0;
  }

  static async validateAllocationPercentage(followerId: string, newAllocation: number, excludeSubscriptionId?: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('copy_trading_subscriptions')
      .select('allocation_percentage')
      .eq('follower_id', followerId)
      .eq('is_active', true)
      .neq('id', excludeSubscriptionId || '');

    if (error) {
      console.error('Error validating allocation:', error);
      return false;
    }

    const currentTotal = data?.reduce((total, sub) => total + sub.allocation_percentage, 0) || 0;
    return (currentTotal + newAllocation) <= 100;
  }

  // Real-time subscriptions
  static subscribeToTradeExecutions(leaderId: string, callback: (payload: any) => void) {
    return supabase
      .channel('trade_executions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trade_executions',
        filter: `leader_id=eq.${leaderId}`
      }, callback)
      .subscribe();
  }

  static subscribeToCopiedTrades(followerId: string, callback: (payload: any) => void) {
    return supabase
      .channel('copied_trades')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'copied_trades',
        filter: `follower_id=eq.${followerId}`
      }, callback)
      .subscribe();
  }
}