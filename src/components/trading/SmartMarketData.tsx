import { useEffect, useState } from 'react';
// import { useWebSocket } from '../WebSocketProvider'; // Removed WebSocket
import { apiService } from '@/lib/apiService';
import { DataTable } from '../ui/datatable';
import { COLUMNS } from './RealTimeMarketData';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// Dow Jones 30 symbols
const DOW_30_SYMBOLS = [
  'AAPL', 'AMGN', 'AXP', 'BA', 'CAT', 'CRM', 'CSCO', 'CVX', 'DIS', 'DOW',
  'GS', 'HD', 'HON', 'IBM', 'INTC', 'JNJ', 'JPM', 'KO', 'MCD', 'MMM',
  'MRK', 'MSFT', 'NKE', 'PG', 'TRV', 'UNH', 'V', 'VZ', 'WBA', 'WMT'
];

export default function SmartMarketData() {
  if (typeof window === 'undefined') {
    // Prevent SSR context error
    return null;
  }
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userSymbols, setUserSymbols] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  // const { subscribe, unsubscribe, marketData, isConnected, error } = useWebSocket(); // Removed WebSocket
  const marketData: any = {}; // Placeholder
  const isConnected = false; // Placeholder
  const error: string | null = null; // Placeholder
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    const checkLoginStatus = () => {
      const accessToken = document.cookie.includes('sb-access-token');
      setIsLoggedIn(accessToken);
    };
    checkLoginStatus();
    window.addEventListener('storage', checkLoginStatus);
    window.addEventListener('focus', checkLoginStatus);
    return () => {
      window.removeEventListener('storage', checkLoginStatus);
      window.removeEventListener('focus', checkLoginStatus);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (isLoggedIn) {
      setLoading(true);
      apiService.getPositions().then((result) => {
        if (!active) return;
        if (result.success && result.data) {
          const symbols = Array.from(new Set(result.data.map(pos => pos.symbol)));
          setUserSymbols(symbols.length > 0 ? symbols : null);
        } else {
          setUserSymbols(null);
        }
        setLoading(false);
      });
    } else {
      setUserSymbols(null);
    }
    return () => { active = false; };
  }, [isLoggedIn]);

  useEffect(() => {
    // Subscribe to user's symbols or Dow 30
    const symbolsToSub = isLoggedIn && userSymbols && userSymbols.length > 0 ? userSymbols : DOW_30_SYMBOLS;
    subscribe(['trades', 'quotes', 'bars', 'trade_updates'], symbolsToSub);
    return () => {
      unsubscribe(['trades', 'quotes', 'bars', 'trade_updates'], symbolsToSub);
    };
  }, [isLoggedIn, userSymbols, subscribe, unsubscribe]);

  // Log websocket data for debugging
  useEffect(() => {
    setLog((prev) => [
      `[${new Date().toLocaleTimeString()}] Connection: ${isConnected ? 'Connected' : 'Disconnected'}`,
      ...prev.slice(0, 99)
    ]);
  }, [isConnected]);
  useEffect(() => {
    setLog((prev) => [
      `[${new Date().toLocaleTimeString()}] Data: ${JSON.stringify(marketData)}`,
      ...prev.slice(0, 99)
    ]);
  }, [marketData]);
  useEffect(() => {
    if (error) setLog((prev) => [
      `[${new Date().toLocaleTimeString()}] Error: ${error}`,
      ...prev.slice(0, 99)
    ]);
  }, [error]);

  if (!mounted || (isLoggedIn && loading)) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Debug: log market data
  console.log('Alpaca marketData:', marketData);
  console.log('SmartMarketData component is mounted');

  // Connection status badge
  const statusColor = isConnected ? 'bg-green-500' : 'bg-red-500';
  const statusText = isConnected ? 'Connected' : 'Disconnected';
  const symbolCount = Object.keys(marketData).length;

  return (
    <div className="border-2 border-red-500 p-2 mb-4">
      <div className="text-red-500 font-bold mb-2">
        DEBUG: SmartMarketData is mounted and rendering.
      </div>
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Market Data Table</TabsTrigger>
          <TabsTrigger value="raw">WebSocket Log</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge className={statusColor}>{statusText}</Badge>
              <span className="text-sm text-muted-foreground">{symbolCount} symbols</span>
              {error && <span className="text-red-600 ml-4">{error}</span>}
            </div>
            <DataTable columns={COLUMNS} data={Object.values(marketData)} />
          </div>
        </TabsContent>
        <TabsContent value="raw">
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md max-h-96 overflow-auto text-xs font-mono">
            {log.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}