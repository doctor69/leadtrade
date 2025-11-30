// IndexedDB wrapper for offline data management
interface OfflineAction {
  id: string;
  type: 'trade' | 'follow' | 'unfollow' | 'settings' | 'portfolio_update';
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface CachedData {
  id: string;
  type: 'portfolio' | 'positions' | 'market_data' | 'user_profile';
  data: any;
  timestamp: number;
  expiresAt: number;
}

class OfflineStorageManager {
  private dbName = 'LeadTradeOffline';
  private dbVersion = 2;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        // Create object stores for version 1
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('cached_data')) {
            const cachedDataStore = db.createObjectStore('cached_data', { keyPath: 'id' });
            cachedDataStore.createIndex('type', 'type', { unique: false });
            cachedDataStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          if (!db.objectStoreNames.contains('offline_actions')) {
            const actionsStore = db.createObjectStore('offline_actions', { keyPath: 'id' });
            actionsStore.createIndex('type', 'type', { unique: false });
            actionsStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          if (!db.objectStoreNames.contains('sync_status')) {
            db.createObjectStore('sync_status', { keyPath: 'key' });
          }
        }

        // Add new stores for version 2 (notification support)
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('preferences')) {
            const preferencesStore = db.createObjectStore('preferences', { keyPath: 'key' });
            preferencesStore.createIndex('type', 'type', { unique: false });
          }

          if (!db.objectStoreNames.contains('analytics')) {
            const analyticsStore = db.createObjectStore('analytics', { keyPath: 'id' });
            analyticsStore.createIndex('type', 'type', { unique: false });
            analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // Rename offline_actions to actions for consistency
          if (db.objectStoreNames.contains('offline_actions')) {
            db.deleteObjectStore('offline_actions');
          }
          
          if (!db.objectStoreNames.contains('actions')) {
            const actionsStore = db.createObjectStore('actions', { keyPath: 'id' });
            actionsStore.createIndex('type', 'type', { unique: false });
            actionsStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        }
      };
    });
  }

  // Cache data methods
  async cacheData(type: CachedData['type'], data: any, ttlMinutes: number = 60): Promise<void> {
    if (!this.db) await this.init();

    const cachedData: CachedData = {
      id: `${type}_${Date.now()}`,
      type,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cached_data'], 'readwrite');
      const store = transaction.objectStore('cached_data');
      
      const request = store.put(cachedData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedData(type: CachedData['type']): Promise<any | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cached_data'], 'readonly');
      const store = transaction.objectStore('cached_data');
      const index = store.index('type');
      
      const request = index.getAll(type);
      request.onsuccess = () => {
        const results = request.result;
        if (results.length === 0) {
          resolve(null);
          return;
        }

        // Get the most recent non-expired data
        const now = Date.now();
        const validData = results
          .filter(item => item.expiresAt > now)
          .sort((a, b) => b.timestamp - a.timestamp);

        resolve(validData.length > 0 ? validData[0].data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Offline actions methods
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    if (!this.db) await this.init();

    const offlineAction: OfflineAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      retryCount: 0,
      ...action
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      
      const request = store.put(offlineAction);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingActions(): Promise<OfflineAction[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actions'], 'readonly');
      const store = transaction.objectStore('actions');
      
      const request = store.getAll();
      request.onsuccess = () => {
        const actions = request.result.sort((a: OfflineAction, b: OfflineAction) => a.timestamp - b.timestamp);
        resolve(actions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removeAction(actionId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      
      const request = store.delete(actionId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async incrementRetryCount(actionId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      
      const getRequest = store.get(actionId);
      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.retryCount += 1;
          const putRequest = store.put(action);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Sync status methods
  async setLastSyncTime(key: string, timestamp: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_status'], 'readwrite');
      const store = transaction.objectStore('sync_status');
      
      const request = store.put({ key, timestamp });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLastSyncTime(key: string): Promise<number | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_status'], 'readonly');
      const store = transaction.objectStore('sync_status');
      
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.timestamp : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Cleanup methods
  async cleanupExpiredData(): Promise<void> {
    if (!this.db) await this.init();

    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cached_data'], 'readwrite');
      const store = transaction.objectStore('cached_data');
      
      const request = store.getAll();
      request.onsuccess = () => {
        const expiredItems = request.result.filter(item => item.expiresAt <= now);
        
        let deletedCount = 0;
        expiredItems.forEach(item => {
          const deleteRequest = store.delete(item.id);
          deleteRequest.onsuccess = () => {
            deletedCount++;
            if (deletedCount === expiredItems.length) {
              resolve();
            }
          };
        });

        if (expiredItems.length === 0) {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Notification preferences methods
  async savePreference(key: string, value: any, type: string = 'general'): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['preferences'], 'readwrite');
      const store = transaction.objectStore('preferences');
      
      const request = store.put({ key, value, type, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPreference(key: string): Promise<any | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['preferences'], 'readonly');
      const store = transaction.objectStore('preferences');
      
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Analytics methods
  async storeAnalytics(type: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    const analyticsData = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type,
      data,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['analytics'], 'readwrite');
      const store = transaction.objectStore('analytics');
      
      const request = store.put(analyticsData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAnalytics(type?: string, limit: number = 100): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['analytics'], 'readonly');
      const store = transaction.objectStore('analytics');
      
      let request: IDBRequest;
      if (type) {
        const index = store.index('type');
        request = index.getAll(type);
      } else {
        request = store.getAll();
      }
      
      request.onsuccess = () => {
        const results = request.result
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldAnalytics(olderThanDays: number = 30): Promise<void> {
    if (!this.db) await this.init();

    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['analytics'], 'readwrite');
      const store = transaction.objectStore('analytics');
      const index = store.index('timestamp');
      
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
      let deletedCount = 0;
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`Cleaned up ${deletedCount} old analytics entries`);
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const storeNames = ['cached_data', 'actions', 'sync_status', 'preferences', 'analytics'];
      const transaction = this.db!.transaction(storeNames, 'readwrite');
      
      let clearedStores = 0;
      const totalStores = storeNames.length;
      
      const onSuccess = () => {
        clearedStores++;
        if (clearedStores === totalStores) {
          resolve();
        }
      };

      storeNames.forEach(storeName => {
        if (this.db!.objectStoreNames.contains(storeName)) {
          transaction.objectStore(storeName).clear().onsuccess = onSuccess;
        } else {
          onSuccess(); // Skip non-existent stores
        }
      });
      
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageManager();