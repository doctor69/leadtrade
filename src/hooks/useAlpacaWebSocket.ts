import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getAuthenticatedUser } from '../lib/auth';
import { env } from '../lib/env';
import { decode } from '@msgpack/msgpack';

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

export const useAlpacaWebSocket = (symbols: string[] = [], enabled: boolean = true) => {
  // Memoize symbols to avoid unnecessary effect triggers
  const stableSymbols = useMemo(() => [...symbols].sort().join(','), [symbols]);
  const [marketData, setMarketData] = useState<MarketData>({});
  const [tradeNotifications, setTradeNotifications] = useState<TradeNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'authenticated' | 'listening'>('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1 second
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Only initialize market data if symbols are provided
  useEffect(() => {
    if (symbols && symbols.length > 0) {
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
    }
  }, [stableSymbols]);

  // Get WebSocket configuration for direct Alpaca connection
  const getWebSocketConfig = useCallback(async (): Promise<WebSocketConfig | null> => {
    try {
      console.log('🔧 Getting WebSocket configuration...');
      
      const user = await getAuthenticatedUser();
      console.log('👤 User authentication status:', user ? 'Authenticated' : 'Not authenticated');
      
      if (!user) {
        console.log('⚠️ No authenticated user found - proceeding with demo credentials');
      }

      // Get API credentials - prioritize Broker API keys for market data
      const alpacaApiKey = env.alpacaApiKey;
      const alpacaApiSecret = env.alpacaApiSecret;

      console.log('🔑 API Key available:', !!alpacaApiKey);
      console.log('🔐 API Secret available:', !!alpacaApiSecret);
      
      // Log which API key source we're using
      if (env.PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY) {
        console.log('🔍 API Key source: BROKER_SANDBOX');
        console.log('🔍 API Secret source: BROKER_SANDBOX');
      } else if (env.PUBLIC_ALPACA_BROKER_LIVE_API_KEY) {
        console.log('🔍 API Key source: BROKER_LIVE');
        console.log('🔍 API Secret source: BROKER_LIVE');
      } else if (env.PUBLIC_ALPACA_DATA_API_KEY) {
        console.log('🔍 API Key source: DATA_API');
        console.log('🔍 API Secret source: DATA_API');
      } else {
        console.log('🔍 API Key source: PAPER/LIVE');
        console.log('🔍 API Secret source: PAPER/LIVE');
      }

      if (!alpacaApiKey || !alpacaApiSecret) {
        console.error('❌ Alpaca API credentials not configured');
        setError('Alpaca API credentials not configured. For market data streaming, you need BROKER API keys or DATA API keys. Please check your environment variables.');
        return null;
      }

      // Use Alpaca Market Data WebSocket endpoint for real-time market data
      const wsUrl = env.alpacaMarketDataWsUrl;

      console.log('🌐 Using WebSocket URL:', wsUrl);
      console.log('🔍 URL source check:');
      console.log('  - env.alpacaMarketDataWsUrl:', env.alpacaMarketDataWsUrl);
      console.log('  - env.PUBLIC_ALPACA_MARKET_DATA_WS_URL:', env.PUBLIC_ALPACA_MARKET_DATA_WS_URL);
      console.log('  - env.PUBLIC_ALPACA_MARKET_DATA_SANDBOX_WS_URL:', env.PUBLIC_ALPACA_MARKET_DATA_SANDBOX_WS_URL);
      console.log('✅ WebSocket configuration ready');

      return {
        url: wsUrl,
        apiKey: alpacaApiKey,
        apiSecret: alpacaApiSecret,
        authenticated: true
      };
    } catch (error) {
      console.error('❌ Error getting WebSocket config:', error);
      setError('Failed to get WebSocket configuration');
      return null;
    }
  }, []);

  // Calculate exponential backoff delay
  const getReconnectDelay = useCallback(() => {
    return Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts.current), 30000); // Max 30 seconds
  }, []);

  // Start ping interval to keep connection alive
  const startPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds
  }, []);

  // Stop ping interval
  const stopPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
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
        console.log('No WebSocket config available');
        setError('Unable to configure WebSocket connection');
        setConnectionStatus('disconnected');
        return;
      }

      if (!wsConfig.url) {
        console.log('WebSocket URL not found');
        setError('WebSocket URL not configured');
        setConnectionStatus('disconnected');
        return;
      }

      // Create WebSocket connection directly to Alpaca
      console.log('🔌 Connecting to Alpaca WebSocket:', wsConfig.url);
      
      // Create WebSocket connection (no auth in URL for streaming endpoints)
      wsRef.current = new WebSocket(wsConfig.url);

      wsRef.current.onopen = () => {
        console.log('✅ Connected to Alpaca WebSocket');
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection

        // Authenticate with Alpaca streaming service
        if (wsConfig.authenticated && wsConfig.apiKey && wsConfig.apiSecret) {
          const authMessage = {
            action: 'auth',
            key: wsConfig.apiKey,
            secret: wsConfig.apiSecret,
          };
          console.log('🔐 Authenticating with Alpaca streaming service...');
          console.log('🔑 Using API Key:', wsConfig.apiKey.substring(0, 8) + '...');
          console.log('🔐 Using API Secret:', wsConfig.apiSecret.substring(0, 8) + '...');
          wsRef.current?.send(JSON.stringify(authMessage));
        } else {
          console.error('❌ API credentials required for Alpaca streaming');
          setError('API credentials required for Alpaca streaming');
          setConnectionStatus('disconnected');
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          console.log('📨 Received WebSocket message type:', typeof event.data);
          console.log('📨 Received WebSocket message:', event.data);
          
          if (event.data instanceof ArrayBuffer) {
            console.log('📦 Received ArrayBuffer message (trade update)');
            console.log('📦 ArrayBuffer size:', event.data.byteLength);
            try {
              // Decode MessagePack binary data
              const message = decode(event.data);
              console.log('📦 Decoded MessagePack message:', message);
              handleMessage(message);
            } catch (decodeError) {
              console.error('❌ Failed to decode MessagePack message:', decodeError);
              // Fallback to text decoding for debugging
              const textDecoder = new TextDecoder();
              const text = textDecoder.decode(event.data);
              console.log('📦 Raw binary as text:', text);
              try {
                const message = JSON.parse(text);
                handleMessage(message);
              } catch (jsonError) {
                console.error('❌ Failed to parse fallback text as JSON:', jsonError);
              }
            }
          } else if (event.data instanceof Blob) {
            console.log('📦 Received Blob message (trade update)');
            console.log('📦 Blob size:', event.data.size);
            console.log('📦 Blob type:', event.data.type);
            // Convert Blob to ArrayBuffer for MessagePack decoding
            event.data.arrayBuffer().then((arrayBuffer) => {
              console.log('📦 Converted Blob to ArrayBuffer, size:', arrayBuffer.byteLength);
              try {
                const message = decode(arrayBuffer);
                console.log('📦 Decoded MessagePack message from Blob:', message);
                handleMessage(message);
              } catch (decodeError) {
                console.error('❌ Failed to decode MessagePack message from Blob:', decodeError);
                // Fallback to text decoding for debugging
                const textDecoder = new TextDecoder();
                const text = textDecoder.decode(arrayBuffer);
                console.log('📦 Raw Blob as text:', text);
                try {
                  const message = JSON.parse(text);
                  handleMessage(message);
                } catch (jsonError) {
                  console.error('❌ Failed to parse fallback text as JSON:', jsonError);
                }
              }
            }).catch((blobError) => {
              console.error('❌ Failed to convert Blob to ArrayBuffer:', blobError);
            });
          } else {
            // Handle JSON messages
            console.log('📄 Received text message, attempting JSON parse');
            const message = JSON.parse(event.data);
            handleMessage(message);
          }
        } catch (err) {
          console.error('❌ Error parsing WebSocket message:', err);
          console.error('❌ Message data type:', typeof event.data);
          console.error('❌ Message data:', event.data);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setIsAuthenticated(false);
        setConnectionStatus('disconnected');
        
        // Stop ping interval
        stopPingInterval();

        // Only attempt to reconnect if it wasn't a manual disconnect and we haven't exceeded max attempts
        if (enabled && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = getReconnectDelay();
          console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('❌ Max reconnection attempts reached');
          setError('Max reconnection attempts reached. Please refresh the page.');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('WebSocket connection error');
        setConnectionStatus('disconnected');
      };

    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      setError('Failed to connect to WebSocket');
      setConnectionStatus('disconnected');
    }
  }, [enabled, getWebSocketConfig, getReconnectDelay, startPingInterval, stopPingInterval, symbols]);

  // Add trade notification (Requirement 6.3)
  const addTradeNotification = useCallback((notification: Omit<TradeNotification, 'id' | 'timestamp'>) => {
    const newNotification: TradeNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
    };

    setTradeNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50 notifications
  }, []);

  const updateMarketData = useCallback((symbol: string, updates: Partial<MarketData[string]>) => {
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
  }, []);

  const handleMessage = useCallback((message: any) => {
        console.log('🔍 Processing message type:', message.stream || message.T || 'unknown', message);
        
        // Handle authorization stream messages (new format)
        if (message.stream === 'authorization') {
            const authData = message.data;
            console.log('🔐 Authorization response:', authData);
            
            if (authData.status === 'authorized') {
                console.log('✅ Successfully authenticated with Alpaca streaming service');
                setIsAuthenticated(true);
                setConnectionStatus('authenticated');
                setError(null);
                startPingInterval();
                
                // Subscribe to market data using correct format
                const subscribeMessage = {
                    action: 'subscribe',
                    trades: symbols,
                    quotes: symbols,
                    bars: symbols
                };
                console.log('📡 Subscribing to market data with correct format:', subscribeMessage);
                wsRef.current?.send(JSON.stringify(subscribeMessage));
                return;
            } else if (authData.status === 'unauthorized') {
                console.error('❌ Alpaca authentication failed:', authData.message);
                setError(`Authentication failed: ${authData.message}. Please verify you are using BROKER API keys (not DATA API keys) and that they are correct.`);
                setConnectionStatus('disconnected');
                setIsAuthenticated(false);
                return;
            }
        }
        
        // Handle listening confirmation
        if (message.stream === 'listening') {
            const listenData = message.data;
            console.log('✅ Successfully subscribed to streams:', listenData.streams);
            setConnectionStatus('listening');
            return;
        }
        
        // Handle authentication success (legacy format)
        if (message.T === 'success' && message.msg === 'authenticated') {
            console.log('✅ Successfully authenticated with Alpaca streaming service');
            setIsAuthenticated(true);
            setConnectionStatus('authenticated');
            startPingInterval();
            
            // Subscribe to market data using correct format
            const subscribeMessage = {
                action: 'subscribe',
                trades: symbols,
                quotes: symbols,
                bars: symbols
            };
            console.log('📡 Subscribing to market data with correct format:', subscribeMessage);
            wsRef.current?.send(JSON.stringify(subscribeMessage));
            return;
        }

        // Handle authentication error (legacy format)
        if (message.T === 'error') {
            console.error('❌ Alpaca authentication error:', message);
            setError(`Authentication failed: ${message.msg || 'Unknown error'}`);
            setConnectionStatus('disconnected');
            return;
        }

        // Handle market data messages (trades, quotes, bars)
        if (message.T === 't' || message.T === 'q' || message.T === 'b') {
            console.log('📊 Received market data:', message);
            
            const symbol = message.S;
            if (!symbol) return;
            
            const updates: Partial<MarketData[string]> = {
                symbol,
                lastUpdate: message.t || new Date().toISOString(),
            };
            
            if (message.T === 't') {
                // Trade data
                updates.price = message.p;
                updates.volume = message.s || 0;
                // Estimate bid/ask from trade price
                updates.bid = message.p - 0.01;
                updates.ask = message.p + 0.01;
            } else if (message.T === 'q') {
                // Quote data
                updates.bid = message.bp;
                updates.ask = message.ap;
                updates.price = ((message.bp || 0) + (message.ap || 0)) / 2;
            } else if (message.T === 'b') {
                // Bar data (OHLC)
                updates.price = message.c; // Close price
                updates.volume = message.v || 0;
                // Estimate bid/ask from close price
                updates.bid = message.c - 0.01;
                updates.ask = message.c + 0.01;
            }
            
            updateMarketData(symbol, updates);
            return;
        }

        // Handle subscription confirmation
        if (message.T === 'subscription') {
            console.log('✅ Successfully subscribed to market data:', message);
            setConnectionStatus('listening');
            return;
        }

        // Handle trade updates (legacy format - for trading API)
        if (message.stream === 'trade_updates') {
            console.log('💰 Received trade update:', message);
            
            const tradeData = message.data;
            if (tradeData && tradeData.event) {
                // Extract trade information from the message
                const tradeInfo = {
                    symbol: tradeData.order?.symbol || 'Unknown',
                    side: tradeData.order?.side || 'unknown',
                    quantity: tradeData.qty || tradeData.order?.qty || 0,
                    price: tradeData.price || tradeData.order?.filled_avg_price || 0,
                    status: tradeData.event || 'executed',
                    timestamp: tradeData.timestamp || new Date().toISOString(),
                    orderId: tradeData.order?.id || tradeData.execution_id || '',
                    event: tradeData.event
                };
                
                console.log('📊 Processed trade info:', tradeInfo);
                
                // Add trade notification
                addTradeNotification({
                    type: 'trade_execution',
                    symbol: tradeInfo.symbol,
                    side: tradeInfo.side as 'buy' | 'sell',
                    quantity: tradeInfo.quantity,
                    price: tradeInfo.price,
                    message: `${tradeInfo.event.toUpperCase()}: ${tradeInfo.symbol} ${tradeInfo.side} ${tradeInfo.quantity} @ $${tradeInfo.price}`
                });
                
                // Update market data if we have price information
                if (tradeInfo.price && tradeInfo.symbol) {
                    updateMarketData(tradeInfo.symbol, {
                        price: tradeInfo.price,
                        lastUpdate: tradeInfo.timestamp
                    });
                }
            }
            return;
        }

        // Handle trade updates (legacy binary MessagePack format)
        if (message.T === 'trade_updates' || message.T === 'trade_update') {
            console.log('💰 Received legacy trade update:', message);
            
            // Extract trade information from the message
            const tradeInfo = {
                symbol: message.symbol || message.S || 'Unknown',
                side: message.side || message.s || 'unknown',
                quantity: message.qty || message.q || 0,
                price: message.price || message.p || 0,
                status: message.status || 'executed',
                timestamp: message.timestamp || new Date().toISOString(),
                orderId: message.order_id || message.id || '',
                event: message.event || 'fill'
            };
            
            console.log('📊 Processed legacy trade info:', tradeInfo);
            
            // Add trade notification
            addTradeNotification({
                type: 'trade_execution',
                symbol: tradeInfo.symbol,
                side: tradeInfo.side as 'buy' | 'sell',
                quantity: tradeInfo.quantity,
                price: tradeInfo.price,
                message: `${tradeInfo.event.toUpperCase()}: ${tradeInfo.symbol} ${tradeInfo.side} ${tradeInfo.quantity} @ $${tradeInfo.price}`
            });
            
            // Update market data if we have price information
            if (tradeInfo.price && tradeInfo.symbol) {
                updateMarketData(tradeInfo.symbol, {
                    price: tradeInfo.price,
                    lastUpdate: tradeInfo.timestamp
                });
            }
            return;
        }

        // Handle other message types
        console.log('📨 Unhandled message type:', message.stream || message.T || 'unknown', message);
    }, [addTradeNotification, updateMarketData, startPingInterval, symbols]);

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

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
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

  // Only reconnect if enabled or symbols change (using stableSymbols)
  useEffect(() => {
    let isUnmounted = false;
    let disconnecting = false;

    const doConnect = async () => {
      if (enabled) {
        // Always disconnect first to avoid overlap
        disconnecting = true;
        await new Promise<void>(resolve => {
          disconnect();
          // Wait a tick to ensure disconnect is processed
          setTimeout(() => {
            disconnecting = false;
            resolve();
          }, 250);
        });
        if (!isUnmounted) {
          connect();
        }
      } else {
        disconnect();
      }
    };

    doConnect();

    return () => {
      isUnmounted = true;
      disconnect();
    };
  }, [enabled, stableSymbols]);

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