import { offlineStorage } from './offline-storage';
import { supabase } from './supabase';

interface SyncResult {
  success: boolean;
  syncedActions: number;
  failedActions: number;
  errors: string[];
}

class OfflineSyncManager {
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private syncCallbacks: Array<(result: SyncResult) => void> = [];

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Initialize offline storage
    offlineStorage.init().catch(console.error);
  }

  private handleOnline() {
    this.isOnline = true;
    this.syncPendingActions();
  }

  private handleOffline() {
    this.isOnline = false;
  }

  // Cache portfolio data for offline access
  async cachePortfolioData(portfolioData: any): Promise<void> {
    try {
      await offlineStorage.cacheData('portfolio', portfolioData, 30); // 30 minutes TTL
      await offlineStorage.setLastSyncTime('portfolio', Date.now());
    } catch (error) {
      console.error('Failed to cache portfolio data:', error);
    }
  }

  // Cache user positions
  async cachePositions(positions: any[]): Promise<void> {
    try {
      await offlineStorage.cacheData('positions', positions, 15); // 15 minutes TTL
      await offlineStorage.setLastSyncTime('positions', Date.now());
    } catch (error) {
      console.error('Failed to cache positions:', error);
    }
  }

  // Cache market data
  async cacheMarketData(marketData: any): Promise<void> {
    try {
      await offlineStorage.cacheData('market_data', marketData, 5); // 5 minutes TTL
      await offlineStorage.setLastSyncTime('market_data', Date.now());
    } catch (error) {
      console.error('Failed to cache market data:', error);
    }
  }

  // Get cached data when offline
  async getCachedPortfolioData(): Promise<any | null> {
    try {
      return await offlineStorage.getCachedData('portfolio');
    } catch (error) {
      console.error('Failed to get cached portfolio data:', error);
      return null;
    }
  }

  async getCachedPositions(): Promise<any[] | null> {
    try {
      return await offlineStorage.getCachedData('positions');
    } catch (error) {
      console.error('Failed to get cached positions:', error);
      return null;
    }
  }

  async getCachedMarketData(): Promise<any | null> {
    try {
      return await offlineStorage.getCachedData('market_data');
    } catch (error) {
      console.error('Failed to get cached market data:', error);
      return null;
    }
  }

  // Queue actions for offline execution
  async queueTradeAction(tradeData: any): Promise<void> {
    try {
      await offlineStorage.queueAction({
        type: 'trade',
        payload: tradeData,
        maxRetries: 3
      });
    } catch (error) {
      console.error('Failed to queue trade action:', error);
      throw error;
    }
  }

  async queueFollowAction(traderId: string, allocationPercentage: number): Promise<void> {
    try {
      await offlineStorage.queueAction({
        type: 'follow',
        payload: { traderId, allocationPercentage },
        maxRetries: 3
      });
    } catch (error) {
      console.error('Failed to queue follow action:', error);
      throw error;
    }
  }

  async queueUnfollowAction(traderId: string): Promise<void> {
    try {
      await offlineStorage.queueAction({
        type: 'unfollow',
        payload: { traderId },
        maxRetries: 3
      });
    } catch (error) {
      console.error('Failed to queue unfollow action:', error);
      throw error;
    }
  }

  async queueSettingsUpdate(settings: any): Promise<void> {
    try {
      await offlineStorage.queueAction({
        type: 'settings',
        payload: settings,
        maxRetries: 2
      });
    } catch (error) {
      console.error('Failed to queue settings update:', error);
      throw error;
    }
  }

  // Enhanced sync with better retry logic and progress tracking
  async syncPendingActions(): Promise<SyncResult> {
    if (!this.isOnline || this.syncInProgress) {
      return { success: false, syncedActions: 0, failedActions: 0, errors: ['Sync already in progress or offline'] };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      syncedActions: 0,
      failedActions: 0,
      errors: []
    };

    try {
      const pendingActions = await offlineStorage.getPendingActions();
      console.log(`Starting sync of ${pendingActions.length} pending actions`);
      
      // Group actions by type for better sync organization
      const actionsByType = this.groupActionsByType(pendingActions);
      
      // Sync actions by priority (trades first, then follows, then settings)
      const syncOrder = ['trade', 'follow', 'unfollow', 'settings'];
      
      for (const actionType of syncOrder) {
        const actions = actionsByType[actionType] || [];
        if (actions.length === 0) continue;
        
        console.log(`Syncing ${actions.length} ${actionType} actions`);
        
        for (const action of actions) {
          try {
            // Add exponential backoff for retries
            const backoffDelay = this.calculateBackoffDelay(action.retryCount);
            if (backoffDelay > 0) {
              await this.delay(backoffDelay);
            }
            
            const success = await this.executeAction(action);
            
            if (success) {
              await offlineStorage.removeAction(action.id);
              result.syncedActions++;
              console.log(`Successfully synced ${action.type} action: ${action.id}`);
            } else {
              await this.handleFailedAction(action, result);
            }
          } catch (error) {
            console.error(`Failed to execute ${action.type} action:`, error);
            await this.handleFailedAction(action, result, error.message);
          }
        }
      }

      // Clean up expired cached data
      await offlineStorage.cleanupExpiredData();
      
      // Update sync timestamp
      await offlineStorage.setLastSyncTime('offline_actions', Date.now());

    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error}`);
      console.error('Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
    }

    // Notify callbacks
    this.syncCallbacks.forEach(callback => callback(result));
    
    console.log(`Sync completed: ${result.syncedActions} synced, ${result.failedActions} failed`);
    return result;
  }

  private groupActionsByType(actions: any[]): Record<string, any[]> {
    return actions.reduce((groups, action) => {
      const type = action.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(action);
      return groups;
    }, {});
  }

  private calculateBackoffDelay(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleFailedAction(action: any, result: SyncResult, errorMessage?: string): Promise<void> {
    if (action.retryCount < action.maxRetries) {
      await offlineStorage.incrementRetryCount(action.id);
      console.log(`Action ${action.id} will be retried (attempt ${action.retryCount + 1}/${action.maxRetries})`);
    } else {
      await offlineStorage.removeAction(action.id);
      result.failedActions++;
      const error = errorMessage || `Action ${action.type} failed after ${action.maxRetries} retries`;
      result.errors.push(error);
      console.error(`Action ${action.id} permanently failed:`, error);
    }
  }

  private async executeAction(action: any): Promise<boolean> {
    try {
      switch (action.type) {
        case 'trade':
          return await this.executeTrade(action.payload);
        case 'follow':
          return await this.executeFollow(action.payload);
        case 'unfollow':
          return await this.executeUnfollow(action.payload);
        case 'settings':
          return await this.executeSettingsUpdate(action.payload);
        default:
          console.warn(`Unknown action type: ${action.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to execute action ${action.type}:`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  private async executeTrade(tradeData: any): Promise<boolean> {
    try {
      // Execute trade via Supabase edge function
      const { error } = await supabase.functions.invoke('alpaca-orders', {
        body: tradeData
      });
      
      return !error;
    } catch (error) {
      console.error('Trade execution failed:', error);
      return false;
    }
  }

  private async executeFollow(payload: { traderId: string; allocationPercentage: number }): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('copy-trading-subscriptions', {
        body: {
          action: 'follow',
          traderId: payload.traderId,
          allocationPercentage: payload.allocationPercentage
        }
      });
      
      return !error;
    } catch (error) {
      console.error('Follow action failed:', error);
      return false;
    }
  }

  private async executeUnfollow(payload: { traderId: string }): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('copy-trading-subscriptions', {
        body: {
          action: 'unfollow',
          traderId: payload.traderId
        }
      });
      
      return !error;
    } catch (error) {
      console.error('Unfollow action failed:', error);
      return false;
    }
  }

  private async executeSettingsUpdate(settings: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(settings)
        .eq('id', settings.userId);
      
      return !error;
    } catch (error) {
      console.error('Settings update failed:', error);
      return false;
    }
  }

  // Enhanced sync status with detailed information
  async getSyncStatus(): Promise<{
    pendingActions: number;
    lastSyncTimes: Record<string, number | null>;
    actionsByType: Record<string, number>;
    syncInProgress: boolean;
    isOnline: boolean;
  }> {
    try {
      const pendingActions = await offlineStorage.getPendingActions();
      const lastSyncTimes = {
        portfolio: await offlineStorage.getLastSyncTime('portfolio'),
        positions: await offlineStorage.getLastSyncTime('positions'),
        market_data: await offlineStorage.getLastSyncTime('market_data'),
        offline_actions: await offlineStorage.getLastSyncTime('offline_actions')
      };

      // Count actions by type
      const actionsByType = pendingActions.reduce((counts, action) => {
        counts[action.type] = (counts[action.type] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      return {
        pendingActions: pendingActions.length,
        lastSyncTimes,
        actionsByType,
        syncInProgress: this.syncInProgress,
        isOnline: this.isOnline
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        pendingActions: 0,
        lastSyncTimes: {
          portfolio: null,
          positions: null,
          market_data: null,
          offline_actions: null
        },
        actionsByType: {},
        syncInProgress: false,
        isOnline: this.isOnline
      };
    }
  }

  // Get sync statistics for analytics
  async getSyncStatistics(): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageSyncTime: number;
    lastSyncResult: SyncResult | null;
  }> {
    try {
      // This would typically come from stored analytics
      // For now, return basic stats
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        averageSyncTime: 0,
        lastSyncResult: null
      };
    } catch (error) {
      console.error('Failed to get sync statistics:', error);
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        averageSyncTime: 0,
        lastSyncResult: null
      };
    }
  }

  // Add sync callback
  onSync(callback: (result: SyncResult) => void): () => void {
    this.syncCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.syncCallbacks.indexOf(callback);
      if (index > -1) {
        this.syncCallbacks.splice(index, 1);
      }
    };
  }

  // Manual sync trigger
  async forcSync(): Promise<SyncResult> {
    return this.syncPendingActions();
  }

  // Clear all offline data
  async clearOfflineData(): Promise<void> {
    try {
      await offlineStorage.clearAllData();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const offlineSync = new OfflineSyncManager();