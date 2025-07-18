// WebSocket Service for Real-time Trade Notifications
import { supabase } from './supabase';
import { getAuthenticatedUser } from './auth';

export interface TradeNotificationData {
  type: 'leader_trade' | 'copied_trade' | 'trade_execution' | 'trade_update';
  leaderId?: string;
  leaderName?: string;
  followerId?: string;
  followerName?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  executionStatus?: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'failed';
  message: string;
  metadata?: Record<string, any>;
}

export interface WebSocketNotification {
  id: string;
  userId: string;
  data: TradeNotificationData;
  timestamp: string;
  read: boolean;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private supabaseChannel: any = null;
  private listeners: Map<string, (notification: WebSocketNotification) => void> = new Map();
  private isConnected = false;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Initialize real-time connection for trade notifications (Requirement 6.4)
   */
  async initialize(): Promise<boolean> {
    try {
      const user = await getAuthenticatedUser();
      if (!user) {
        console.warn('No authenticated user for WebSocket service');
        return false;
      }

      // Subscribe to trade notifications for the current user
      this.supabaseChannel = supabase
        .channel(`trade_notifications_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'trade_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            this.handleTradeNotification(payload.new as any);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'copied_trades',
            filter: `follower_id=eq.${user.id}`,
          },
          (payload) => {
            this.handleCopiedTradeUpdate(payload.new as any);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to trade notifications');
            this.isConnected = true;
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to trade notifications');
            this.isConnected = false;
          }
        });

      return true;
    } catch (error) {
      console.error('Error initializing WebSocket service:', error);
      return false;
    }
  }

  /**
   * Handle incoming trade notifications
   */
  private handleTradeNotification(notification: any) {
    const wsNotification: WebSocketNotification = {
      id: notification.id,
      userId: notification.user_id,
      data: notification.data,
      timestamp: notification.created_at,
      read: notification.read || false,
    };

    // Notify all listeners
    this.listeners.forEach((listener) => {
      try {
        listener(wsNotification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  /**
   * Handle copied trade updates
   */
  private handleCopiedTradeUpdate(copiedTrade: any) {
    const notification: WebSocketNotification = {
      id: `copied_trade_${copiedTrade.id}`,
      userId: copiedTrade.follower_id,
      data: {
        type: 'copied_trade',
        symbol: copiedTrade.symbol || 'Unknown',
        side: copiedTrade.side || 'buy',
        quantity: copiedTrade.quantity || 0,
        executionStatus: copiedTrade.execution_status,
        message: this.generateCopiedTradeMessage(copiedTrade),
        metadata: {
          copiedTradeId: copiedTrade.id,
          originalTradeId: copiedTrade.original_trade_id,
          alpacaOrderId: copiedTrade.alpaca_order_id,
        },
      },
      timestamp: copiedTrade.executed_at || new Date().toISOString(),
      read: false,
    };

    // Notify all listeners
    this.listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in copied trade listener:', error);
      }
    });
  }

  /**
   * Generate message for copied trade notifications
   */
  private generateCopiedTradeMessage(copiedTrade: any): string {
    const status = copiedTrade.execution_status;
    const symbol = copiedTrade.symbol || 'Unknown';
    const quantity = copiedTrade.quantity || 0;
    const side = copiedTrade.side || 'buy';

    switch (status) {
      case 'pending':
        return `Your copy trade order for ${quantity} shares of ${symbol} (${side}) is pending execution.`;
      case 'filled':
        return `Your copy trade order for ${quantity} shares of ${symbol} (${side}) has been filled.`;
      case 'partially_filled':
        return `Your copy trade order for ${symbol} (${side}) has been partially filled.`;
      case 'cancelled':
        return `Your copy trade order for ${quantity} shares of ${symbol} (${side}) was cancelled.`;
      case 'rejected':
        return `Your copy trade order for ${quantity} shares of ${symbol} (${side}) was rejected.`;
      case 'failed':
        return `Your copy trade order for ${quantity} shares of ${symbol} (${side}) failed to execute.`;
      default:
        return `Copy trade update for ${quantity} shares of ${symbol} (${side}).`;
    }
  }

  /**
   * Add a listener for trade notifications
   */
  addListener(id: string, callback: (notification: WebSocketNotification) => void): void {
    this.listeners.set(id, callback);
  }

  /**
   * Remove a listener
   */
  removeListener(id: string): void {
    this.listeners.delete(id);
  }

  /**
   * Send a trade notification to a specific user
   */
  static async sendTradeNotification(
    userId: string,
    notificationData: TradeNotificationData
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trade_notifications')
        .insert({
          user_id: userId,
          data: notificationData,
          read: false,
        });

      if (error) {
        console.error('Error sending trade notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in sendTradeNotification:', error);
      return false;
    }
  }

  /**
   * Send leader trade notification to all followers
   */
  static async notifyFollowersOfLeaderTrade(
    leaderId: string,
    leaderName: string,
    tradeData: {
      symbol: string;
      side: 'buy' | 'sell';
      quantity: number;
      price?: number;
    }
  ): Promise<void> {
    try {
      // Get all active followers of this leader
      const { data: followers, error } = await supabase
        .from('copy_trading_subscriptions')
        .select('follower_id')
        .eq('leader_id', leaderId)
        .eq('is_active', true);

      if (error || !followers || followers.length === 0) {
        console.log('No active followers to notify');
        return;
      }

      // Send notification to each follower
      const notificationPromises = followers.map((follower) =>
        WebSocketService.sendTradeNotification(follower.follower_id, {
          type: 'leader_trade',
          leaderId,
          leaderName,
          symbol: tradeData.symbol,
          side: tradeData.side,
          quantity: tradeData.quantity,
          price: tradeData.price,
          message: `${leaderName} executed a ${tradeData.side} order for ${tradeData.quantity} shares of ${tradeData.symbol}${
            tradeData.price ? ` at $${tradeData.price.toFixed(2)}` : ''
          }.`,
        })
      );

      await Promise.all(notificationPromises);
      console.log(`Notified ${followers.length} followers of leader trade`);
    } catch (error) {
      console.error('Error notifying followers of leader trade:', error);
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trade_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      return !error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('trade_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error getting unread notification count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadNotificationCount:', error);
      return 0;
    }
  }

  /**
   * Get recent notifications for a user
   */
  static async getRecentNotifications(
    userId: string,
    limit: number = 20
  ): Promise<WebSocketNotification[]> {
    try {
      const { data, error } = await supabase
        .from('trade_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting recent notifications:', error);
        return [];
      }

      return (data || []).map((notification) => ({
        id: notification.id,
        userId: notification.user_id,
        data: notification.data,
        timestamp: notification.created_at,
        read: notification.read,
      }));
    } catch (error) {
      console.error('Error in getRecentNotifications:', error);
      return [];
    }
  }

  /**
   * Disconnect from real-time notifications
   */
  disconnect(): void {
    if (this.supabaseChannel) {
      supabase.removeChannel(this.supabaseChannel);
      this.supabaseChannel = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }

  /**
   * Check if service is connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const webSocketService = WebSocketService.getInstance();