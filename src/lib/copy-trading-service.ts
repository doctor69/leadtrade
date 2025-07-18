// Copy Trading Service - handles subscription management and validation
import { supabase } from './supabase';
import type { CopyTradingSubscription, LeaderboardData } from '../types/trading';

export interface SubscriptionWithLeader extends CopyTradingSubscription {
  leader: {
    id: string;
    username: string;
    full_name?: string;
    share_trades: boolean;
    show_asset_amounts: boolean;
  };
}

export interface SubscriptionSummary {
  subscriptions: SubscriptionWithLeader[];
  totalAllocation: number;
  remainingAllocation: number;
  activeSubscriptions: number;
}

export class CopyTradingService {
  /**
   * Get user's copy trading subscriptions with leader information
   */
  static async getUserSubscriptions(userId: string): Promise<SubscriptionSummary> {
    try {
      const { data: subscriptions, error } = await supabase
        .from('copy_trading_subscriptions')
        .select(`
          *,
          leader:profiles!leader_id (
            id,
            username,
            full_name,
            share_trades,
            show_asset_amounts
          )
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user subscriptions:', error);
        return {
          subscriptions: [],
          totalAllocation: 0,
          remainingAllocation: 100,
          activeSubscriptions: 0
        };
      }

      const typedSubscriptions = subscriptions as SubscriptionWithLeader[];
      const activeSubscriptions = typedSubscriptions.filter(sub => sub.is_active);
      const totalAllocation = activeSubscriptions.reduce(
        (total, sub) => total + parseFloat(sub.allocation_percentage.toString()), 
        0
      );

      return {
        subscriptions: typedSubscriptions,
        totalAllocation,
        remainingAllocation: Math.max(0, 100 - totalAllocation),
        activeSubscriptions: activeSubscriptions.length
      };
    } catch (error) {
      console.error('Error in getUserSubscriptions:', error);
      return {
        subscriptions: [],
        totalAllocation: 0,
        remainingAllocation: 100,
        activeSubscriptions: 0
      };
    }
  }

  /**
   * Create a new copy trading subscription
   */
  static async createSubscription(
    followerId: string,
    leaderId: string,
    allocationPercentage: number
  ): Promise<{ success: boolean; data?: SubscriptionWithLeader; error?: string }> {
    try {
      // Validate inputs
      if (followerId === leaderId) {
        return { success: false, error: 'Cannot follow yourself' };
      }

      if (allocationPercentage <= 0 || allocationPercentage > 100) {
        return { success: false, error: 'Allocation percentage must be between 0.1 and 100' };
      }

      // Check if leader exists and shares trades
      const { data: leader, error: leaderError } = await supabase
        .from('profiles')
        .select('id, share_trades')
        .eq('id', leaderId)
        .single();

      if (leaderError || !leader) {
        return { success: false, error: 'Leader not found' };
      }

      if (!leader.share_trades) {
        return { success: false, error: 'This trader is not sharing trades' };
      }

      // Check if subscription already exists
      const { data: existingSubscription } = await supabase
        .from('copy_trading_subscriptions')
        .select('id')
        .eq('follower_id', followerId)
        .eq('leader_id', leaderId)
        .single();

      if (existingSubscription) {
        return { success: false, error: 'Already following this trader' };
      }

      // Validate total allocation doesn't exceed 100%
      const currentSummary = await this.getUserSubscriptions(followerId);
      if (currentSummary.totalAllocation + allocationPercentage > 100) {
        return { 
          success: false, 
          error: `Total allocation would exceed 100%. Available: ${currentSummary.remainingAllocation}%` 
        };
      }

      // Create subscription
      const { data: newSubscription, error: createError } = await supabase
        .from('copy_trading_subscriptions')
        .insert({
          follower_id: followerId,
          leader_id: leaderId,
          allocation_percentage: allocationPercentage,
          is_active: true
        })
        .select(`
          *,
          leader:profiles!leader_id (
            id,
            username,
            full_name,
            share_trades,
            show_asset_amounts
          )
        `)
        .single();

      if (createError) {
        console.error('Error creating subscription:', createError);
        return { success: false, error: 'Failed to create subscription' };
      }

      return { success: true, data: newSubscription as SubscriptionWithLeader };
    } catch (error) {
      console.error('Error in createSubscription:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Update an existing subscription
   */
  static async updateSubscription(
    subscriptionId: string,
    followerId: string,
    updates: { allocation_percentage?: number; is_active?: boolean }
  ): Promise<{ success: boolean; data?: SubscriptionWithLeader; error?: string }> {
    try {
      // Verify subscription exists and belongs to user
      const { data: existingSubscription, error: fetchError } = await supabase
        .from('copy_trading_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .eq('follower_id', followerId)
        .single();

      if (fetchError || !existingSubscription) {
        return { success: false, error: 'Subscription not found' };
      }

      // If updating allocation percentage, validate total doesn't exceed 100%
      if (updates.allocation_percentage !== undefined) {
        if (updates.allocation_percentage <= 0 || updates.allocation_percentage > 100) {
          return { success: false, error: 'Allocation percentage must be between 0.1 and 100' };
        }

        const currentSummary = await this.getUserSubscriptions(followerId);
        const currentAllocationWithoutThis = currentSummary.totalAllocation - 
          parseFloat(existingSubscription.allocation_percentage.toString());
        
        if (currentAllocationWithoutThis + updates.allocation_percentage > 100) {
          const available = 100 - currentAllocationWithoutThis;
          return { 
            success: false, 
            error: `Total allocation would exceed 100%. Available: ${available.toFixed(1)}%` 
          };
        }
      }

      // Update subscription
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('copy_trading_subscriptions')
        .update(updates)
        .eq('id', subscriptionId)
        .eq('follower_id', followerId)
        .select(`
          *,
          leader:profiles!leader_id (
            id,
            username,
            full_name,
            share_trades,
            show_asset_amounts
          )
        `)
        .single();

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return { success: false, error: 'Failed to update subscription' };
      }

      return { success: true, data: updatedSubscription as SubscriptionWithLeader };
    } catch (error) {
      console.error('Error in updateSubscription:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Delete a subscription
   */
  static async deleteSubscription(
    subscriptionId: string,
    followerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify subscription exists and belongs to user
      const { data: existingSubscription, error: fetchError } = await supabase
        .from('copy_trading_subscriptions')
        .select('id')
        .eq('id', subscriptionId)
        .eq('follower_id', followerId)
        .single();

      if (fetchError || !existingSubscription) {
        return { success: false, error: 'Subscription not found' };
      }

      // Delete subscription
      const { error: deleteError } = await supabase
        .from('copy_trading_subscriptions')
        .delete()
        .eq('id', subscriptionId)
        .eq('follower_id', followerId);

      if (deleteError) {
        console.error('Error deleting subscription:', deleteError);
        return { success: false, error: 'Failed to delete subscription' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteSubscription:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get available traders for following (leaderboard data)
   */
  static async getAvailableTraders(): Promise<LeaderboardData[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_leaderboard_data');

      if (error) {
        console.error('Error fetching available traders:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAvailableTraders:', error);
      return [];
    }
  }

  /**
   * Check if user can follow a specific trader
   */
  static async canFollowTrader(
    followerId: string,
    leaderId: string,
    allocationPercentage: number
  ): Promise<{ canFollow: boolean; reason?: string; availableAllocation?: number }> {
    try {
      if (followerId === leaderId) {
        return { canFollow: false, reason: 'Cannot follow yourself' };
      }

      // Check if leader exists and shares trades
      const { data: leader, error: leaderError } = await supabase
        .from('profiles')
        .select('id, share_trades')
        .eq('id', leaderId)
        .single();

      if (leaderError || !leader) {
        return { canFollow: false, reason: 'Leader not found' };
      }

      if (!leader.share_trades) {
        return { canFollow: false, reason: 'This trader is not sharing trades' };
      }

      // Check if already following
      const { data: existingSubscription } = await supabase
        .from('copy_trading_subscriptions')
        .select('id')
        .eq('follower_id', followerId)
        .eq('leader_id', leaderId)
        .single();

      if (existingSubscription) {
        return { canFollow: false, reason: 'Already following this trader' };
      }

      // Check allocation limits
      const currentSummary = await this.getUserSubscriptions(followerId);
      const availableAllocation = currentSummary.remainingAllocation;

      if (allocationPercentage > availableAllocation) {
        return { 
          canFollow: false, 
          reason: 'Insufficient allocation available',
          availableAllocation 
        };
      }

      return { canFollow: true, availableAllocation };
    } catch (error) {
      console.error('Error in canFollowTrader:', error);
      return { canFollow: false, reason: 'Internal server error' };
    }
  }

  /**
   * Get subscription statistics for a user
   */
  static async getSubscriptionStats(userId: string): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalAllocation: number;
    averageAllocation: number;
  }> {
    try {
      const summary = await this.getUserSubscriptions(userId);
      const activeSubscriptions = summary.subscriptions.filter(sub => sub.is_active);
      
      return {
        totalSubscriptions: summary.subscriptions.length,
        activeSubscriptions: activeSubscriptions.length,
        totalAllocation: summary.totalAllocation,
        averageAllocation: activeSubscriptions.length > 0 
          ? summary.totalAllocation / activeSubscriptions.length 
          : 0
      };
    } catch (error) {
      console.error('Error in getSubscriptionStats:', error);
      return {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        totalAllocation: 0,
        averageAllocation: 0
      };
    }
  }
}