/**
 * Options Positions Component
 * 
 * Displays options positions in the portfolio view with detailed metrics
 * and exercise capabilities.
 * 
 * Requirements: 21.3
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  RefreshCw,
  Calendar,
  DollarSign
} from 'lucide-react';
import { apiService, type Position } from '@/lib/apiService';

interface OptionPosition extends Position {
  option_type?: 'call' | 'put';
  strike_price?: number;
  expiration_date?: string;
  contract_id?: string;
}

export default function OptionsPositions() {
  const [positions, setPositions] = useState<OptionPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOptionPositions();
  }, []);

  const fetchOptionPositions = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getPositions();
      
      if (result.success && result.data) {
        // Filter for option positions
        // Options symbols follow OCC format: AAPL250117C00150000 (21 chars)
        // or have asset_class === 'us_option'
        const optionPositions = result.data.filter((pos: Position) => 
          (pos as any).asset_class === 'us_option' || 
          pos.symbol.length >= 15 // OCC format is typically 21 characters
        );
        setPositions(optionPositions as OptionPosition[]);
      } else {
        setError(result.error || 'Failed to fetch positions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatPercent = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${(num * 100).toFixed(2)}%`;
  };

  const getOptionType = (symbol: string): 'call' | 'put' | 'unknown' => {
    if (symbol.includes('C')) return 'call';
    if (symbol.includes('P')) return 'put';
    return 'unknown';
  };

  const isInTheMoney = (position: OptionPosition): boolean => {
    return parseFloat(position.unrealized_pl as any) > 0;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (positions.length === 0) {
    return null; // Don't show the card if there are no options positions
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Options Positions
            </CardTitle>
            <CardDescription>
              Your active options contracts
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOptionPositions}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {positions.map((position) => {
            const optionType = getOptionType(position.symbol);
            const itm = isInTheMoney(position);
            const pl = parseFloat(position.unrealized_pl as any);
            const plPercent = parseFloat(position.unrealized_plpc as any);

            return (
              <Card key={position.symbol} className="border-l-4" style={{
                borderLeftColor: optionType === 'call' ? 'hsl(var(--primary))' : 
                                 optionType === 'put' ? 'hsl(var(--destructive))' : 
                                 'hsl(var(--muted))'
              }}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-lg">
                          {position.symbol}
                        </span>
                        <Badge 
                          variant={optionType === 'call' ? 'default' : optionType === 'put' ? 'destructive' : 'outline'}
                          className="flex items-center gap-1"
                        >
                          {optionType === 'call' && <TrendingUp className="h-3 w-3" />}
                          {optionType === 'put' && <TrendingDown className="h-3 w-3" />}
                          {optionType.toUpperCase()}
                        </Badge>
                        <Badge variant={itm ? 'default' : 'secondary'}>
                          {itm ? 'ITM' : 'OTM'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Quantity:</span>
                          <div className="font-medium">{position.qty} contracts</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Price:</span>
                          <div className="font-medium">{formatCurrency(position.avg_entry_price)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Market Value:</span>
                          <div className="font-medium">{formatCurrency(position.market_value)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">P&L:</span>
                          <div className={`font-medium ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(position.unrealized_pl)}
                            <span className="text-xs ml-1">
                              ({pl >= 0 ? '+' : ''}{formatPercent(plPercent)})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            Options positions are displayed here. Visit the Trading page to exercise options or view detailed contract information.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
