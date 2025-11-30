/**
 * Optimized query service for efficient data retrieval
 * Implements patterns to minimize database load and improve performance
 */

import { supabase } from './supabase';
import { userDataCache, cacheKeys } from './cache';

export class OptimizedQueryService {
  /**
   * Get user dashboard data in a single optimized query
   */
  static async getUserDashboardData(userId: string) {
    const cacheKey = `dashboard:${userId}`;
    
    return userDataCache.getOrSet(
      cacheKey,
      async () => {
        // Get user profile and subscriptions in parallel
        const [profile, subscriptions, alpacaAccount] = await Promise.all([
          supabase
            .from('profiles')
            .select('id,username,full_name,trading_mode,share_trades,show_asset_amounts')
            .eq('id', userId)
            .maybeSingle(),
          
          supabase
            .from('copy_trading_subscriptions')
            .select(`
              id,
              leader_id,
              allocation_percentage,
              profiles!leader_id(username,full_name,share_trades)
            `)
            .eq('follower_id', userId)
            .eq('is_active', true),
          
          supabase
            .from('alpaca_accounts')
            .select('alpaca_account_id,account_type,account_status,kyc_status')
            .eq('user_id', userId)
            .maybeSingle()
        ]);

        if (profile.error) throw profile.error;
        if (subscriptions.error) throw subscriptions.error;
        if (alpacaAccount.error && alpacaAccount.error.code !== 'PGRST116') {
          throw alpacaAccount.error;
        }

        return {
          profile: profile.data,
          subscriptions: subscriptions.data || [],
          alpacaAccount: alpacaAccount.data,
          totalAllocation: subscriptions.data?.reduce(
            (sum, sub) => sum + sub.allocation_percentage, 0
          ) || 0
        };
      },
      2 * 60 * 1000 // 2 minutes cache
    );
  }

  /**
   * Get leaderboard with efficient pagination and caching
   */
  static async getOptimizedLeaderboard(page = 0, pageSize = 20) {
    const cacheKey = `leaderboard:${page}:${pageSize}`;
    
    return userDataCache.getOrSet(
      cacheKey,
      async () => {
        const offset = page * pageSize;
        
        // Use the optimized database function with pagination
        const { data, error } = await supabase
          .rpc('get_leaderboard_data')
          .range(offset, offset + pageSize - 1);

        if (error) throw error;

        return data || [];
      },
      60 * 1000 // 1 minute cache for leaderboard
    );
  }

  /**
   * Get user's copy trading summary efficiently
   */
  static async getCopyTradingSummary(userId: string) {
    const cacheKey = `copy-trading-summary:${userId}`;
    
    return userDataCache.getOrSet(
      cacheKey,
      async () => {
        // Get both follower and leader data in parallel
        const [asFollower, asLeader] = await Promise.all([
          // Data when user is following others
          supabase
            .from('copy_trading_subscriptions')
            .select('allocation_percentage,profiles!leader_id(username,full_name)')
            .eq('follower_id', userId)
            .eq('is_active', true),
          
          // Data when user is being followed
          supabase
            .from('copy_trading_subscriptions')
            .select('follower_id,allocation_percentage,profiles!follower_id(username)')
            .eq('leader_id', userId)
            .eq('is_active', true)
        ]);

        if (asFollower.error) throw asFollower.error;
        if (asLeader.error) throw asLeader.error;

        return {
          following: asFollower.data || [],
          followers: asLeader.data || [],
          totalAllocation: asFollower.data?.reduce(
            (sum, sub) => sum + sub.allocation_percentage, 0
          ) || 0,
          followerCount: asLeader.data?.length || 0
        };
      },
      90 * 1000 // 90 seconds cache
    );
  }

  /**
   * Batch update user preferences efficiently
   */
  static async updateUserPreferences(userId: string, preferences: {
    share_trades?: boolean;
    show_asset_amounts?: boolean;
    theme_color?: string;
    trading_mode?: 'paper' | 'live';
  }) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(preferences)
        .eq('id', userId);

      if (error) throw error;

      // Invalidate related caches
      userDataCache.delete(`dashboard:${userId}`);
      userDataCache.delete(`copy-trading-summary:${userId}`);
      
      // If sharing preferences changed, invalidate leaderboard cache
      if ('share_trades' in preferences) {
        // Clear all leaderboard cache entries
        for (let page = 0; page < 10; page++) {
          userDataCache.delete(`leaderboard:${page}:20`);
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Efficiently check if user can add more subscriptions
   */
  static async canAddSubscription(followerId: string, allocationPercentage: number): Promise<{
    canAdd: boolean;
    currentAllocation: number;
    remainingAllocation: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('copy_trading_subscriptions')
        .select('allocation_percentage')
        .eq('follower_id', followerId)
        .eq('is_active', true);

      if (error) throw error;

      const currentAllocation = data?.reduce(
        (sum, sub) => sum + sub.allocation_percentage, 0
      ) || 0;

      const remainingAllocation = 100 - currentAllocation;
      const canAdd = allocationPercentage <= remainingAllocation;

      return {
        canAdd,
        currentAllocation,
        remainingAllocation
      };
    } catch (error) {
      console.error('Error checking subscription eligibility:', error);
      throw error;
    }
  }

  /**
   * Get minimal user data for notifications/mentions
   */
  static async getMinimalUserData(userIds: string[]) {
    if (userIds.length === 0) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,username,full_name')
        .in('id', userIds);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching minimal user data:', error);
      throw error;
    }
  }

  /**
   * Clear all caches for a user (useful on logout)
   */
  static clearUserCaches(userId: string) {
    const keysToDelete = [
      `dashboard:${userId}`,
      `copy-trading-summary:${userId}`,
      cacheKeys.userProfile(userId)
    ];

    keysToDelete.forEach(key => userDataCache.delete(key));
  }
}