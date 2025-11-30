import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOfflineSync } from '@/hooks/useOfflineSync';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: number;
  lastSyncTime: number | null;
  syncProgress: number;
  syncErrors: string[];
}

interface BackgroundSyncManagerProps {
  className?: string;
  showDetails?: boolean;
}

export function BackgroundSyncManager({ 
  className = '', 
  showDetails = false 
}: BackgroundSyncManagerProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingActions: 0,
    lastSyncTime: null,
    syncProgress: 0,
    syncErrors: []
  });

  const [syncHistory, setSyncHistory] = useState<Array<{
    timestamp: number;
    type: string;
    success: boolean;
    syncedCount?: number;
    failedCount?: number;
  }>>([]);

  const { 
    getSyncStatus, 
    forcSync, 
    registerBackgroundSync,
    onSyncStatusChange 
  } = useOfflineSync();

  // Update sync status
  const updateSyncStatus = useCallback(async () => {
    try {
      const status = await getSyncStatus();
      setSyncStatus(prev => ({
        ...prev,
        pendingActions: status.pendingActions,
        lastSyncTime: Math.max(
          status.lastSyncTimes.portfolio || 0,
          status.lastSyncTimes.positions || 0,
          status.lastSyncTimes.market_data || 0
        ) || null
      }));
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  }, [getSyncStatus]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      // Trigger background sync when coming online
      registerBackgroundSync('offline-actions-sync');
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false, isSyncing: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [registerBackgroundSync]);

  // Handle service worker messages
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      switch (type) {
        case 'SYNC_START':
          setSyncStatus(prev => ({ 
            ...prev, 
            isSyncing: true, 
            syncProgress: 0,
            syncErrors: []
          }));
          break;

        case 'SYNC_COMPLETE':
          setSyncStatus(prev => ({ 
            ...prev, 
            isSyncing: false, 
            syncProgress: 100,
            lastSyncTime: data.timestamp || Date.now()
          }));
          
          // Add to sync history
          setSyncHistory(prev => [
            {
              timestamp: data.timestamp || Date.now(),
              type: data.syncType,
              success: data.success !== false,
              syncedCount: data.syncedCount,
              failedCount: data.failedCount
            },
            ...prev.slice(0, 9) // Keep last 10 entries
          ]);
          
          // Update pending actions count
          updateSyncStatus();
          break;

        case 'SYNC_ERROR':
          setSyncStatus(prev => ({ 
            ...prev, 
            isSyncing: false, 
            syncProgress: 0,
            syncErrors: [data.error]
          }));
          
          setSyncHistory(prev => [
            {
              timestamp: data.timestamp || Date.now(),
              type: data.syncType,
              success: false
            },
            ...prev.slice(0, 9)
          ]);
          break;

        case 'SYNC_PROGRESS':
          setSyncStatus(prev => ({ 
            ...prev, 
            syncProgress: data.progress || 0
          }));
          break;

        default:
          break;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [updateSyncStatus]);

  // Initial status load
  useEffect(() => {
    updateSyncStatus();
    
    // Set up periodic status updates
    const interval = setInterval(updateSyncStatus, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [updateSyncStatus]);

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = onSyncStatusChange?.((status) => {
      setSyncStatus(prev => ({
        ...prev,
        pendingActions: status.pendingActions,
        lastSyncTime: status.lastSyncTime || null
      }));
    });

    return unsubscribe;
  }, [onSyncStatusChange]);

  const handleManualSync = async () => {
    if (syncStatus.isSyncing || !syncStatus.isOnline) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncProgress: 0 }));
    
    try {
      await forcSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false, 
        syncErrors: [error instanceof Error ? error.message : String(error)] 
      }));
    }
  };

  const formatLastSyncTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getSyncStatusColor = () => {
    if (!syncStatus.isOnline) return 'text-red-600';
    if (syncStatus.isSyncing) return 'text-blue-600';
    if (syncStatus.pendingActions > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getSyncStatusIcon = () => {
    if (!syncStatus.isOnline) return <WifiOff className="h-4 w-4" />;
    if (syncStatus.isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (syncStatus.pendingActions > 0) return <Clock className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  if (!showDetails) {
    // Compact status indicator
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`flex items-center gap-1 ${getSyncStatusColor()}`}>
          {getSyncStatusIcon()}
          <span className="text-sm font-medium">
            {!syncStatus.isOnline ? 'Offline' :
             syncStatus.isSyncing ? 'Syncing...' :
             syncStatus.pendingActions > 0 ? `${syncStatus.pendingActions} pending` :
             'Synced'}
          </span>
        </div>
        
        {syncStatus.isOnline && syncStatus.pendingActions > 0 && !syncStatus.isSyncing && (
          <Button
            onClick={handleManualSync}
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
          >
            Sync Now
          </Button>
        )}
      </div>
    );
  }

  // Detailed sync manager
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {syncStatus.isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            Background Sync
          </div>
          <Badge variant={syncStatus.isOnline ? 'default' : 'destructive'}>
            {syncStatus.isOnline ? 'Online' : 'Offline'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Automatic synchronization of offline actions and data updates
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sync Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <div className={`flex items-center gap-1 ${getSyncStatusColor()}`}>
              {getSyncStatusIcon()}
              <span className="text-sm">
                {!syncStatus.isOnline ? 'Offline' :
                 syncStatus.isSyncing ? 'Syncing...' :
                 syncStatus.pendingActions > 0 ? `${syncStatus.pendingActions} actions pending` :
                 'All synced'}
              </span>
            </div>
          </div>
          
          {syncStatus.isSyncing && (
            <Progress value={syncStatus.syncProgress} className="h-2" />
          )}
        </div>

        {/* Last Sync Time */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Last Sync</span>
          <span className="text-sm text-gray-600">
            {formatLastSyncTime(syncStatus.lastSyncTime)}
          </span>
        </div>

        {/* Pending Actions */}
        {syncStatus.pendingActions > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pending Actions</span>
            <Badge variant="outline">
              {syncStatus.pendingActions}
            </Badge>
          </div>
        )}

        {/* Sync Errors */}
        {syncStatus.syncErrors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Sync Errors</span>
            </div>
            <div className="space-y-1">
              {syncStatus.syncErrors.map((error, index) => (
                <p key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Manual Sync Button */}
        <Button
          onClick={handleManualSync}
          disabled={syncStatus.isSyncing || !syncStatus.isOnline}
          className="w-full"
          size="sm"
        >
          {syncStatus.isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </>
          )}
        </Button>

        {/* Background Sync Registration Status */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Background Sync</span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span>Trade Actions</span>
              <Badge variant="outline" className="text-xs">
                {syncStatus.isOnline ? 'Active' : 'Queued'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span>Copy Trading</span>
              <Badge variant="outline" className="text-xs">
                {syncStatus.isOnline ? 'Active' : 'Queued'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span>Portfolio Data</span>
              <Badge variant="outline" className="text-xs">
                {syncStatus.isOnline ? 'Active' : 'Cached'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span>Settings</span>
              <Badge variant="outline" className="text-xs">
                {syncStatus.isOnline ? 'Active' : 'Queued'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Sync History */}
        {syncHistory.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Recent Syncs</span>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {syncHistory.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    {entry.success ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span className="capitalize">{entry.type.replace('-', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.syncedCount !== undefined && (
                      <span className="text-green-600">+{entry.syncedCount}</span>
                    )}
                    {entry.failedCount !== undefined && entry.failedCount > 0 && (
                      <span className="text-red-600">-{entry.failedCount}</span>
                    )}
                    <span className="text-gray-500">
                      {formatLastSyncTime(entry.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}