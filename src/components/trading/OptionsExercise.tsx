/**
 * Options Exercise Component
 * 
 * Allows users to exercise their option positions with validation
 * and confirmation dialogs.
 * 
 * Requirements: 21.2
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { exerciseOptionClient } from '@/lib/alpaca-options-contracts';
import { apiService, type Position } from '@/lib/apiService';

interface OptionPosition extends Position {
  option_type?: 'call' | 'put';
  strike_price?: number;
  expiration_date?: string;
  contract_id?: string;
}

export default function OptionsExercise() {
  const [positions, setPositions] = useState<OptionPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [exercising, setExercising] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<OptionPosition | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    fetchOptionPositions();
  }, []);

  const fetchOptionPositions = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getPositions();
      
      if (result.success && result.data) {
        // Filter for option positions (symbols typically contain option identifiers)
        const optionPositions = result.data.filter((pos: Position) => 
          pos.symbol.length > 10 || pos.symbol.includes('C') || pos.symbol.includes('P')
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

  const handleExerciseClick = (position: OptionPosition) => {
    setSelectedPosition(position);
    setShowConfirmDialog(true);
    setError(null);
    setSuccess(null);
  };

  const handleConfirmExercise = async () => {
    if (!selectedPosition) return;

    setExercising(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await exerciseOptionClient(selectedPosition.symbol);
      
      setSuccess(`Successfully exercised ${selectedPosition.symbol}`);
      setShowConfirmDialog(false);
      
      // Refresh positions after a short delay
      setTimeout(() => {
        fetchOptionPositions();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to exercise option');
    } finally {
      setExercising(false);
    }
  };

  const handleCancelExercise = () => {
    setShowConfirmDialog(false);
    setSelectedPosition(null);
    setError(null);
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
    // Simple heuristic: options symbols often contain C or P
    if (symbol.includes('C')) return 'call';
    if (symbol.includes('P')) return 'put';
    return 'unknown';
  };

  const isInTheMoney = (position: OptionPosition): boolean => {
    // This is a simplified check - in production, you'd compare with current market price
    return parseFloat(position.unrealized_pl as any) > 0;
  };

  const getDaysToExpiration = (expirationDate?: string): number | null => {
    if (!expirationDate) return null;
    const expiry = new Date(expirationDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Exercise Options
              </CardTitle>
              <CardDescription>
                Exercise your in-the-money option positions
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
          {/* Success Alert */}
          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {/* No Positions */}
          {!loading && positions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No option positions found
            </div>
          )}

          {/* Positions Table */}
          {!loading && positions.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Avg Price</TableHead>
                    <TableHead>Market Value</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => {
                    const optionType = getOptionType(position.symbol);
                    const itm = isInTheMoney(position);
                    const pl = parseFloat(position.unrealized_pl as any);

                    return (
                      <TableRow key={position.symbol}>
                        <TableCell className="font-medium">
                          {position.symbol}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={optionType === 'call' ? 'default' : optionType === 'put' ? 'destructive' : 'outline'}
                            className="flex items-center gap-1 w-fit"
                          >
                            {optionType === 'call' && <TrendingUp className="h-3 w-3" />}
                            {optionType === 'put' && <TrendingDown className="h-3 w-3" />}
                            {optionType.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{position.qty}</TableCell>
                        <TableCell>{formatCurrency(position.avg_entry_price)}</TableCell>
                        <TableCell>{formatCurrency(position.market_value)}</TableCell>
                        <TableCell>
                          <div className={pl >= 0 ? 'text-green-600' : 'text-red-600'}>
                            <div className="font-medium">
                              {formatCurrency(position.unrealized_pl)}
                            </div>
                            <div className="text-xs">
                              {formatPercent(position.unrealized_plpc)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={itm ? 'default' : 'secondary'}>
                            {itm ? 'ITM' : 'OTM'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={itm ? 'default' : 'outline'}
                            onClick={() => handleExerciseClick(position)}
                            disabled={exercising}
                          >
                            Exercise
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Info Box */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Exercising an option converts it to shares of the underlying stock.
              This action is irreversible and can only be done during market hours.
              Make sure you have sufficient buying power for calls or shares for puts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Option Exercise</DialogTitle>
            <DialogDescription>
              Are you sure you want to exercise this option position?
            </DialogDescription>
          </DialogHeader>

          {selectedPosition && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Symbol:</span>
                  <div className="font-semibold">{selectedPosition.symbol}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <div>
                    <Badge variant={getOptionType(selectedPosition.symbol) === 'call' ? 'default' : 'destructive'}>
                      {getOptionType(selectedPosition.symbol).toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Quantity:</span>
                  <div className="font-semibold">{selectedPosition.qty} contracts</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Shares:</span>
                  <div className="font-semibold">{parseFloat(selectedPosition.qty as any) * 100} shares</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Current Value:</span>
                  <div className="font-semibold">{formatCurrency(selectedPosition.market_value)}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">P&L:</span>
                  <div className={parseFloat(selectedPosition.unrealized_pl as any) >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {formatCurrency(selectedPosition.unrealized_pl)}
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will convert your option position into {parseFloat(selectedPosition.qty as any) * 100} shares
                  of the underlying stock. This action cannot be undone.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelExercise}
              disabled={exercising}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmExercise}
              disabled={exercising}
            >
              {exercising ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Exercising...
                </>
              ) : (
                'Confirm Exercise'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
