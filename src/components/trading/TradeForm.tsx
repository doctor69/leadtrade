import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface TradeFormProps {
  selectedStock?: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
  };
}

export default function TradeForm({ selectedStock }: TradeFormProps) {
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStock || !quantity) {
      alert('Please select a stock and enter quantity');
      return;
    }

    setLoading(true);
    
    // Mock order submission - replace with actual Alpaca API call
    const orderData = {
      symbol: selectedStock.symbol,
      qty: parseInt(quantity),
      side,
      type: orderType,
      time_in_force: 'day',
      ...(orderType === 'limit' && { limit_price: parseFloat(limitPrice) })
    };

    console.log('Submitting order:', orderData);
    
    // Simulate API call
    setTimeout(() => {
      alert(`${side.toUpperCase()} order for ${quantity} shares of ${selectedStock.symbol} submitted!`);
      setQuantity('');
      setLimitPrice('');
      setLoading(false);
    }, 1000);
  };

  const estimatedCost = selectedStock && quantity ? 
    (parseFloat(quantity) * (orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : selectedStock.price)) : 0;

  return (
    <div className="space-y-6">
      {/* Selected Stock Info */}
      {selectedStock && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedStock.symbol}</span>
              <Badge variant={selectedStock.change >= 0 ? "default" : "destructive"}>
                {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)} ({selectedStock.changePercent.toFixed(2)}%)
              </Badge>
            </CardTitle>
            <CardDescription>{selectedStock.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">${selectedStock.price.toFixed(2)}</span>
              {selectedStock.change >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trade Form */}
      <Card>
        <CardHeader>
          <CardTitle>Place Order</CardTitle>
          <CardDescription>
            {selectedStock ? `Trade ${selectedStock.symbol}` : 'Select a stock to start trading'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Buy/Sell Toggle */}
            <div className="flex space-x-2">
              <Button
                type="button"
                variant={side === 'buy' ? 'default' : 'outline'}
                onClick={() => setSide('buy')}
                className="flex-1"
              >
                Buy
              </Button>
              <Button
                type="button"
                variant={side === 'sell' ? 'destructive' : 'outline'}
                onClick={() => setSide('sell')}
                className="flex-1"
              >
                Sell
              </Button>
            </div>

            {/* Order Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Order Type</label>
              <Select value={orderType} onValueChange={(value: 'market' | 'limit') => setOrderType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market Order</SelectItem>
                  <SelectItem value="limit">Limit Order</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                placeholder="Number of shares"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                required
              />
            </div>

            {/* Limit Price (if limit order) */}
            {orderType === 'limit' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Limit Price</label>
                <Input
                  type="number"
                  placeholder="Price per share"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            )}

            {/* Order Summary */}
            {selectedStock && quantity && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium">Order Summary</h4>
                <div className="flex justify-between text-sm">
                  <span>Symbol:</span>
                  <span>{selectedStock.symbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Quantity:</span>
                  <span>{quantity} shares</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Price:</span>
                  <span>
                    {orderType === 'market' ? 'Market Price' : `$${limitPrice || '0.00'}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-2">
                  <span>Estimated {side === 'buy' ? 'Cost' : 'Proceeds'}:</span>
                  <span>${estimatedCost.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={!selectedStock || !quantity || loading}
              className="w-full"
              variant={side === 'buy' ? 'default' : 'destructive'}
            >
              {loading ? 'Placing Order...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${selectedStock?.symbol || 'Stock'}`}
            </Button>

            {/* Warning */}
            <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-xs text-yellow-700 dark:text-yellow-300">
                <p className="font-medium">Trading involves risk</p>
                <p>Make sure you understand the risks before placing orders. This is a demo environment.</p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}