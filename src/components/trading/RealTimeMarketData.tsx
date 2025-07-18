import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useAlpacaWebSocket } from '@/hooks/useAlpacaWebSocket';

const POPULAR_SYMBOLS = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'NFLX'];

export default function RealTimeMarketData() {
  const { 
    marketData, 
    isConnected, 
    isAuthenticated,
    connectionStatus,
    error, 
    connect, 
    disconnect,
    reconnect 
  } = useAlpacaWebSocket(POPULAR_SYMBOLS);
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
                <span>Real-Time Market Data</span>
                {isConnected ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>
                Live stock prices via Alpaca WebSocket API
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
              {isAuthenticated && (
                <Badge variant="outline" className="text-xs">
                  Real-time Data
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={isConnected ? disconnect : reconnect}
                disabled={connectionStatus === 'connecting'}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isConnected ? 'Disconnect' : 'Reconnect'}
              </Button>
            </div>
          </div>
          
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 mt-2">
              Error: {error}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </CardHeader>
      </Card>

      {/* Market Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Live Stock Prices</CardTitle>
          <CardDescription>Real-time quotes and trades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Bid</TableHead>
                  <TableHead className="text-right">Ask</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Change %</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Last Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {isConnected ? 'Waiting for market data...' : 'Not connected to market data feed'}
                    </TableCell>
                  </TableRow>
                ) : (
                  marketData.map((stock) => (
                    <TableRow key={stock.symbol} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span>{stock.symbol}</span>
                          {stock.change !== 0 && (
                            <div className="flex items-center">
                              {stock.change > 0 ? (
                                <TrendingUp className="h-3 w-3 text-green-500" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right font-mono">
                        {formatPrice(stock.price)}
                      </TableCell>
                      
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {formatPrice(stock.bid)}
                      </TableCell>
                      
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {formatPrice(stock.ask)}
                      </TableCell>
                      
                      <TableCell className={`text-right font-mono ${getChangeColor(stock.change)}`}>
                        {stock.change !== 0 ? `${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}` : '--'}
                      </TableCell>
                      
                      <TableCell className={`text-right font-mono ${getChangeColor(stock.change)}`}>
                        {formatPercent(stock.changePercent)}
                      </TableCell>
                      
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {stock.volume > 0 ? stock.volume.toLocaleString() : '--'}
                      </TableCell>
                      
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatTime(stock.lastUpdate)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Footer Info */}
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <p>• Data provided by Alpaca Markets via WebSocket connection</p>
            <p>• Prices update in real-time during market hours</p>
            <p>• Bid/Ask spreads and volume data included</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}