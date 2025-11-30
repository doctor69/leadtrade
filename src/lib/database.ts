// Database service for copy trading system
import { supabase } from './supabase';
import { measureQuery } from './query-performance';
import type { 
  CopyTradingSubscription, 
  LeaderboardData 
} from '../types/trading';

export class DatabaseService {
  // Optimized User Profile operations with selective field retrieval
  static async getUserProfile(userId: string, fields?: string[]): Promise<any | null> {
    return measureQuery('getUserProfile', async () => {
      // Only select essential fields by default to reduce data transfer
      const selectFields = fields?.join(',') || 'id,username,full_name,email,share_trades,show_asset_amounts,trading_mode';
      
      const { data, error } = await supabase
        .from('profiles')
        .select(selectFields)
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // Don't throw for 'not found' errors, just return null
        if (error.code === 'PGRST116') {
          return null; 
        }
        throw error;
      }

      return data;
    }, userId);
  }

  // Get minimal profile data for public display (leaderboard, etc.)
  static async getPublicProfile(userId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,username,full_name,share_trades,show_asset_amounts,theme_color')
        .eq('id', userId)
        .eq('share_trades', true) // Only return if user shares trades
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Error fetching public profile for ${userId}:`, error);
      throw error;
    }
  }

  // Batch get multiple profiles efficiently
  static async getMultipleProfiles(userIds: string[], fields?: string[]): Promise<any[]> {
    try {
      const selectFields = fields?.join(',') || 'id,username,full_name,share_trades,show_asset_amounts';
      
      const { data, error } = await supabase
        .from('profiles')
        .select(selectFields)
        .in('id', userIds);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching multiple profiles:', error);
      throw error;
    }
  }

  static async updateUserProfile(userId: string, updates: any): Promise<boolean> {
    try {
      // Only update allowed fields to prevent unnecessary data changes
      const allowedFields = [
        'username', 'full_name', 'avatar_url', 'share_trades', 
        'show_asset_amounts', 'theme_color', 'trading_mode'
      ];
      
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {} as any);

      if (Object.keys(filteredUpdates).length === 0) {
        return true; // No valid updates to make
      }

      const { error } = await supabase
        .from('profiles')
        .update(filteredUpdates)
        .eq('id', userId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Alpaca Account operations
  static async getAlpacaAccount(userId: string, accountType: 'paper' | 'live' = 'paper'): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('alpaca_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('account_type', accountType)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Error fetching Alpaca account for ${userId}:`, error);
      throw error;
    }
  }

  static async createAlpacaAccount(accountData: {
    user_id: string;
    alpaca_account_id: string;
    alpaca_account_number?: string;
    account_type: 'paper' | 'live';
    kyc_status?: string;
    kyc_data?: any;
  }): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('alpaca_accounts')
        .insert(accountData)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating Alpaca account:', error);
      throw error;
    }
  }

  // Optimized Copy Trading Subscription operations
  static async getFollowerSubscriptions(followerId: string, includeLeaderInfo = false): Promise<any[]> {
    try {
      let selectQuery = 'id,leader_id,allocation_percentage,is_active,created_at';
      
      if (includeLeaderInfo) {
        selectQuery += ',profiles!leader_id(username,full_name,share_trades)';
      }

      const { data, error } = await supabase
        .from('copy_trading_subscriptions')
        .select(selectQuery)
        .eq('follower_id', followerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async getLeaderFollowers(leaderId: string, includeFollowerInfo = false): Promise<any[]> {
    try {
      let selectQuery = 'id,follower_id,allocation_percentage,is_active,created_at';
      
      if (includeFollowerInfo) {
        selectQuery += ',profiles!follower_id(username,full_name)';
      }

      const { data, error } = await supabase
        .from('copy_trading_subscriptions')
        .select(selectQuery)
        .eq('leader_id', leaderId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  // Get subscription count for a leader (efficient for leaderboard)
  static async getLeaderFollowerCount(leaderId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('copy_trading_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('leader_id', leaderId)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      throw error;
    }
  }

  static async createSubscription(subscription: Omit<CopyTradingSubscription, 'id' | 'created_at' | 'updated_at'>): Promise<CopyTradingSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('copy_trading_subscriptions')
        .insert(subscription)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async updateSubscription(subscriptionId: string, updates: Partial<CopyTradingSubscription>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('copy_trading_subscriptions')
        .update(updates)
        .eq('id', subscriptionId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async deleteSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('copy_trading_subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Note: Trade data is now fetched directly from Alpaca APIs
  // These methods are removed as we no longer store trade data locally
  // Use apiService.getOrders(), apiService.getPositions(), etc. instead

  // Optimized Leaderboard operations
  static async getLeaderboardData(limit = 50): Promise<LeaderboardData[]> {
    try {
      // Use the database function but with a limit for better performance
      const { data, error } = await supabase
        .rpc('get_leaderboard_data')
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  // Get leaderboard data with pagination
  static async getLeaderboardDataPaginated(page = 0, pageSize = 20): Promise<{
    data: LeaderboardData[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const offset = page * pageSize;
      
      // Get total count first
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('share_trades', true);

      // Get paginated data
      const { data, error } = await supabase
        .rpc('get_leaderboard_data')
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw error;
      }

      return {
        data: data || [],
        totalCount: count || 0,
        hasMore: (count || 0) > offset + pageSize
      };
    } catch (error) {
      throw error;
    }
  }

  // Utility functions
  static async getTotalAllocationForFollower(followerId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('copy_trading_subscriptions')
        .select('allocation_percentage')
        .eq('follower_id', followerId)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      return data?.reduce((total, sub) => total + sub.allocation_percentage, 0) || 0;
    } catch (error) {
      throw error;
    }
  }

  static async validateAllocationPercentage(followerId: string, newAllocation: number, excludeSubscriptionId?: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('copy_trading_subscriptions')
        .select('allocation_percentage')
        .eq('follower_id', followerId)
        .eq('is_active', true)
        .neq('id', excludeSubscriptionId || '');

      if (error) {
        throw error;
      }

      const totalAllocation = data?.reduce((total, sub) => total + sub.allocation_percentage, 0) || 0;
      return totalAllocation + newAllocation <= 100;
    } catch (error) {
      throw error;
    }
  }

  // Real-time subscriptions for copy trading subscriptions
  static subscribeToSubscriptions(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('copy_trading_subscriptions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'copy_trading_subscriptions',
        filter: `follower_id=eq.${userId}`
      }, callback)
      .subscribe();
  }

  static subscribeToLeaderUpdates(leaderId: string, callback: (payload: any) => void) {
    return supabase
      .channel('leader_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'copy_trading_subscriptions',
        filter: `leader_id=eq.${leaderId}`
      }, callback)
      .subscribe();
  }
}