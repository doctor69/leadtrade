import { useState, useEffect, useRef, useCallback } from 'react';
import { getAlpacaConfig, getCurrentUserTradingMode } from '../lib/trading-config';
import { getAuthenticatedUser } from '../lib/auth';

interface AlpacaQuote {
  symbol: string;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  timestamp: string;
}

interface AlpacaTrade {
  symbol: string;
  price: number;
  size: number;
  timestamp: string;
  conditions: string[];
}

interface MarketData {
  [symbol: string]: {
    symbol: string;
    price: number;
    bid: number;
    ask: number;
    volume: number;
    change: number;
    changePercent: number;
    lastUpdate: string;
  };
}

interface TradeNotification {
  id: string;
  type: 'leader_trade' | 'copied_trade' | 'trade_execution';
  leaderId?: string;
  leaderName?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  timestamp: string;
  message: string;
}

interface WebSocketConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
  authenticated: boolean;
}

export const useAlpacaWebSocket = (symbols: string[] = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'], enabled: boolean = true) => {
  const [marketData, setMarketData] = useState<MarketData>({});
  const [tradeNotifications, setTradeNotifications] = useState<TradeNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'authenticated'>('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1 second

  // Initialize market data with default values
  useEffect(() => {
    const initialData: MarketData = {};
    symbols.forEach(symbol => {
      initialData[symbol] = {
        symbol,
        price: 0,
        bid: 0,
        ask: 0,
        volume: 0,
        change: 0,
        changePercent: 0,
        lastUpdate: new Date().toISOString(),
      };
    });
    setMarketData(initialData);
  }, [symbols]);

  // Get WebSocket configuration based on user's trading mode
  const getWebSocketConfig = useCallback(async (): Promise<WebSocketConfig | null> => {
    try {
      const user = await getAuthenticatedUser();
      if (!user) {
        console.log('No authenticated user, using simulated data');
        return null;
      }

      const tradingMode = await getCurrentUserTradingMode();
      const config = getAlpacaConfig(tradingMode);

      return {
        url: config.wsUrl,
        apiKey: config.dataApiKey,
        apiSecret: config.dataApiSecret,
        authenticated: true
      };
    } catch (error) {
      console.error('Error getting WebSocket config:', error);
      return null;
    }
  }, []);

  // Calculate exponential backoff delay
  const getReconnectDelay = useCallback(() => {
    return Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts.current), 30000); // Max 30 seconds
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connecting or connected
    }

    try {
      setConnectionStatus('connecting');
      setError(null);

      const wsConfig = await getWebSocketConfig();

      if (!wsConfig) {
        console.log('No WebSocket config available, using simulated data');
        simulateRealTimeData();
        return;
      }

      if (!wsConfig.apiKey || !wsConfig.apiSecret) {
        console.log('API keys not found, using simulated data');
        simulateRealTimeData();
        return;
      }

      // Create WebSocket connection
      wsRef.current = new WebSocket(wsConfig.url);

      wsRef.current.onopen = () => {
        console.log('Connected to Alpaca WebSocket');
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection

        // Authenticate with Alpaca
        const authMessage = {
          action: 'auth',
          key: wsConfig.apiKey,
          secret: wsConfig.apiSecret,
        };

        wsRef.current?.send(JSON.stringify(authMessage));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (Array.isArray(data)) {
            data.forEach(message => {
              handleMessage(message);
            });
          } else {
            handleMessage(data);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Disconnected from Alpaca WebSocket', event.code, event.reason);
        setIsConnected(false);
        setIsAuthenticated(false);
        setConnectionStatus('disconnected');

        // Only attempt to reconnect if it wasn't a manual disconnect and we haven't exceeded max attempts
        if (enabled && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = getReconnectDelay();
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Max reconnection attempts reached. Please refresh the page.');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        setConnectionStatus('disconnected');
      };

    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      setError('Failed to connect to WebSocket');
      setConnectionStatus('disconnected');
    }
  }, [enabled, getWebSocketConfig, getReconnectDelay]);

  const handleMessage = useCallback((message: any) => {
    // Handle authentication success
    if (message.T === 'success' && message.msg === 'authenticated') {
      console.log('Successfully authenticated with Alpaca WebSocket');
      setIsAuthenticated(true);
      setConnectionStatus('authenticated');

      // Subscribe to quotes and trades for our symbols
      const subscribeMessage = {
        action: 'subscribe',
        quotes: symbols,
        trades: symbols,
      };
      wsRef.current?.send(JSON.stringify(subscribeMessage));
      return;
    }

    // Handle subscription confirmation
    if (message.T === 'subscription') {
      console.log('Subscription confirmed:', message);
      return;
    }

    // Handle authentication errors
    if (message.T === 'error') {
      console.error('WebSocket error:', message);
      setError(`WebSocket error: ${message.msg || 'Unknown error'}`);
      return;
    }

    // Handle quote data (Requirement 6.2)
    if (message.T === 'q') {
      const quote: AlpacaQuote = {
        symbol: message.S,
        bid: message.bp,
        ask: message.ap,
        bidSize: message.bs,
        askSize: message.as,
        timestamp: message.t,
      };

      updateMarketData(quote.symbol, {
        bid: quote.bid,
        ask: quote.ask,
        price: (quote.bid + quote.ask) / 2, // Mid price
        lastUpdate: quote.timestamp,
      });
    }

    // Handle trade data (Requirement 6.2)
    if (message.T === 't') {
      const trade: AlpacaTrade = {
        symbol: message.S,
        price: message.p,
        size: message.s,
        timestamp: message.t,
        conditions: message.c || [],
      };

      updateMarketData(trade.symbol, {
        price: trade.price,
        volume: trade.size,
        lastUpdate: trade.timestamp,
      });
    }
  }, [symbols]);

  const simulateRealTimeData = () => {
    setIsConnected(true);
    setError(null);

    // Initialize with realistic stock prices
    const basePrices: { [key: string]: number } = {
      'AAPL': 185.50,
      'TSLA': 240.80,
      'MSFT': 378.90,
      'GOOGL': 142.30,
      'AMZN': 155.20,
      'NVDA': 875.30,
      'META': 325.60,
      'NFLX': 445.80,
    };

    // Set initial prices
    setMarketData(prev => {
      const updated = { ...prev };
      symbols.forEach(symbol => {
        if (updated[symbol] && basePrices[symbol]) {
          updated[symbol] = {
            ...updated[symbol],
            price: basePrices[symbol],
            bid: basePrices[symbol] - 0.05,
            ask: basePrices[symbol] + 0.05,
            volume: Math.floor(Math.random() * 1000000) + 100000,
            lastUpdate: new Date().toISOString(),
          };
        }
      });
      return updated;
    });

    // Simulate price updates every 2-5 seconds
    const simulateUpdates = () => {
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      const basePrice = basePrices[randomSymbol];

      if (basePrice) {
        // Generate realistic price movement (±0.5% typically)
        const changePercent = (Math.random() - 0.5) * 1.0; // -0.5% to +0.5%
        const priceChange = basePrice * (changePercent / 100);
        const newPrice = basePrice + priceChange;

        // Update base price for next iteration
        basePrices[randomSymbol] = newPrice;

        updateMarketData(randomSymbol, {
          price: newPrice,
          bid: newPrice - 0.05,
          ask: newPrice + 0.05,
          volume: Math.floor(Math.random() * 10000) + 1000,
          lastUpdate: new Date().toISOString(),
        });
      }

      // Schedule next update
      setTimeout(simulateUpdates, Math.random() * 3000 + 2000); // 2-5 seconds
    };

    // Start simulation
    setTimeout(simulateUpdates, 1000);
  };

  const updateMarketData = (symbol: string, updates: Partial<MarketData[string]>) => {
    setMarketData(prev => {
      const current = prev[symbol];
      if (!current) return prev;

      const newPrice = updates.price || current.price;
      const oldPrice = current.price || newPrice;
      const change = newPrice - oldPrice;
      const changePercent = oldPrice && oldPrice !== 0 ? (change / oldPrice) * 100 : 0;

      return {
        ...prev,
        [symbol]: {
          ...current,
          ...updates,
          change: oldPrice && oldPrice !== 0 ? change : 0,
          changePercent: oldPrice && oldPrice !== 0 ? changePercent : 0,
        },
      };
    });
  };

  // Add trade notification (Requirement 6.3)
  const addTradeNotification = useCallback((notification: Omit<TradeNotification, 'id' | 'timestamp'>) => {
    const newNotification: TradeNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
    };

    setTradeNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50 notifications
  }, []);

  // Clear trade notifications
  const clearTradeNotifications = useCallback(() => {
    setTradeNotifications([]);
  }, []);

  // Remove specific trade notification
  const removeTradeNotification = useCallback((id: string) => {
    setTradeNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect'); // Normal closure
    }

    setIsConnected(false);
    setIsAuthenticated(false);
    setConnectionStatus('disconnected');
    reconnectAttempts.current = 0; // Reset reconnect attempts
  }, []);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      reconnectAttempts.current = 0; // Reset attempts for manual reconnect
      connect();
    }, 1000);
  }, [connect, disconnect]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    // Market data
    marketData: Object.values(marketData),

    // Connection status
    isConnected,
    isAuthenticated,
    connectionStatus,
    error,

    // Trade notifications (Requirement 6.4)
    tradeNotifications,
    addTradeNotification,
    clearTradeNotifications,
    removeTradeNotification,

    // Connection controls
    connect,
    disconnect,
    reconnect,
  };
};