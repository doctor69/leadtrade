import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/datatable';
import { TrendingUp, TrendingDown, Wifi, WifiOff, RefreshCw, ExternalLink, Activity } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useMarketDataWithFallback } from '@/hooks/useMarketDataWithFallback';
import { safeNavigate } from '@/lib/navigation';


// Market data interface based on Alpaca real-time data
interface MarketDataItem {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  lastUpdate: string;
  status: 'active' | 'inactive';
}

// Dow Jones Industrial Average 30 stocks
const DOW_JONES_30 = [
  'AAPL', 'AMGN', 'AXP', 'BA', 'CAT', 'CRM', 'CSCO', 'CVX', 'DIS', 'DOW',
  'GS', 'HD', 'HON', 'IBM', 'INTC', 'JNJ', 'JPM', 'KO', 'MCD', 'MMM',
  'MRK', 'MSFT', 'NKE', 'PG', 'TRV', 'UNH', 'V', 'VZ', 'WBA', 'WMT'
];

// Note: Global WebSocket connection management removed to prevent multiple connection issues

// Table columns configuration
const COLUMNS: ColumnDef<MarketDataItem>[] = [
  {
    accessorKey: 'symbol',
    header: 'Symbol',
    cell: ({ row }) => {
      const symbol = row.getValue('symbol') as string;
      return (
        <Button
          variant="ghost"
          className="font-medium p-0 h-auto hover:text-primary"
          onClick={() => safeNavigate(`/trade?symbol=${symbol}&type=stock`)}
        >
          {symbol}
        </Button>
      );
    },
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => {
      const price = parseFloat(row.getValue('price'));
      return <div className="font-mono">${price.toFixed(2)}</div>;
    },
  },
  {
    accessorKey: 'change',
    header: 'Change',
    cell: ({ row }) => {
      const change = parseFloat(row.getValue('change') || '0');
      const changePercent = parseFloat(String(row.original.changePercent || 0));
      const isPositive = change >= 0;

      return (
        <div className={`flex items-center space-x-1 ${isPositive ? 'text-positive' : 'text-negative'
          }`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span className="font-mono">
            {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'volume',
    header: 'Volume',
    cell: ({ row }) => {
      const volume = parseFloat(row.getValue('volume'));
      return <div className="font-mono">{volume.toLocaleString()}</div>;
    },
  },
  {
    accessorKey: 'high',
    header: 'High',
    cell: ({ row }) => {
      const high = parseFloat(row.getValue('high'));
      return <div className="font-mono text-positive">${high.toFixed(2)}</div>;
    },
  },
  {
    accessorKey: 'low',
    header: 'Low',
    cell: ({ row }) => {
      const low = parseFloat(row.getValue('low'));
      return <div className="font-mono text-negative">${low.toFixed(2)}</div>;
    },
  },
  {
    accessorKey: 'lastUpdate',
    header: 'Last Update',
    cell: ({ row }) => {
      const timestamp = row.getValue('lastUpdate') as string;
      return <div className="text-sm text-muted-foreground">{new Date(timestamp).toLocaleTimeString()}</div>;
    },
  },
  {
    id: 'actions',
    header: 'Trade',
    cell: ({ row }) => {
      const symbol = row.original.symbol;
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => safeNavigate(`/trade?symbol=${symbol}&type=stock`)}
          className="flex items-center space-x-1"
        >
          <ExternalLink className="h-3 w-3" />
          <span>Trade</span>
        </Button>
      );
    },
  },
];

export default function AlpacaMarketGrid() {
  // Use the new fallback hook
  const {
    marketData: rawMarketData,
    connectionMode,
    isConnected,
    connectionStatus,
    fallbackState,
    isUsingFallback,
    error,
    connect,
    disconnect,
    reconnect
  } = useMarketDataWithFallback({
    symbols: DOW_JONES_30,
    enabled: true,
    fallbackConfig: {
      pollInterval: 5000, // 5 seconds
      maxRetries: 5,
      retryDelay: 2000 // 2 seconds
    }
  });

  // Transform market data to match the expected format
  const marketData: MarketDataItem[] = rawMarketData.map(item => ({
    symbol: item.symbol,
    price: item.price,
    bid: item.bid,
    ask: item.ask,
    change: item.change,
    changePercent: item.changePercent,
    volume: item.volume,
    high: item.price, // Fallback to current price
    low: item.price, // Fallback to current price
    open: item.price, // Fallback to current price
    lastUpdate: item.lastUpdate,
    status: 'active' as const
  }));

  const isLoading = connectionStatus === 'connecting' || (isUsingFallback && fallbackState.retryCount > 0);

  // Get connection status display info
  const getConnectionInfo = () => {
    switch (connectionMode) {
      case 'websocket':
        return {
          icon: <Wifi className="h-5 w-5 text-primary" />,
          status: 'Live WebSocket',
          variant: 'default' as const,
          description: 'Real-time data via WebSocket connection'
        };
      case 'rest':
        return {
          icon: <Activity className="h-5 w-5 text-orange-500" />,
          status: 'REST Fallback',
          variant: 'secondary' as const,
          description: `Polling every ${fallbackState.isPolling ? '5' : '0'} seconds via REST API`
        };
      default:
        return {
          icon: <WifiOff className="h-5 w-5 text-destructive" />,
          status: error ? 'Error' : 'Disconnected',
          variant: error ? 'destructive' as const : 'secondary' as const,
          description: error || 'No connection to market data'
        };
    }
  };

  const connectionInfo = getConnectionInfo();

  return (
    <div className="space-y-6">
      {/* Header with Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>Live Market Data</span>
                {connectionInfo.icon}
              </CardTitle>
              <CardDescription>
                {connectionInfo.description}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={connectionInfo.variant}>
                {connectionInfo.status}
              </Badge>
              {isUsingFallback && fallbackState.retryCount > 0 && (
                <Badge variant="outline" className="text-orange-600">
                  Retry {fallbackState.retryCount}/5
                </Badge>
              )}
              <Button
                variant={isConnected ? "destructive" : "default"}
                size="sm"
                onClick={isConnected ? disconnect : reconnect}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Connecting...' : isConnected ? 'Disconnect' : 'Reconnect'}
              </Button>
            </div>
          </div>
          {error && (
            <div className="text-sm text-destructive mt-2">
              {error}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Market Data Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Dow Jones Industrial Average (DJIA)</CardTitle>
          <CardDescription>
            Real-time quotes for all 30 Dow Jones Industrial Average stocks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <DataTable 
              columns={COLUMNS} 
              data={marketData}
              enablePagination={true}
              pageSize={10}
            />
          )}

          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <p>- Data provided by Alpaca Markets via IEX feed</p>
            <p>- Showing all 30 Dow Jones Industrial Average component stocks</p>
            <p>- Connection: {connectionMode === 'websocket' ? 'Live WebSocket' : connectionMode === 'rest' ? 'REST API Fallback' : 'Disconnected'}</p>
            {isUsingFallback && (
              <p>- Automatic fallback: Updates every 5 seconds when WebSocket unavailable</p>
            )}
            <p>- Click any symbol to start trading</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}