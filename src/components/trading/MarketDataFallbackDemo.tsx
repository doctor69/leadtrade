/**
 * Demo component to test the market data fallback system
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMarketDataWithFallback } from '@/hooks/useMarketDataWithFallback';
import { Wifi, WifiOff, Activity, RefreshCw } from 'lucide-react';

const TEST_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];

export default function MarketDataFallbackDemo() {
  const [enabled, setEnabled] = useState(true);
  
  const {
    marketData,
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
    symbols: TEST_SYMBOLS,
    enabled,
    fallbackConfig: {
      pollInterval: 3000, // 3 seconds for demo
      maxRetries: 3,
      retryDelay: 1000 // 1 second
    }
  });

  const getConnectionIcon = () => {
    switch (connectionMode) {
      case 'websocket':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'rest':
        return <Activity className="h-4 w-4 text-orange-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Market Data Fallback Demo</span>
            {getConnectionIcon()}
          </CardTitle>
          <CardDescription>
            Testing WebSocket to REST API fallback system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Badge variant={connectionMode === 'websocket' ? 'default' : connectionMode === 'rest' ? 'secondary' : 'destructive'}>
                  {connectionMode.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Status: {connectionStatus}
                </span>
              </div>
              {isUsingFallback && (
                <div className="text-xs text-orange-600">
                  Using REST fallback - Polling every 3 seconds
                  {fallbackState.retryCount > 0 && ` (Retry ${fallbackState.retryCount}/3)`}
                </div>
              )}
              {error && (
                <div className="text-xs text-red-600">
                  Error: {error}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEnabled(!enabled)}
              >
                {enabled ? 'Disable' : 'Enable'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={reconnect}
                disabled={!enabled}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Reconnect
              </Button>
            </div>
          </div>

          {/* Market Data */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Market Data ({marketData.length} symbols)</h4>
            {marketData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {marketData.map((item) => (
                  <div key={item.symbol} className="p-2 border rounded text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{item.symbol}</span>
                      <span className="text-green-600">${item.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Bid: ${item.bid.toFixed(2)}</span>
                      <span>Ask: ${item.ask.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Updated: {new Date(item.lastUpdate).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                {enabled ? 'Loading market data...' : 'Market data disabled'}
              </div>
            )}
          </div>

          {/* Debug Info */}
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">Debug Info</summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {JSON.stringify({
                connectionMode,
                isConnected,
                connectionStatus,
                isUsingFallback,
                fallbackState,
                dataCount: marketData.length,
                lastUpdate: marketData[0]?.lastUpdate
              }, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}