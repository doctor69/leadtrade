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
  Search
} from 'lucide-react';
import StockSearch from './StockSearch';
import TradeForm from './TradeForm';
import AccountPositions from './AccountPositions';
import OrderHistory from './OrderHistory';
import PortfolioChart from './PortfolioChart';
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

  useEffect(() => {
    fetchAccountData();
  }, []);

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

  const handleStockSelect = (stock: StockData) => {
    setSelectedStock(stock);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
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
              <div className="text-2xl font-bold">{formatCurrency(accountData.portfolio_value)}</div>
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
              <div className="text-2xl font-bold">{formatCurrency(accountData.buying_power)}</div>
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
              <div className="text-2xl font-bold">{formatCurrency(accountData.cash)}</div>
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
        <TabsList className="grid w-full grid-cols-5">
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
        </TabsList>

        <TabsContent value="trade" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Search & Select Stock</CardTitle>
                  <CardDescription>Find stocks to trade</CardDescription>
                </CardHeader>
                <CardContent>
                  <StockSearch onSelectStock={handleStockSelect} />
                </CardContent>
              </Card>
            </div>
            <div>
              <TradeForm selectedStock={selectedStock} />
            </div>
          </div>
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
                        <span className="text-sm font-medium">{formatCurrency(accountData.equity)}</span>
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
      </Tabs>
    </div>
  );
}