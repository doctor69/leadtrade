import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3 } from 'lucide-react';

interface PortfolioSummary {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  cashBalance: number;
  buyingPower: number;
  positionsCount: number;
}

// Fetch real portfolio data from Alpaca API
const fetchPortfolioSummary = async (): Promise<PortfolioSummary | null> => {
  try {
    // Import apiService dynamically to avoid SSR issues
    const { apiService } = await import('@/lib/apiService');
    
    // Get account data from Alpaca
    const accountResult = await apiService.getAccount();
    if (!accountResult.success || !accountResult.data) {
      throw new Error('Failed to fetch account data');
    }

    const account = accountResult.data;
    
    // Get positions to count them
    const positionsResult = await apiService.getPositions();
    const positionsCount = positionsResult.success ? (positionsResult.data?.length || 0) : 0;

    return {
      totalValue: Number(account.portfolio_value || 0),
      dayChange: Number(account.day_trade_buying_power || 0) - Number(account.portfolio_value || 0),
      dayChangePercent: 0, // Calculate from portfolio history if available
      totalGainLoss: Number(account.portfolio_value || 0) - Number(account.cash || 0),
      totalGainLossPercent: 0, // Calculate from initial investment
      cashBalance: Number(account.cash || 0),
      buyingPower: Number(account.buying_power || 0),
      positionsCount,
    };
  } catch (error) {
    console.error('Failed to fetch portfolio summary:', error);
    return null;
  }
};

export default function PortfolioSummary() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const loadSummary = async () => {
      setLoading(true);
      const portfolioData = await fetchPortfolioSummary();
      setSummary(portfolioData);
      setLoading(false);
    };

    loadSummary();
  }, [mounted]);

  if (!mounted || loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={`loading-card-${i}`}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Unable to load portfolio data</p>
            <p className="text-sm text-muted-foreground mt-1">Please check your connection to Alpaca</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDayPositive = summary.dayChange >= 0;
  const isTotalPositive = summary.totalGainLoss >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Portfolio Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${summary.totalValue.toLocaleString()}</div>
          <div className={`flex items-center space-x-1 text-xs ${
            isDayPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isDayPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>
              {isDayPositive ? '+' : ''}${Math.abs(summary.dayChange).toLocaleString()} 
              ({isDayPositive ? '+' : ''}{summary.dayChangePercent.toFixed(2)}%) today
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Total Gain/Loss */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            isTotalPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isTotalPositive ? '+' : ''}${Math.abs(summary.totalGainLoss).toLocaleString()}
          </div>
          <div className={`flex items-center space-x-1 text-xs ${
            isTotalPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isTotalPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>
              ({isTotalPositive ? '+' : ''}{summary.totalGainLossPercent.toFixed(2)}%) all time
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cash Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${summary.cashBalance.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Buying Power: ${summary.buyingPower.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Positions Count */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.positionsCount}</div>
          <p className="text-xs text-muted-foreground">
            Diversified portfolio
          </p>
        </CardContent>
      </Card>
    </div>
  );
}