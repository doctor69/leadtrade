import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  RefreshCw, 
  AlertCircle,
  BarChart3,
  Wallet,
  History,
  Search,
  Info
} from 'lucide-react';
import TradeForm from './TradeForm';
import AccountPositions from './AccountPositions';
import OrderHistory from './OrderHistory';
import PortfolioChart from './PortfolioChart';
import AssetChart from '@/components/dashboard/AssetChart';
import AllCorporateActions from './AllCorporateActions';
import SimpleMarketGrid from './SimpleMarketGrid';
import { apiService, type AccountData } from '@/lib/apiService';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export default function TradingInterface() {
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    fetchAccountData();
    // Check for URL parameters to pre-fill stock/option
    checkUrlParameters();
  }, [mounted]);

  const checkUrlParameters = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const symbol = urlParams.get('symbol');
      
      if (symbol) {
        // Fetch real stock data from API
        fetchStockData(symbol.toUpperCase());
      }
    }
  };

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getAccount();
      
      if (result.success && result.data) {
        setAccountData(result.data);
      } else {
        setError(result.error || 'Failed to fetch account data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockData = async (symbol: string) => {
    try {
      // Fetch real stock data from Alpaca API using apiService
      const result = await apiService.getQuotes(symbol);
      
      if (result.success && result.data) {
        // Handle the Edge Function response format
        let quote;
        
        // Check for nested quotes structure: result.data.quotes.quotes[symbol]
        if (result.data.quotes?.quotes && result.data.quotes.quotes[symbol]) {
          quote = result.data.quotes.quotes[symbol];
        }
        // Check if data has a quotes property with the symbol
        else if (result.data.quotes && result.data.quotes[symbol]) {
          quote = result.data.quotes[symbol];
        }
        // Check if data has the symbol as a direct key
        else if (result.data[symbol]) {
          quote = result.data[symbol];
        }
        // Check if data is an array with the first element being the quote
        else if (Array.isArray(result.data) && result.data.length > 0) {
          quote = result.data[0];
        }
        // Otherwise try to extract from nested structure
        else if (result.data.quotes && typeof result.data.quotes === 'object') {
          const quotesObj = result.data.quotes.quotes || result.data.quotes;
          const keys = Object.keys(quotesObj);
          
          if (keys.length > 0) {
            quote = quotesObj[keys[0]];
          }
        }

        if (quote && typeof quote === 'object' && !quote.quotes && !quote.metadata) {
          // Map the quote data to our StockData format
          // Alpaca quote fields: ap (ask price), bp (bid price), as (ask size), bs (bid size)
          const price = quote.ap || quote.bp || quote.askPrice || quote.bidPrice || quote.price || quote.latestPrice || 0;
          
          const stockData: StockData = {
            symbol: symbol,
            name: `${symbol} Inc.`, // In production, get from assets API
            price: typeof price === 'string' ? parseFloat(price) : price,
            change: quote.change || quote.dailyChange || 0,
            changePercent: quote.changePercent || quote.dailyChangePercent || 0,
            volume: quote.volume || quote.v || quote.as || quote.bs || 0,
          };
          
          setSelectedStock(stockData);
        } else {
          console.error('No valid quote data found for symbol:', symbol);
        }
      } else {
        console.error('Failed to fetch stock data:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
    }
  };

  const handleStockSelect = (stock: StockData) => {
    setSelectedStock(stock);
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    // Handle undefined, null, or invalid values
    if (amount === undefined || amount === null) {
      return '$0.00';
    }
    
    // Convert string to number if needed
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Check if it's a valid number
    if (isNaN(numAmount)) {
      return '$0.00';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-destructive">{error}</span>
          </div>
          <Button onClick={fetchAccountData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      {accountData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(accountData.portfolio_value || 0)}</div>
              <p className="text-xs text-muted-foreground">
                Total account value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Buying Power</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(accountData.buying_power || 0)}</div>
              <p className="text-xs text-muted-foreground">
                Available to trade
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(accountData.cash || 0)}</div>
              <p className="text-xs text-muted-foreground">
                Cash balance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Day Trade Count</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accountData.daytrade_count || 0}</div>
              <p className="text-xs text-muted-foreground">
                This week
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Trading Interface */}
      <Tabs defaultValue="trade" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="trade" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Trade
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="positions" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Positions
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="chart" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="corporate" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Corp Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trade" className="space-y-4">
          {/* Security Details Section */}
          {selectedStock && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="h-5 w-5" />
                  <span>Security Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Symbol</div>
                    <div className="text-lg font-semibold">{selectedStock.symbol}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Current Price</div>
                    <div className="text-lg font-semibold">${selectedStock.price.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Change</div>
                    <div className={`text-lg font-semibold flex items-center space-x-1 ${
                      selectedStock.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {selectedStock.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      <span>
                        {selectedStock.change >= 0 ? '+' : ''}${selectedStock.change.toFixed(2)} 
                        ({selectedStock.change >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Volume</div>
                    <div className="text-lg font-semibold">{selectedStock.volume.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {selectedStock && (
                <AssetChart 
                  symbol={selectedStock.symbol} 
                  name={selectedStock.name}
                />
              )}
            </div>
            <div>
              {selectedStock && <TradeForm selectedStock={selectedStock} />}
            </div>
          </div>

          {/* Market Grid in Trade Tab */}
          <SimpleMarketGrid />
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PortfolioChart />
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Account Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {accountData && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Account Status:</span>
                        <Badge variant={accountData.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {accountData.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Equity:</span>
                        <span className="text-sm font-medium">{formatCurrency(accountData.equity || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Multiplier:</span>
                        <span className="text-sm font-medium">{accountData.multiplier}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Pattern Day Trader:</span>
                        <Badge variant={accountData.daytrade_count >= 4 ? 'destructive' : 'default'}>
                          {accountData.daytrade_count >= 4 ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="positions">
          <AccountPositions />
        </TabsContent>

        <TabsContent value="orders">
          <OrderHistory />
        </TabsContent>

        <TabsContent value="chart">
          <PortfolioChart />
        </TabsContent>

        <TabsContent value="corporate">
          <AllCorporateActions />
        </TabsContent>
      </Tabs>
    </div>
  );
}