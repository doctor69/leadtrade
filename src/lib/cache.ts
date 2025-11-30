/**
 * Client-side caching utilities for frequently accessed data
 * Implements caching strategies for static pages with real-time updates
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  enablePersistence: boolean;
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      enablePersistence: true,
      ...config,
    };

    // Load persisted cache on initialization
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  /**
   * Set data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
    };

    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, entry);

    // Persist to localStorage if enabled
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      this.saveToStorage();
    }
  }

  /**
   * Get data from cache, returns null if expired or not found
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      this.saveToStorage();
    }
    
    return result;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      localStorage.removeItem('leadtrade-cache');
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0,
    };
  }

  private hitCount = 0;
  private missCount = 0;

  /**
   * Get or set pattern - fetch data if not in cache
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      this.hitCount++;
      return cached;
    }

    this.missCount++;
    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const serializable = Array.from(this.cache.entries());
      localStorage.setItem('leadtrade-cache', JSON.stringify(serializable));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('leadtrade-cache');
      if (stored) {
        const entries = JSON.parse(stored);
        this.cache = new Map(entries);
        
        // Clean up expired entries
        this.cleanupExpired();
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  /**
   * Remove expired entries from cache
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
  }
}

// Create singleton instances for different data types
export const marketDataCache = new DataCache({
  defaultTTL: 30 * 1000, // 30 seconds for market data
  maxSize: 50,
  enablePersistence: false, // Market data shouldn't persist across sessions
});

export const userDataCache = new DataCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes for user data
  maxSize: 100,
  enablePersistence: true,
});

export const leaderboardCache = new DataCache({
  defaultTTL: 2 * 60 * 1000, // 2 minutes for leaderboard
  maxSize: 20,
  enablePersistence: true,
});

export const staticDataCache = new DataCache({
  defaultTTL: 30 * 60 * 1000, // 30 minutes for static data
  maxSize: 50,
  enablePersistence: true,
});

// Cache key generators
export const cacheKeys = {
  marketData: (symbol: string) => `market:${symbol}`,
  userProfile: (userId: string) => `user:${userId}`,
  leaderboard: () => 'leaderboard:all',
  traderProfile: (traderId: string) => `trader:${traderId}`,
  portfolioHistory: (userId: string, period: string) => `portfolio:${userId}:${period}`,
  subscriptions: (userId: string) => `subscriptions:${userId}`,
} as const;

// Utility functions for common caching patterns
export const cacheUtils = {
  /**
   * Cache market data with automatic refresh
   */
  async cacheMarketData<T>(
    symbol: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    return marketDataCache.getOrSet(
      cacheKeys.marketData(symbol),
      fetcher,
      30 * 1000 // 30 seconds
    );
  },

  /**
   * Cache user data with longer TTL
   */
  async cacheUserData<T>(
    userId: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    return userDataCache.getOrSet(
      cacheKeys.userProfile(userId),
      fetcher,
      5 * 60 * 1000 // 5 minutes
    );
  },

  /**
   * Cache leaderboard data
   */
  async cacheLeaderboard<T>(
    fetcher: () => Promise<T>
  ): Promise<T> {
    return leaderboardCache.getOrSet(
      cacheKeys.leaderboard(),
      fetcher,
      2 * 60 * 1000 // 2 minutes
    );
  },

  /**
   * Invalidate related cache entries
   */
  invalidateUserCache(userId: string): void {
    userDataCache.delete(cacheKeys.userProfile(userId));
    userDataCache.delete(cacheKeys.subscriptions(userId));
    // Invalidate portfolio history for all periods
    ['1D', '1W', '1M', '3M', '1Y'].forEach(period => {
      userDataCache.delete(cacheKeys.portfolioHistory(userId, period));
    });
  },

  /**
   * Invalidate market data cache
   */
  invalidateMarketData(symbol?: string): void {
    if (symbol) {
      marketDataCache.delete(cacheKeys.marketData(symbol));
    } else {
      marketDataCache.clear();
    }
  },

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      marketData: marketDataCache.getStats(),
      userData: userDataCache.getStats(),
      leaderboard: leaderboardCache.getStats(),
      staticData: staticDataCache.getStats(),
    };
  },
};