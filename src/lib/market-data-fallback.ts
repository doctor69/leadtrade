/**
 * Market Data Fallback System
 * Provides seamless fallback from WebSocket to REST API polling
 * and automatic recovery when WebSocket becomes available
 */



export interface MarketDataPoint {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  change: number;
  changePercent: number;
  lastUpdate: string;
}

export interface FallbackConfig {
  pollInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  symbols: string[];
}

export type ConnectionMode = 'websocket' | 'rest' | 'disconnected';

export interface MarketDataFallbackState {
  mode: ConnectionMode;
  isPolling: boolean;
  lastUpdate: string | null;
  error: string | null;
  retryCount: number;
}

export class MarketDataFallbackService {
  private config: FallbackConfig;
  private state: MarketDataFallbackState;
  private pollTimer: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(data: MarketDataPoint[], state: MarketDataFallbackState) => void> = new Set();
  private lastKnownData: Map<string, MarketDataPoint> = new Map();

  constructor(config: FallbackConfig) {
    this.config = config;
    this.state = {
      mode: 'disconnected',
      isPolling: false,
      lastUpdate: null,
      error: null,
      retryCount: 0
    };
  }

  /**
   * Subscribe to market data updates
   */
  subscribe(callback: (data: MarketDataPoint[], state: MarketDataFallbackState) => void): () => void {
    this.listeners.add(callback);
    
    // Immediately send current data if available
    if (this.lastKnownData.size > 0) {
      callback(Array.from(this.lastKnownData.values()), this.state);
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Start fallback mode with REST API polling
   */
  startFallback(): void {
    if (this.state.isPolling) {
      return; // Already polling
    }

    console.log('🔄 Starting REST API fallback mode');
    this.state.mode = 'rest';
    this.state.isPolling = true;
    this.state.error = null;
    this.state.retryCount = 0;

    this.startPolling();
    this.notifyListeners();
  }

  /**
   * Stop fallback mode (WebSocket reconnected)
   */
  stopFallback(): void {
    console.log('✅ Stopping REST API fallback - WebSocket reconnected');
    this.state.mode = 'websocket';
    this.state.isPolling = false;
    this.state.error = null;

    this.stopPolling();
    this.notifyListeners();
  }

  /**
   * Update connection mode
   */
  setMode(mode: ConnectionMode): void {
    if (this.state.mode !== mode) {
      this.state.mode = mode;
      
      if (mode === 'websocket') {
        this.stopFallback();
      } else if (mode === 'rest') {
        this.startFallback();
      } else {
        this.stopPolling();
        this.state.isPolling = false;
      }
      
      this.notifyListeners();
    }
  }

  /**
   * Get current state
   */
  getState(): MarketDataFallbackState {
    return { ...this.state };
  }

  /**
   * Get last known data
   */
  getLastKnownData(): MarketDataPoint[] {
    return Array.from(this.lastKnownData.values());
  }

  /**
   * Update symbols to track
   */
  updateSymbols(symbols: string[]): void {
    this.config.symbols = symbols;
    
    // Remove data for symbols no longer tracked
    for (const symbol of this.lastKnownData.keys()) {
      if (!symbols.includes(symbol)) {
        this.lastKnownData.delete(symbol);
      }
    }

    // If currently polling, restart with new symbols
    if (this.state.isPolling) {
      this.stopPolling();
      this.startPolling();
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopPolling();
    this.state.isPolling = false;
    this.state.mode = 'disconnected';
    this.listeners.clear();
    this.lastKnownData.clear();
  }

  private startPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }

    // Initial fetch
    this.fetchMarketData();

    // Set up polling interval
    this.pollTimer = setInterval(() => {
      this.fetchMarketData();
    }, this.config.pollInterval);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private async fetchMarketData(): Promise<void> {
    if (this.config.symbols.length === 0) {
      return;
    }

    try {
      const symbolsParam = this.config.symbols.join(',');
      const response = await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-market-quotes?symbols=${symbolsParam}&feed=iex`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch market data');
      }

      // Process the market data
      this.processMarketData(result.data);
      
      // Reset retry count on success
      this.state.retryCount = 0;
      this.state.error = null;
      this.state.lastUpdate = new Date().toISOString();

    } catch (error) {
      console.error('❌ REST API market data fetch failed:', error);
      this.handleFetchError(error);
    }
  }

  private processMarketData(data: any): void {
    if (!data || !Array.isArray(data.quotes)) {
      console.warn('⚠️ Invalid market data format received');
      return;
    }

    const updatedData: MarketDataPoint[] = [];

    for (const quote of data.quotes) {
      if (!quote.symbol) continue;

      const currentData = this.lastKnownData.get(quote.symbol);
      const newPrice = quote.latest_trade?.price || quote.bid || quote.ask || currentData?.price || 0;
      const oldPrice = currentData?.price || newPrice;
      
      const change = newPrice - oldPrice;
      const changePercent = oldPrice !== 0 ? (change / oldPrice) * 100 : 0;

      const marketDataPoint: MarketDataPoint = {
        symbol: quote.symbol,
        price: newPrice,
        bid: quote.bid || newPrice - 0.01,
        ask: quote.ask || newPrice + 0.01,
        volume: quote.latest_trade?.size || currentData?.volume || 0,
        change: change,
        changePercent: changePercent,
        lastUpdate: new Date().toISOString()
      };

      this.lastKnownData.set(quote.symbol, marketDataPoint);
      updatedData.push(marketDataPoint);
    }

    if (updatedData.length > 0) {
      this.notifyListeners();
    }
  }

  private handleFetchError(error: any): void {
    this.state.retryCount++;
    this.state.error = error instanceof Error ? error.message : 'Unknown error';

    if (this.state.retryCount < this.config.maxRetries) {
      console.log(`🔄 Retrying REST API fetch in ${this.config.retryDelay}ms (attempt ${this.state.retryCount}/${this.config.maxRetries})`);
      
      this.retryTimer = setTimeout(() => {
        this.fetchMarketData();
      }, this.config.retryDelay);
    } else {
      console.error('❌ Max retry attempts reached for REST API fallback');
      this.state.mode = 'disconnected';
      this.state.isPolling = false;
      this.stopPolling();
    }

    this.notifyListeners();
  }

  private notifyListeners(): void {
    const data = Array.from(this.lastKnownData.values());
    const state = { ...this.state };
    
    for (const listener of this.listeners) {
      try {
        listener(data, state);
      } catch (error) {
        console.error('❌ Error in market data listener:', error);
      }
    }
  }
}

// Default configuration
export const defaultFallbackConfig: FallbackConfig = {
  pollInterval: 5000, // 5 seconds
  maxRetries: 5,
  retryDelay: 2000, // 2 seconds
  symbols: []
};

// Singleton instance for global use
let globalFallbackService: MarketDataFallbackService | null = null;

export function getMarketDataFallbackService(config?: Partial<FallbackConfig>): MarketDataFallbackService {
  if (!globalFallbackService) {
    globalFallbackService = new MarketDataFallbackService({
      ...defaultFallbackConfig,
      ...config
    });
  }
  return globalFallbackService;
}