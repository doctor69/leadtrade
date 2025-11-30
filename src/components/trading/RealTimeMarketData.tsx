import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useAlpacaWebSocket } from '@/hooks/useAlpacaWebSocket';
import { DataTable } from '@/components/ui/datatable';
import type { ColumnDef } from '@tanstack/react-table';

const COLUMNS: ColumnDef<any>[] = [
  { accessorKey: 'symbol', header: 'Symbol', cell: info => info.getValue() },
  { accessorKey: 'price', header: 'Price', cell: info => `$${Number(info.getValue()).toFixed(2)}` },
  { accessorKey: 'bid', header: 'Bid', cell: info => `$${Number(info.getValue()).toFixed(2)}` },
  { accessorKey: 'ask', header: 'Ask', cell: info => `$${Number(info.getValue()).toFixed(2)}` },
  { accessorKey: 'change', header: 'Change', cell: info => Number(info.getValue()) > 0 ? `+${Number(info.getValue()).toFixed(2)}` : Number(info.getValue()).toFixed(2) },
  { accessorKey: 'changePercent', header: 'Change %', cell: info => `${Number(info.getValue()).toFixed(2)}%` },
  { accessorKey: 'volume', header: 'Volume', cell: info => Number(info.getValue()).toLocaleString() },
  { accessorKey: 'lastUpdate', header: 'Last Update', cell: info => new Date(String(info.getValue())).toLocaleTimeString() },
];

// Dow Jones 30 symbols
const DOW_30_SYMBOLS = [
  'AAPL', 'AMGN', 'AXP', 'BA', 'CAT', 'CRM', 'CSCO', 'CVX', 'DIS', 'DOW',
  'GS', 'HD', 'HON', 'IBM', 'INTC', 'JNJ', 'JPM', 'KO', 'MCD', 'MMM',
  'MRK', 'MSFT', 'NKE', 'PG', 'TRV', 'UNH', 'V', 'VZ', 'WBA', 'WMT'
];

interface RealTimeMarketDataProps {
  symbols?: string[];
}

export { COLUMNS };
export default function RealTimeMarketData({ symbols }: RealTimeMarketDataProps) {
  const useSymbols = symbols && symbols.length > 0 ? symbols : DOW_30_SYMBOLS;
  const { marketData, isConnected, connectionStatus, connect, disconnect } = useAlpacaWebSocket(useSymbols);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    return price > 0 ? `$${price.toFixed(2)}` : '--';
  };

  const formatPercent = (percent: number) => {
    if (percent === 0) return '0.00%';
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '--';
    return new Date(timestamp).toLocaleTimeString();
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Header with Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>Top Trading Securities</span>
                {isConnected ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>
                Live market data for top ETFs and securities via Alpaca WebSocket API
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={
                connectionStatus === 'authenticated' ? "default" : 
                connectionStatus === 'connected' ? "secondary" :
                connectionStatus === 'connecting' ? "outline" : "destructive"
              }>
                {connectionStatus === 'authenticated' ? 'Authenticated' :
                 connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={isConnected ? disconnect : connect}
                disabled={connectionStatus === 'connecting'}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isConnected ? 'Disconnect' : 'Connect'}
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </CardHeader>
      </Card>

      {/* Market Data Table with Pagination */}
      <Card>
        <CardHeader>
          <CardTitle>Top Trading Securities</CardTitle>
          <CardDescription>Real-time quotes and trades for major ETFs and securities</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={COLUMNS} data={marketData} />
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <p>• Live data shown from Alpaca WebSocket API</p>
            <p>• Shows top ETFs and securities by trading volume and market cap</p>
            <p>• Bid/Ask spreads and volume data included</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}