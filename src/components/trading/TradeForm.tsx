import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { TrendingUp, TrendingDown, AlertCircle, BarChart3, Minus, Plus } from 'lucide-react';
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
  const [isMobile, setIsMobile] = useState(false);
  const [useSlider, setUseSlider] = useState(false);
  const [sliderValue, setSliderValue] = useState([1]);
  const [optionsEnabled, setOptionsEnabled] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [loadingPosition, setLoadingPosition] = useState(false);

  // Check if options trading is enabled
  useEffect(() => {
    const checkOptionsEnabled = async () => {
      const result = await apiService.getAccount();
      if (result.success && result.data) {
        const maxLevel = (result.data as any).admin_configurations?.max_options_trading_level || 0;
        setOptionsEnabled(maxLevel > 0);
      }
    };
    checkOptionsEnabled();
  }, []);

  // Fetch current position when stock changes or side changes to sell
  useEffect(() => {
    const fetchPosition = async () => {
      if (!selectedStock || side !== 'sell' || tradeType !== 'stock') {
        setCurrentPosition(0);
        return;
      }

      setLoadingPosition(true);
      try {
        const result = await apiService.getPositions(selectedStock.symbol);
        if (result.success && result.data && result.data.length > 0) {
          const position = result.data[0];
          setCurrentPosition(Math.abs(position.qty || 0));
        } else {
          setCurrentPosition(0);
        }
      } catch (error) {
        console.error('Error fetching position:', error);
        setCurrentPosition(0);
      } finally {
        setLoadingPosition(false);
      }
    };

    fetchPosition();
  }, [selectedStock, side, tradeType]);

  // Mobile detection and keyboard optimization
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Touch-optimized quantity controls
  const incrementQuantity = () => {
    const current = parseInt(quantity) || 0;
    setQuantity((current + 1).toString());
  };

  const decrementQuantity = () => {
    const current = parseInt(quantity) || 0;
    if (current > 1) {
      setQuantity((current - 1).toString());
    }
  };

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value);
    setQuantity(value[0].toString());
  };

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

    // Validate sell quantity doesn't exceed position
    if (side === 'sell' && tradeType === 'stock') {
      const sellQty = parseInt(quantity);
      if (sellQty > currentPosition) {
        alert(`Cannot sell ${sellQty} shares. You only own ${currentPosition} shares of ${selectedStock.symbol}`);
        return;
      }
      if (currentPosition === 0) {
        alert(`You don't own any shares of ${selectedStock.symbol} to sell`);
        return;
      }
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
        // Refresh position after successful sell
        if (side === 'sell' && tradeType === 'stock') {
          const posResult = await apiService.getPositions(selectedStock.symbol);
          if (posResult.success && posResult.data && posResult.data.length > 0) {
            setCurrentPosition(Math.abs(posResult.data[0].qty || 0));
          } else {
            setCurrentPosition(0);
          }
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

  // Helper function to safely format currency values
  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00';
    }
    return value.toFixed(2);
  };

  const getEstimatedCost = () => {
    if (!selectedStock || !quantity) return 0;

    const qty = parseFloat(quantity) || 0;
    if (qty <= 0 || isNaN(qty)) return 0;

    if (tradeType === 'stock') {
      let price = 0;
      if (orderType === 'limit' && limitPrice) {
        price = parseFloat(limitPrice) || 0;
      } else {
        price = selectedStock.price || 0;
      }
      
      // Debug logging
      console.log('Price calculation:', {
        orderType,
        limitPrice,
        selectedStockPrice: selectedStock.price,
        calculatedPrice: price,
        quantity: qty,
        estimatedCost: qty * price
      });
      
      if (isNaN(price) || price < 0) return 0;
      return qty * price;
    } else if (tradeType === 'option' && selectedOption) {
      const premium = selectedOption.premium || 0;
      const contractSize = selectedOption.contract_size || 100;
      
      console.log('Option price calculation:', {
        premium,
        contractSize,
        quantity: qty,
        estimatedCost: qty * premium * contractSize
      });
      
      if (isNaN(premium) || isNaN(contractSize) || premium < 0 || contractSize <= 0) return 0;
      return qty * premium * contractSize;
    }

    return 0;
  };

  const estimatedCost = getEstimatedCost();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Selected Stock Info */}
      {selectedStock && (
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-lg md:text-xl">{selectedStock.symbol}</span>
              <Badge variant={selectedStock.change >= 0 ? "default" : "destructive"} className="self-start sm:self-center">
                {selectedStock.change >= 0 ? '+' : ''}{formatCurrency(selectedStock.change)} ({formatCurrency(selectedStock.changePercent)}%)
              </Badge>
            </CardTitle>
            <CardDescription className="text-sm md:text-base">{selectedStock.name}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center space-x-2">
              <span className="text-xl md:text-2xl font-bold">${formatCurrency(selectedStock.price)}</span>
              {selectedStock.change >= 0 ? (
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trade Form */}
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-lg md:text-xl">Place Order</CardTitle>
          <CardDescription className="text-sm md:text-base">
            {selectedStock ? `Trade ${selectedStock.symbol}` : 'Select a stock to start trading'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Trade Type Selection */}
            <Tabs value={tradeType} onValueChange={(value) => setTradeType(value as 'stock' | 'option')}>
              <TabsList className={`grid w-full ${optionsEnabled ? 'grid-cols-2' : 'grid-cols-1'} h-12 md:h-10`}>
                <TabsTrigger value="stock" className="flex items-center gap-1 md:gap-2 text-sm md:text-base min-h-[44px] md:min-h-[36px]">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden xs:inline">Stocks</span>
                  <span className="xs:hidden">Stock</span>
                </TabsTrigger>
                {optionsEnabled && (
                  <TabsTrigger value="option" className="flex items-center gap-1 md:gap-2 text-sm md:text-base min-h-[44px] md:min-h-[36px]">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden xs:inline">Options</span>
                    <span className="xs:hidden">Option</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>

            {/* Buy/Sell Toggle */}
            <div className="flex space-x-2">
              <Button
                type="button"
                variant={side === 'buy' ? 'default' : 'outline'}
                onClick={() => setSide('buy')}
                className="flex-1 h-12 md:h-10 text-sm md:text-base"
                size={isMobile ? 'lg' : 'default'}
              >
                {tradeType === 'option' ? (
                  <>
                    <span className="hidden sm:inline">Buy to Open</span>
                    <span className="sm:hidden">Buy</span>
                  </>
                ) : 'Buy'}
              </Button>
              <Button
                type="button"
                variant={side === 'sell' ? 'destructive' : 'outline'}
                onClick={() => setSide('sell')}
                className="flex-1 h-12 md:h-10 text-sm md:text-base"
                size={isMobile ? 'lg' : 'default'}
              >
                {tradeType === 'option' ? (
                  <>
                    <span className="hidden sm:inline">Sell to Open</span>
                    <span className="sm:hidden">Sell</span>
                  </>
                ) : 'Sell'}
              </Button>
            </div>

            {/* Order Type */}
            <div className="space-y-2">
              <label className="text-sm md:text-base font-medium">Order Type</label>
              <Select value={orderType} onValueChange={(value: 'market' | 'limit') => setOrderType(value)}>
                <SelectTrigger className="h-12 md:h-10 text-sm md:text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market" className="h-12 md:h-auto text-sm md:text-base">Market Order</SelectItem>
                  <SelectItem value="limit" className="h-12 md:h-auto text-sm md:text-base">Limit Order</SelectItem>
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm md:text-base font-medium">Quantity</label>
                {isMobile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUseSlider(!useSlider)}
                    className="text-xs"
                  >
                    {useSlider ? 'Input' : 'Slider'}
                  </Button>
                )}
              </div>
              
              {/* Show current position when selling */}
              {side === 'sell' && tradeType === 'stock' && selectedStock && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs md:text-sm">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {loadingPosition ? (
                      'Loading position...'
                    ) : currentPosition > 0 ? (
                      <>You own <strong>{currentPosition}</strong> shares of {selectedStock.symbol}</>
                    ) : (
                      <>You don't own any shares of {selectedStock.symbol}</>
                    )}
                  </span>
                </div>
              )}
              
              {useSlider && isMobile ? (
                <div className="space-y-3">
                  <div className="px-2">
                    <Slider
                      value={sliderValue}
                      onValueChange={handleSliderChange}
                      max={100}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="text-center text-sm font-medium">
                    {quantity || 1} {tradeType === 'option' ? 'contracts' : 'shares'}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  {isMobile && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={decrementQuantity}
                      disabled={parseInt(quantity) <= 1}
                      className="shrink-0"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                  <Input
                    type="number"
                    placeholder={tradeType === 'option' ? 'Number of contracts' : 'Number of shares'}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="1"
                    max={side === 'sell' && tradeType === 'stock' && currentPosition > 0 ? currentPosition : undefined}
                    required
                    className="text-center md:text-left"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  {isMobile && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={incrementQuantity}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
              
              {tradeType === 'option' && (
                <p className="text-xs md:text-sm text-muted-foreground">
                  Each option contract typically represents 100 shares
                </p>
              )}
            </div>

            {/* Limit Price (if limit order) */}
            {orderType === 'limit' && (
              <div className="space-y-2">
                <label className="text-sm md:text-base font-medium">Limit Price</label>
                <Input
                  type="number"
                  placeholder={tradeType === 'option' ? 'Premium per contract' : 'Price per share'}
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  step="0.01"
                  min="0"
                  required
                  inputMode="decimal"
                  className="text-center md:text-left"
                />
              </div>
            )}

            {/* Order Summary */}
            {selectedStock && quantity && (tradeType === 'stock' || selectedOption) && (
              <div className="p-3 md:p-4 bg-muted rounded-lg space-y-2 md:space-y-3">
                <h4 className="font-medium text-sm md:text-base">Order Summary</h4>
                <div className="grid grid-cols-1 gap-2 md:gap-1">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span>Symbol:</span>
                    <span className="font-medium">{selectedStock.symbol}</span>
                  </div>
                  {tradeType === 'option' && selectedOption && (
                    <>
                      <div className="flex justify-between text-xs md:text-sm">
                        <span>Option Type:</span>
                        <span className="font-medium">{selectedOption.option_type.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between text-xs md:text-sm">
                        <span>Strike Price:</span>
                        <span className="font-medium">${selectedOption.strike}</span>
                      </div>
                      <div className="flex justify-between text-xs md:text-sm">
                        <span>Expiration:</span>
                        <span className="font-medium">{new Date(selectedOption.expiration).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-xs md:text-sm">
                        <span>Premium:</span>
                        <span className="font-medium">${formatCurrency(selectedOption.premium)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-xs md:text-sm">
                    <span>Quantity:</span>
                    <span className="font-medium">{quantity} {tradeType === 'option' ? 'contracts' : 'shares'}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span>Price:</span>
                    <span className="font-medium">
                      {tradeType === 'option'
                        ? `$${formatCurrency(selectedOption?.premium)} per contract`
                        : orderType === 'market' ? 'Market Price' : `$${formatCurrency(parseFloat(limitPrice))}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm font-medium border-t pt-2 mt-2">
                    <span>Estimated {side === 'buy' ? 'Cost' : 'Proceeds'}:</span>
                    <span className="text-base md:text-lg font-bold">${formatCurrency(estimatedCost)}</span>
                  </div>
                </div>
                {tradeType === 'option' && (
                  <div className="text-xs text-muted-foreground mt-2 p-2 bg-background/50 rounded">
                    * Options cost = Contracts × Premium × 100 shares per contract
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!selectedStock || !quantity || loading || (tradeType === 'option' && !selectedOption)}
              className="w-full h-12 md:h-10 text-sm md:text-base font-medium"
              variant={side === 'buy' ? 'default' : 'destructive'}
              size={isMobile ? 'lg' : 'default'}
            >
              {loading ? 'Placing Order...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${selectedStock?.symbol || (tradeType === 'option' ? 'Option' : 'Stock')}`}
            </Button>

            {/* Warning */}
            <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <div className="text-xs md:text-sm text-yellow-700 dark:text-yellow-300">
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