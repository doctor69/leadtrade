import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useAlpacaWebSocket } from '@/hooks/useAlpacaWebSocket';
import { apiService, type Position } from '@/lib/apiService';



export default function AccountPositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get symbols from positions for WebSocket
  const positionSymbols = positions.map(p => p.symbol);
  const { marketData, isConnected } = useAlpacaWebSocket(positionSymbols, positionSymbols.length > 0);

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const result = await apiService.getPositions();
      
      if (result.success && result.data) {
        setPositions(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch positions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${(percent * 100).toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  const getCurrentPrice = (symbol: string) => {
    const marketItem = marketData.find(item => item.symbol === symbol);
    return marketItem?.price || 0;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
            <Button onClick={fetchPositions} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>Your Portfolio Positions</span>
                {isConnected ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>
                Live updates on your current holdings
              </CardDescription>
            </div>
            
            <Button onClick={fetchPositions} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Holdings</CardTitle>
          <CardDescription>Your active positions with real-time prices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Avg Price</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">P&L %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No positions found. Start trading to see your holdings here.
                    </TableCell>
                  </TableRow>
                ) : (
                  positions.map((position) => (
                    <TableRow key={position.symbol} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span>{position.symbol}</span>
                          {position.unrealized_pl !== 0 && (
                            <div className="flex items-center">
                              {position.unrealized_pl > 0 ? (
                                <TrendingUp className="h-3 w-3 text-green-500" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right font-mono">
                        {position.qty}
                      </TableCell>
                      
                      <TableCell className="text-right font-mono">
                        {formatCurrency(position.avg_entry_price)}
                      </TableCell>
                      
                      <TableCell className="text-right font-mono">
                        {formatCurrency(getCurrentPrice(position.symbol) || position.avg_entry_price)}
                      </TableCell>
                      
                      <TableCell className="text-right font-mono">
                        {formatCurrency(position.market_value)}
                      </TableCell>
                      
                      <TableCell className={`text-right font-mono ${getChangeColor(position.unrealized_pl)}`}>
                        {formatCurrency(position.unrealized_pl)}
                      </TableCell>
                      
                      <TableCell className={`text-right font-mono ${getChangeColor(position.unrealized_pl)}`}>
                        {formatPercent(position.unrealized_plpc)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {positions.length > 0 && (
            <div className="mt-4 text-xs text-muted-foreground space-y-1">
              <p>• Prices update in real-time during market hours</p>
              <p>• P&L calculations are based on current market prices</p>
              <p>• Data provided by Alpaca Markets</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}