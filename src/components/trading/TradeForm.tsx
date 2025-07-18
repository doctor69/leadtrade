import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, AlertCircle, BarChart3 } from 'lucide-react';
import { apiService } from '@/lib/apiService';
import OptionsSelector from './OptionsSelector';
import type { OptionDetails } from '@/types/trading';

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
  const [tradeType, setTradeType] = useState<'stock' | 'option'>('stock');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [selectedOption, setSelectedOption] = useState<OptionDetails | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStock || !quantity) {
      alert('Please select a stock and enter quantity');
      return;
    }

    if (tradeType === 'option' && !selectedOption) {
      alert('Please select an option contract');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        symbol: selectedStock.symbol,
        qty: parseInt(quantity),
        side,
        type: orderType,
        time_in_force: 'day' as const,
        trade_type: tradeType,
        ...(orderType === 'limit' && { limit_price: parseFloat(limitPrice) }),
        ...(tradeType === 'option' && selectedOption && { option_details: selectedOption })
      };

      const result = await apiService.placeOrder(orderData);

      if (result.success) {
        const assetType = tradeType === 'option' ? 'option contracts' : 'shares';
        alert(`${side.toUpperCase()} order for ${quantity} ${assetType} of ${selectedStock.symbol} submitted successfully!`);
        setQuantity('');
        setLimitPrice('');
        if (tradeType === 'option') {
          setSelectedOption(undefined);
        }
      } else {
        alert(`Failed to place order: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Order submission error:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (optionDetails: OptionDetails) => {
    setSelectedOption(optionDetails);
  };

  const getEstimatedCost = () => {
    if (!selectedStock || !quantity) return 0;

    const qty = parseFloat(quantity);

    if (tradeType === 'stock') {
      const price = orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : selectedStock.price;
      return qty * price;
    } else if (tradeType === 'option' && selectedOption) {
      const premium = selectedOption.premium || 0;
      const contractSize = selectedOption.contract_size || 100;
      return qty * premium * contractSize;
    }

    return 0;
  };

  const estimatedCost = getEstimatedCost();

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
            {/* Trade Type Selection */}
            <Tabs value={tradeType} onValueChange={(value) => setTradeType(value as 'stock' | 'option')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stock" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Stocks
                </TabsTrigger>
                <TabsTrigger value="option" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Options
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Buy/Sell Toggle */}
            <div className="flex space-x-2">
              <Button
                type="button"
                variant={side === 'buy' ? 'default' : 'outline'}
                onClick={() => setSide('buy')}
                className="flex-1"
              >
                {tradeType === 'option' ? 'Buy to Open' : 'Buy'}
              </Button>
              <Button
                type="button"
                variant={side === 'sell' ? 'destructive' : 'outline'}
                onClick={() => setSide('sell')}
                className="flex-1"
              >
                {tradeType === 'option' ? 'Sell to Open' : 'Sell'}
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

            {/* Options Selector (for options trading) */}
            {tradeType === 'option' && selectedStock && (
              <OptionsSelector
                symbol={selectedStock.symbol}
                onOptionSelect={handleOptionSelect}
                selectedOption={selectedOption}
              />
            )}

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                placeholder={tradeType === 'option' ? 'Number of contracts' : 'Number of shares'}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                required
              />
              {tradeType === 'option' && (
                <p className="text-xs text-muted-foreground">
                  Each option contract typically represents 100 shares
                </p>
              )}
            </div>

            {/* Limit Price (if limit order) */}
            {orderType === 'limit' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Limit Price</label>
                <Input
                  type="number"
                  placeholder={tradeType === 'option' ? 'Premium per contract' : 'Price per share'}
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            )}

            {/* Order Summary */}
            {selectedStock && quantity && (tradeType === 'stock' || selectedOption) && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium">Order Summary</h4>
                <div className="flex justify-between text-sm">
                  <span>Symbol:</span>
                  <span>{selectedStock.symbol}</span>
                </div>
                {tradeType === 'option' && selectedOption && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Option Type:</span>
                      <span>{selectedOption.option_type.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Strike Price:</span>
                      <span>${selectedOption.strike}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Expiration:</span>
                      <span>{new Date(selectedOption.expiration).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Premium:</span>
                      <span>${selectedOption.premium?.toFixed(2) || 'N/A'}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span>Quantity:</span>
                  <span>{quantity} {tradeType === 'option' ? 'contracts' : 'shares'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Price:</span>
                  <span>
                    {tradeType === 'option'
                      ? `$${selectedOption?.premium?.toFixed(2) || 'N/A'} per contract`
                      : orderType === 'market' ? 'Market Price' : `$${limitPrice || '0.00'}`
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-2">
                  <span>Estimated {side === 'buy' ? 'Cost' : 'Proceeds'}:</span>
                  <span>${estimatedCost.toFixed(2)}</span>
                </div>
                {tradeType === 'option' && (
                  <div className="text-xs text-muted-foreground">
                    * Options cost = Contracts × Premium × 100 shares per contract
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!selectedStock || !quantity || loading || (tradeType === 'option' && !selectedOption)}
              className="w-full"
              variant={side === 'buy' ? 'default' : 'destructive'}
            >
              {loading ? 'Placing Order...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${selectedStock?.symbol || (tradeType === 'option' ? 'Option' : 'Stock')}`}
            </Button>

            {/* Warning */}
            <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-xs text-yellow-700 dark:text-yellow-300">
                <p className="font-medium">Trading involves risk</p>
                <p>
                  {tradeType === 'option'
                    ? 'Options trading involves significant risk and may not be suitable for all investors. Options can expire worthless.'
                    : 'Make sure you understand the risks before placing orders. This is a demo environment.'
                  }
                </p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}