import { useState, useEffect, useRef } from 'react';

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

export const useAlpacaWebSocket = (symbols: string[] = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'], enabled: boolean = true) => {
  const [marketData, setMarketData] = useState<MarketData>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const connect = () => {
    try {
      // For demo purposes, let's simulate real-time data if API keys aren't available
      const apiKey = import.meta.env.PUBLIC_ALPACA_DATA_API_KEY || import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY;
      const apiSecret = import.meta.env.PUBLIC_ALPACA_DATA_API_SECRET || import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET;

      if (!apiKey || !apiSecret) {
        console.log('API keys not found, using simulated data');
        simulateRealTimeData();
        return;
      }

      // Alpaca WebSocket URL for market data
      const wsUrl = 'wss://stream.data.alpaca.markets/v2/iex';
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Connected to Alpaca WebSocket');
        setIsConnected(true);
        setError(null);

        // Authenticate with Alpaca
        const authMessage = {
          action: 'auth',
          key: apiKey,
          secret: apiSecret,
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

      wsRef.current.onclose = () => {
        console.log('Disconnected from Alpaca WebSocket');
        setIsConnected(false);
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
      };

    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      setError('Failed to connect to WebSocket');
    }
  };

  const handleMessage = (message: any) => {
    if (message.T === 'success' && message.msg === 'authenticated') {
      // Subscribe to quotes and trades for our symbols
      const subscribeMessage = {
        action: 'subscribe',
        quotes: symbols,
        trades: symbols,
      };
      wsRef.current?.send(JSON.stringify(subscribeMessage));
    }

    // Handle quote data
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

    // Handle trade data
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
  };

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

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    setIsConnected(false);
  };

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled]);

  return {
    marketData: Object.values(marketData),
    isConnected,
    error,
    connect,
    disconnect,
  };
};