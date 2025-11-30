/**
 * Enhanced Market Data Hook with WebSocket and REST API Fallback
 * Automatically switches between WebSocket and REST API based on connection status
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAlpacaWebSocket } from './useAlpacaWebSocket';
import { 
  getMarketDataFallbackService, 
  type MarketDataPoint, 
  type MarketDataFallbackState,
  type ConnectionMode 
} from '../lib/market-data-fallback';

export interface UseMarketDataWithFallbackOptions {
  symbols: string[];
  enabled?: boolean;
  fallbackConfig?: {
    pollInterval?: number;
    maxRetries?: number;
    retryDelay?: number;
  };
}

export interface MarketDataWithFallbackResult {
  // Market data
  marketData: MarketDataPoint[];
  
  // Connection status
  connectionMode: ConnectionMode;
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionStatus: string;
  
  // Fallback status
  fallbackState: MarketDataFallbackState;
  isUsingFallback: boolean;
  
  // Error handling
  error: string | null;
  
  // Trade notifications (from WebSocket)
  tradeNotifications: any[];
  addTradeNotification: (notification: any) => void;
  clearTradeNotifications: () => void;
  removeTradeNotification: (id: string) => void;
  
  // Connection controls
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export const useMarketDataWithFallback = ({
  symbols,
  enabled = true,
  fallbackConfig = {}
}: UseMarketDataWithFallbackOptions): MarketDataWithFallbackResult => {
  
  // WebSocket hook
  const webSocketResult = useAlpacaWebSocket(symbols, enabled);
  
  // Fallback service state
  const [fallbackData, setFallbackData] = useState<MarketDataPoint[]>([]);
  const [fallbackState, setFallbackState] = useState<MarketDataFallbackState>({
    mode: 'disconnected',
    isPolling: false,
    lastUpdate: null,
    error: null,
    retryCount: 0
  });
  
  // Connection mode tracking
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('disconnected');
  const fallbackServiceRef = useRef<ReturnType<typeof getMarketDataFallbackService> | null>(null);
  const connectionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize fallback service
  useEffect(() => {
    if (!fallbackServiceRef.current) {
      fallbackServiceRef.current = getMarketDataFallbackService({
        symbols,
        pollInterval: fallbackConfig.pollInterval || 5000,
        maxRetries: fallbackConfig.maxRetries || 5,
        retryDelay: fallbackConfig.retryDelay || 2000
      });

      // Subscribe to fallback data updates
      const unsubscribe = fallbackServiceRef.current.subscribe((data, state) => {
        setFallbackData(data);
        setFallbackState(state);
      });

      return () => {
        unsubscribe();
        fallbackServiceRef.current?.destroy();
        fallbackServiceRef.current = null;
      };
    }
  }, [symbols, fallbackConfig.pollInterval, fallbackConfig.maxRetries, fallbackConfig.retryDelay]);

  // Update symbols in fallback service
  useEffect(() => {
    if (fallbackServiceRef.current) {
      fallbackServiceRef.current.updateSymbols(symbols);
    }
  }, [symbols]);

  // Monitor WebSocket connection and manage fallback
  useEffect(() => {
    if (!enabled) {
      setConnectionMode('disconnected');
      fallbackServiceRef.current?.setMode('disconnected');
      return;
    }

    // Clear any existing timeouts
    if (connectionCheckTimeoutRef.current) {
      clearTimeout(connectionCheckTimeoutRef.current);
    }
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
    }

    // Determine connection mode based on WebSocket status
    if (webSocketResult.isConnected && webSocketResult.isAuthenticated) {
      // WebSocket is working
      if (connectionMode !== 'websocket') {
        console.log('✅ WebSocket connected - switching from fallback');
        setConnectionMode('websocket');
        fallbackServiceRef.current?.setMode('websocket');
      }
    } else if (webSocketResult.connectionStatus === 'connecting') {
      // WebSocket is trying to connect - wait a bit before falling back
      connectionCheckTimeoutRef.current = setTimeout(() => {
        if (!webSocketResult.isConnected) {
          console.log('⚠️ WebSocket connection timeout - starting fallback');
          setConnectionMode('rest');
          fallbackServiceRef.current?.setMode('rest');
        }
      }, 10000); // Wait 10 seconds for WebSocket connection
    } else if (webSocketResult.error || webSocketResult.connectionStatus === 'disconnected') {
      // WebSocket failed or disconnected - start fallback immediately
      if (connectionMode !== 'rest') {
        console.log('❌ WebSocket failed - starting REST fallback');
        setConnectionMode('rest');
        fallbackServiceRef.current?.setMode('rest');
      }
    }

    // If WebSocket has been trying to connect for too long, fall back
    if (webSocketResult.connectionStatus === 'connecting') {
      fallbackTimeoutRef.current = setTimeout(() => {
        if (!webSocketResult.isConnected && connectionMode !== 'rest') {
          console.log('⏰ WebSocket connection taking too long - starting fallback');
          setConnectionMode('rest');
          fallbackServiceRef.current?.setMode('rest');
        }
      }, 15000); // 15 second timeout
    }

  }, [
    enabled,
    webSocketResult.isConnected,
    webSocketResult.isAuthenticated,
    webSocketResult.connectionStatus,
    webSocketResult.error,
    connectionMode
  ]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (connectionCheckTimeoutRef.current) {
        clearTimeout(connectionCheckTimeoutRef.current);
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, []);

  // Combine WebSocket and fallback data
  const getMarketData = useCallback((): MarketDataPoint[] => {
    if (connectionMode === 'websocket' && webSocketResult.marketData.length > 0) {
      // Use WebSocket data and convert format
      return webSocketResult.marketData.map(item => ({
        symbol: item.symbol,
        price: item.price,
        bid: item.bid,
        ask: item.ask,
        volume: item.volume,
        change: item.change,
        changePercent: item.changePercent,
        lastUpdate: item.lastUpdate
      }));
    } else if (connectionMode === 'rest' && fallbackData.length > 0) {
      // Use fallback REST data
      return fallbackData;
    } else {
      // No data available
      return [];
    }
  }, [connectionMode, webSocketResult.marketData, fallbackData]);

  // Determine overall error state
  const getError = useCallback((): string | null => {
    if (connectionMode === 'websocket') {
      return webSocketResult.error;
    } else if (connectionMode === 'rest') {
      return fallbackState.error;
    } else {
      return webSocketResult.error || fallbackState.error;
    }
  }, [connectionMode, webSocketResult.error, fallbackState.error]);

  return {
    // Market data
    marketData: getMarketData(),
    
    // Connection status
    connectionMode,
    isConnected: connectionMode === 'websocket' ? webSocketResult.isConnected : fallbackState.isPolling,
    isAuthenticated: webSocketResult.isAuthenticated,
    connectionStatus: connectionMode === 'websocket' 
      ? webSocketResult.connectionStatus 
      : fallbackState.isPolling ? 'polling' : 'disconnected',
    
    // Fallback status
    fallbackState,
    isUsingFallback: connectionMode === 'rest',
    
    // Error handling
    error: getError(),
    
    // Trade notifications (only from WebSocket)
    tradeNotifications: webSocketResult.tradeNotifications,
    addTradeNotification: webSocketResult.addTradeNotification,
    clearTradeNotifications: webSocketResult.clearTradeNotifications,
    removeTradeNotification: webSocketResult.removeTradeNotification,
    
    // Connection controls
    connect: webSocketResult.connect,
    disconnect: webSocketResult.disconnect,
    reconnect: webSocketResult.reconnect,
  };
};