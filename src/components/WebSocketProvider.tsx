import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { env } from '@/lib/env';

// Types for channel subscriptions
export type ChannelType = 'trades' | 'quotes' | 'bars' | 'trade_updates';

interface WebSocketContextType {
  isConnected: boolean;
  marketData: Record<string, any>;
  tradeNotifications: any[];
  subscribe: (channels: ChannelType[], symbols: string[] | '*') => void;
  unsubscribe: (channels: ChannelType[], symbols: string[] | '*') => void;
  error?: string | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [marketData, setMarketData] = useState<Record<string, any>>({});
  const [tradeNotifications, setTradeNotifications] = useState<any[]>([]);
  const [pendingSubs, setPendingSubs] = useState<{channels: ChannelType[], symbols: string[] | '*'}[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Helper to send a message if connected, or queue if not
  const sendMessage = useCallback((msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      // Queue for after connection
      setPendingSubs(prev => [...prev, msg]);
    }
  }, []);

  // Subscribe to channels/symbols (supports '*' for all)
  const subscribe = useCallback((channels: ChannelType[], symbols: string[] | '*') => {
    sendMessage({ action: 'subscribe', ...Object.fromEntries(channels.map(c => [c, symbols])) });
  }, [sendMessage]);

  // Unsubscribe from channels/symbols
  const unsubscribe = useCallback((channels: ChannelType[], symbols: string[] | '*') => {
    sendMessage({ action: 'unsubscribe', ...Object.fromEntries(channels.map(c => [c, symbols])) });
  }, [sendMessage]);

  useEffect(() => {
    // Only connect if we have the required environment variables
    if (!env.alpacaMarketDataWsUrl || !env.alpacaApiKey || !env.alpacaApiSecret) {
      console.log('WebSocket connection skipped - missing environment variables');
      setError('WebSocket configuration incomplete');
      return;
    }

    // Don't connect on signup/signin pages to avoid unnecessary connections
    if (typeof window !== 'undefined' && (
      window.location.pathname.includes('/signup') || 
      window.location.pathname.includes('/signin') ||
      window.location.pathname.includes('/auth')
    )) {
      console.log('WebSocket connection skipped - on auth page');
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        console.log('Connecting to WebSocket:', env.alpacaMarketDataWsUrl);
        ws = new WebSocket(env.alpacaMarketDataWsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected successfully');
          setIsConnected(true);
          setError(null);
          
          // Authenticate (API key/secret)
          ws?.send(JSON.stringify({
            action: 'auth',
            key: env.alpacaApiKey,
            secret: env.alpacaApiSecret,
          }));
          
          // Send any queued subscriptions
          setTimeout(() => {
            setPendingSubs(prev => {
              prev.forEach(msg => ws?.send(JSON.stringify(msg)));
              return [];
            });
          }, 500);
        };

        ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          
          // Only attempt reconnection if it wasn't a clean close and we're not on auth pages
          if (event.code !== 1000 && typeof window !== 'undefined' && 
              !window.location.pathname.includes('/signup') && 
              !window.location.pathname.includes('/signin') &&
              !window.location.pathname.includes('/auth')) {
            console.log('Attempting to reconnect in 5 seconds...');
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };

        ws.onerror = (e) => {
          console.error('WebSocket error:', e);
          setIsConnected(false);
          setError('WebSocket connection error - this is normal on signup/signin pages');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Market data: trades, quotes, bars
            if (Array.isArray(data)) {
              data.forEach(msg => handleMessage(msg));
            } else {
              handleMessage(data);
            }
          } catch (e) {
            // Ignore parse errors
            console.warn('Failed to parse WebSocket message:', e);
          }
        };

        function handleMessage(msg: any) {
          if (msg.T === 't' || msg.T === 'q' || msg.T === 'b') {
            // Market data update
            setMarketData(prev => ({ ...prev, [msg.S]: { ...(prev[msg.S] || {}), ...msg } }));
          } else if (msg.T === 'trade_updates' || msg.stream === 'trade_updates') {
            setTradeNotifications(prev => [msg, ...prev.slice(0, 49)]);
          } else if (msg.T === 'error' && msg.msg) {
            setError(msg.msg);
          }
          // You can handle more message types here as needed
        }
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setError('Failed to initialize WebSocket connection');
      }
    };

    // Initial connection
    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    marketData,
    tradeNotifications,
    subscribe,
    unsubscribe,
    error,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return ctx;
}; 