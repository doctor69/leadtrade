import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineSync } from '@/lib/offline-sync';
import { useOfflineStatus } from './useOfflineStatus';

interface SyncStatus {
  pendingActions: number;
  lastSyncTimes: Record<string, number | null>;
  isLoading: boolean;
  error: string | null;
  lastSyncTime?: number | null;
}

interface SyncResult {
  success: boolean;
  syncedActions: number;
  failedActions: number;
  errors: string[];
}

interface SyncStatusCallback {
  (status: SyncStatus): void;
}

export function useOfflineSync() {
  const { isOnline } = useOfflineStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingActions: 0,
    lastSyncTimes: {},
    isLoading: false,
    error: null
  });
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const syncCallbacks = useRef<Set<SyncStatusCallback>>(new Set());

  // Update sync status
  const updateSyncStatus = useCallback(async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isLoading: true, error: null }));
      const status = await offlineSync.getSyncStatus();
      const newStatus = {
        pendingActions: status.pendingActions,
        lastSyncTimes: status.lastSyncTimes,
        isLoading: false,
        error: null,
        lastSyncTime: Math.max(
          ...Object.values(status.lastSyncTimes).filter((time): time is number => time !== null)
        ) || null
      };
      
      setSyncStatus(newStatus);
      
      // Notify callbacks
      syncCallbacks.current.forEach(callback => callback(newStatus));
    } catch (error) {
      const errorStatus = {
        pendingActions: 0,
        lastSyncTimes: {},
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to get sync status'
      };
      setSyncStatus(errorStatus);
      syncCallbacks.current.forEach(callback => callback(errorStatus));
    }
  }, []);

  // Register background sync with service worker
  const registerBackgroundSync = useCallback(async (tag: string) => {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service worker not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if background sync is supported
      if ('sync' in registration) {
        await (registration as any).sync.register(tag);
        console.log(`Background sync registered: ${tag}`);
        return true;
      } else {
        console.warn('Background sync not supported');
        return false;
      }
    } catch (error) {
      console.error('Failed to register background sync:', error);
      return false;
    }
  }, []);

  // Force sync with background sync registration
  const forceSync = useCallback(async () => {
    if (!isOnline) {
      setLastSyncResult({
        success: false,
        syncedActions: 0,
        failedActions: 0,
        errors: ['Cannot sync while offline']
      });
      return;
    }

    try {
      setSyncStatus(prev => ({ ...prev, isLoading: true, error: null }));
      const result = await offlineSync.forcSync();
      setLastSyncResult(result);
      await updateSyncStatus();
      
      // Also trigger background sync
      await registerBackgroundSync('offline-actions-sync');
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      }));
    }
  }, [isOnline, updateSyncStatus, registerBackgroundSync]);

  // Cache data methods
  const cachePortfolioData = useCallback(async (data: any) => {
    try {
      await offlineSync.cachePortfolioData(data);
      await updateSyncStatus();
    } catch (error) {
      console.error('Failed to cache portfolio data:', error);
    }
  }, [updateSyncStatus]);

  const cachePositions = useCallback(async (positions: any[]) => {
    try {
      await offlineSync.cachePositions(positions);
      await updateSyncStatus();
    } catch (error) {
      console.error('Failed to cache positions:', error);
    }
  }, [updateSyncStatus]);

  const cacheMarketData = useCallback(async (data: any) => {
    try {
      await offlineSync.cacheMarketData(data);
      await updateSyncStatus();
    } catch (error) {
      console.error('Failed to cache market data:', error);
    }
  }, [updateSyncStatus]);

  // Get cached data methods
  const getCachedPortfolioData = useCallback(async () => {
    try {
      return await offlineSync.getCachedPortfolioData();
    } catch (error) {
      console.error('Failed to get cached portfolio data:', error);
      return null;
    }
  }, []);

  const getCachedPositions = useCallback(async () => {
    try {
      return await offlineSync.getCachedPositions();
    } catch (error) {
      console.error('Failed to get cached positions:', error);
      return null;
    }
  }, []);

  const getCachedMarketData = useCallback(async () => {
    try {
      return await offlineSync.getCachedMarketData();
    } catch (error) {
      console.error('Failed to get cached market data:', error);
      return null;
    }
  }, []);



  // Queue action methods with background sync
  const queueTradeAction = useCallback(async (tradeData: any) => {
    try {
      await offlineSync.queueTradeAction(tradeData);
      await updateSyncStatus();
      
      // Register background sync for trade actions
      if (isOnline) {
        await registerBackgroundSync('trade-sync');
      }
    } catch (error) {
      console.error('Failed to queue trade action:', error);
      throw error;
    }
  }, [updateSyncStatus, isOnline, registerBackgroundSync]);

  const queueFollowAction = useCallback(async (traderId: string, allocationPercentage: number) => {
    try {
      await offlineSync.queueFollowAction(traderId, allocationPercentage);
      await updateSyncStatus();
      
      if (isOnline) {
        await registerBackgroundSync('copy-trading-sync');
      }
    } catch (error) {
      console.error('Failed to queue follow action:', error);
      throw error;
    }
  }, [updateSyncStatus, isOnline, registerBackgroundSync]);

  const queueUnfollowAction = useCallback(async (traderId: string) => {
    try {
      await offlineSync.queueUnfollowAction(traderId);
      await updateSyncStatus();
      
      if (isOnline) {
        await registerBackgroundSync('copy-trading-sync');
      }
    } catch (error) {
      console.error('Failed to queue unfollow action:', error);
      throw error;
    }
  }, [updateSyncStatus, isOnline, registerBackgroundSync]);

  const queueSettingsUpdate = useCallback(async (settings: any) => {
    try {
      await offlineSync.queueSettingsUpdate(settings);
      await updateSyncStatus();
      
      if (isOnline) {
        await registerBackgroundSync('settings-sync');
      }
    } catch (error) {
      console.error('Failed to queue settings update:', error);
      throw error;
    }
  }, [updateSyncStatus, isOnline, registerBackgroundSync]);

  // Clear offline data
  const clearOfflineData = useCallback(async () => {
    try {
      await offlineSync.clearOfflineData();
      await updateSyncStatus();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }, [updateSyncStatus]);

  // Initialize and set up sync callback
  useEffect(() => {
    updateSyncStatus();

    // Set up sync result callback
    const unsubscribe = offlineSync.onSync((result) => {
      setLastSyncResult(result);
      updateSyncStatus();
    });

    return unsubscribe;
  }, [updateSyncStatus]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && syncStatus.pendingActions > 0) {
      registerBackgroundSync('offline-actions-sync');
    }
  }, [isOnline, syncStatus.pendingActions, registerBackgroundSync]);

  // Subscribe to sync status changes
  const onSyncStatusChange = useCallback((callback: SyncStatusCallback) => {
    syncCallbacks.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      syncCallbacks.current.delete(callback);
    };
  }, []);

  // Get sync status for external components
  const getSyncStatus = useCallback(async () => {
    return await offlineSync.getSyncStatus();
  }, []);

  // Periodic sync registration
  const registerPeriodicSync = useCallback(async () => {
    try {
      await registerBackgroundSync('periodic-sync');
      console.log('Periodic sync registered');
    } catch (error) {
      console.error('Failed to register periodic sync:', error);
    }
  }, [registerBackgroundSync]);

  return {
    syncStatus,
    lastSyncResult,
    forceSync,
    forcSync: forceSync, // Alias for compatibility
    registerBackgroundSync,
    registerPeriodicSync,
    cachePortfolioData,
    cachePositions,
    cacheMarketData,
    getCachedPortfolioData,
    getCachedPositions,
    getCachedMarketData,
    queueTradeAction,
    queueFollowAction,
    queueUnfollowAction,
    queueSettingsUpdate,
    clearOfflineData,
    getSyncStatus,
    onSyncStatusChange
  };
}