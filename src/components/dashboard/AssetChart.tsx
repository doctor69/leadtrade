import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis } from 'recharts';
// Removed problematic import

interface AssetChartProps {
  symbol: string;
  name?: string;
  className?: string;
}

interface ChartDataPoint {
  timestamp: string;
  price: number;
  volume: number;
  date: string;
}

// Fetch real chart data from Alpaca API
const fetchChartData = async (symbol: string, timeframe: string): Promise<ChartDataPoint[]> => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.error('No session available for chart data');
      return [];
    }

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate = new Date();
    let alpacaTimeframe = '1Day';
    
    switch (timeframe) {
      case '1D':
        startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        alpacaTimeframe = '15Min';
        break;
      case '1W':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        alpacaTimeframe = '1Hour';
        break;
      case '1M':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        alpacaTimeframe = '1Day';
        break;
      case '3M':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        alpacaTimeframe = '1Day';
        break;
      case '1Y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        alpacaTimeframe = '1Day';
        break;
    }

    // Call the alpaca-market-data-enhanced/bars endpoint
    const params = new URLSearchParams({
      symbols: symbol,
      timeframe: alpacaTimeframe,
      start: startDate.toISOString(),
      end: now.toISOString(),
      limit: '1000',
      feed: 'iex'
    });

    const response = await fetch(
      `${supabaseUrl}/functions/v1/alpaca-market-data-enhanced/bars?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch bars:', response.status, response.statusText);
      return [];
    }

    const result = await response.json();
    
    if (!result.success || !result.data?.bars?.bars?.[symbol]) {
      console.error('Invalid bars response:', result);
      return [];
    }

    const bars = result.data.bars.bars[symbol];
    
    return bars.map((bar: any): ChartDataPoint => ({
      timestamp: bar.t,
      price: Number(bar.c || 0), // Close price
      volume: Number(bar.v || 0),
      date: new Date(bar.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
  } catch (error) {
    console.error('Failed to fetch chart data:', error);
    return [];
  }
};

const chartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--chart-1))",
  },
};

export default function AssetChart({ symbol, name, className }: AssetChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1M');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadChartData();
  }, [mounted, symbol, timeframe]);

  const loadChartData = async () => {
    setLoading(true);
    const data = await fetchChartData(symbol, timeframe);
    setChartData(data);
    setLoading(false);
  };

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0;
  const previousPrice = chartData.length > 1 ? chartData[chartData.length - 2].price : currentPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  if (!mounted || loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{symbol} Chart</span>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>{symbol}</span>
              {name && <span className="text-sm font-normal text-muted-foreground">({name})</span>}
            </CardTitle>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-2xl font-bold">${currentPrice.toFixed(2)}</span>
              <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <Badge variant={isPositive ? "default" : "destructive"}>
                  {isPositive ? '+' : ''}${Math.abs(priceChange).toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {(['1D', '1W', '1M', '3M', '1Y'] as const).map((period) => (
                <Button
                  key={`timeframe-${period}`}
                  variant={timeframe === period ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeframe(period)}
                  className="h-7 px-2 text-xs"
                >
                  {period}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadChartData}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart data={chartData}>
            <XAxis 
              dataKey="date" 
              tickLine={false}
              axisLine={false}
              className="text-xs"
            />
            <YAxis 
              domain={['dataMin - 5', 'dataMax + 5']}
              tickLine={false}
              axisLine={false}
              className="text-xs"
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <ChartTooltip 
              content={<ChartTooltipContent 
                formatter={(value, name) => [
                  `$${Number(value).toFixed(2)}`,
                  'Price'
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />} 
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="var(--color-price)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "var(--color-price)", strokeWidth: 2 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}