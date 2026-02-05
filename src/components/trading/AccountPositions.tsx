import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Wifi, WifiOff, RefreshCw, MoreVertical, Eye, Trash2, ArrowUpDown } from 'lucide-react';

// Fetch real positions from Alpaca API
const fetchPositions = async () => {
  try {
    // Import apiService dynamically to avoid SSR issues
    const { apiService } = await import('@/lib/apiService');
    
    const result = await apiService.getPositions();
    if (!result.success || !result.data) {
      return [];
    }

    // Transform Alpaca positions to our format
    return result.data.map((position: any) => ({
      symbol: position.symbol,
      qty: Number(position.qty || 0),
      side: Number(position.qty || 0) > 0 ? 'long' : 'short',
      market_value: Number(position.market_value || 0),
      cost_basis: Number(position.cost_basis || 0),
      unrealized_pl: Number(position.unrealized_pl || 0),
      unrealized_plpc: Number(position.unrealized_plpc || 0),
      current_price: Number(position.current_price || 0),
      lastday_price: Number(position.lastday_price || 0),
      change_today: Number(position.change_today || 0),
      change_today_percent: Number(position.change_today || 0) / Number(position.lastday_price || 1) * 100
    }));
  } catch (error) {
    console.error('Failed to fetch positions:', error);
    throw error;
  }
};

export default function AccountPositions() {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [swipedPosition, setSwipedPosition] = useState<string | null>(null);
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setViewMode(mobile ? 'cards' : 'table');
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load positions on mount
  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const positionsData = await fetchPositions();
      setPositions(positionsData);
      setError(null);
    } catch (err) {
      setError('Failed to load positions from Alpaca API');
    } finally {
      setLoading(false);
    }
  };

  // Touch handlers for swipe actions
  const handleTouchStart = (e: React.TouchEvent, symbol: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (symbol: string) => {
    const diff = touchStartX.current - touchCurrentX.current;
    
    if (Math.abs(diff) > 50) { // Minimum swipe distance
      if (diff > 0) {
        // Swiped left - show actions
        setSwipedPosition(symbol);
      } else {
        // Swiped right - hide actions
        setSwipedPosition(null);
      }
    }
  };

  const handlePositionAction = (action: string, symbol: string) => {
    console.log(`${action} action for ${symbol}`);
    setSwipedPosition(null);
    // Implement actual actions here
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

  // Mobile Position Card Component
  const PositionCard = ({ position }: { position: typeof DEMO_POSITIONS[0] }) => {
    const isSwipedOpen = swipedPosition === position.symbol;
    
    return (
      <div className="relative overflow-hidden">
        {/* Swipe Actions Background */}
        {isSwipedOpen && (
          <div className="absolute inset-y-0 right-0 flex items-center bg-red-500 px-4 z-0">
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-red-600"
                onClick={() => handlePositionAction('view', position.symbol)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-red-600"
                onClick={() => handlePositionAction('close', position.symbol)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Main Card Content */}
        <Card 
          className={`relative z-10 transition-transform duration-200 ${
            isSwipedOpen ? 'transform -translate-x-20' : ''
          }`}
          onTouchStart={(e) => handleTouchStart(e, position.symbol)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => handleTouchEnd(position.symbol)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg">{position.symbol}</span>
                {position.unrealized_pl !== 0 && (
                  <div className="flex items-center">
                    {position.unrealized_pl > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              <Badge variant={position.unrealized_pl >= 0 ? "default" : "destructive"}>
                {formatPercent(position.unrealized_plpc)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Quantity</p>
                <p className="font-semibold">{position.qty} shares</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Current Price</p>
                <p className="font-semibold">{formatCurrency(position.current_price)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Market Value</p>
                <p className="font-semibold">{formatCurrency(position.market_value)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Unrealized P&L</p>
                <p className={`font-semibold ${getChangeColor(position.unrealized_pl)}`}>
                  {formatCurrency(position.unrealized_pl)}
                </p>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Today's Change</span>
                <span className={`text-sm font-semibold ${getChangeColor(position.change_today)}`}>
                  {formatCurrency(position.change_today)} ({formatPercent(position.change_today_percent / 100)})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
            <Button onClick={loadPositions} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center space-x-2 text-lg md:text-xl">
                <span>Your Portfolio Positions</span>
                <Wifi className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
              </CardTitle>
              <CardDescription className="text-sm md:text-base">
                Demo portfolio positions with real-time market data
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              {!isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
                  className="flex items-center gap-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {viewMode === 'cards' ? 'Table' : 'Cards'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadPositions}
                disabled={loading}
                className="min-h-[44px] md:min-h-[36px]"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Positions Display */}
      {positions.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No positions found</p>
              <p className="text-sm text-muted-foreground">Start trading to see your portfolio here</p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        /* Mobile Card View */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-muted-foreground">
              {positions.length} Position{positions.length !== 1 ? 's' : ''}
            </h3>
            {isMobile && (
              <p className="text-xs text-muted-foreground">
                Swipe left for actions
              </p>
            )}
          </div>
          {positions.map((position) => (
            <PositionCard key={position.symbol} position={position} />
          ))}
        </div>
      ) : (
        /* Desktop Table View */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Portfolio Positions</CardTitle>
            <CardDescription>Your current holdings and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right">Market Value</TableHead>
                    <TableHead className="text-right">Unrealized P&L</TableHead>
                    <TableHead className="text-right">P&L %</TableHead>
                    <TableHead className="text-right">Today's Change</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.symbol} className="hover:bg-muted/50 dark:hover:bg-primary/25">
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
                        {formatCurrency(position.current_price)}
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
                      
                      <TableCell className={`text-right font-mono ${getChangeColor(position.change_today)}`}>
                        {formatCurrency(position.change_today)} ({formatPercent(position.change_today_percent / 100)})
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePositionAction('view', position.symbol)}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Summary */}
      {positions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Portfolio Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs md:text-sm text-muted-foreground">Total Positions</p>
                <p className="text-lg md:text-xl font-bold">{positions.length}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs md:text-sm text-muted-foreground">Total Market Value</p>
                <p className="text-lg md:text-xl font-bold">
                  {formatCurrency(positions.reduce((sum, p) => sum + p.market_value, 0))}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs md:text-sm text-muted-foreground">Total Unrealized P&L</p>
                <p className={`text-lg md:text-xl font-bold ${getChangeColor(positions.reduce((sum, p) => sum + p.unrealized_pl, 0))}`}>
                  {formatCurrency(positions.reduce((sum, p) => sum + p.unrealized_pl, 0))}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs md:text-sm text-muted-foreground">Today's Change</p>
                <p className={`text-lg md:text-xl font-bold ${getChangeColor(positions.reduce((sum, p) => sum + p.change_today, 0))}`}>
                  {formatCurrency(positions.reduce((sum, p) => sum + p.change_today, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Footer Info */}
      <Card className="bg-muted/20">
        <CardContent className="p-4">
          <div className="text-xs md:text-sm text-muted-foreground space-y-1">
            <p>• Demo portfolio data shown for demonstration purposes</p>
            <p>• Real-time market data will be available when connected to Alpaca API</p>
            <p>• P&L calculations include unrealized gains/losses</p>
            <p>• Today's change reflects current session performance</p>
            {isMobile && <p>• Swipe left on position cards to access quick actions</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}