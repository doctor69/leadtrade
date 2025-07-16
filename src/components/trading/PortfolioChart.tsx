import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface PortfolioData {
  date: string;
  value: number;
  change: number;
}

export default function PortfolioChart() {
  const [portfolioData, setPortfolioData] = useState<PortfolioData[]>([]);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1W');
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual API calls
  useEffect(() => {
    setTimeout(() => {
      const mockData: PortfolioData[] = [
        { date: '2024-01-01', value: 50000, change: 0 },
        { date: '2024-01-02', value: 51200, change: 1200 },
        { date: '2024-01-03', value: 50800, change: -400 },
        { date: '2024-01-04', value: 52100, change: 1300 },
        { date: '2024-01-05', value: 53400, change: 1300 },
        { date: '2024-01-06', value: 52900, change: -500 },
        { date: '2024-01-07', value: 54200, change: 1300 },
        { date: '2024-01-08', value: 55100, change: 900 },
        { date: '2024-01-09', value: 54700, change: -400 },
        { date: '2024-01-10', value: 56300, change: 1600 },
      ];
      setPortfolioData(mockData);
      setLoading(false);
    }, 1000);
  }, [timeframe]);

  const currentValue = portfolioData[portfolioData.length - 1]?.value || 0;
  const initialValue = portfolioData[0]?.value || 0;
  const totalChange = currentValue - initialValue;
  const totalChangePercent = initialValue ? (totalChange / initialValue) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Portfolio Performance</span>
            </CardTitle>
            <CardDescription>Track your portfolio value over time</CardDescription>
          </div>
          
          {/* Timeframe Selector */}
          <div className="flex space-x-1">
            {(['1D', '1W', '1M', '3M', '1Y'] as const).map((period) => (
              <Button
                key={period}
                variant={timeframe === period ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe(period)}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Current Value and Change */}
        <div className="flex items-center space-x-4 mt-4">
          <div>
            <div className="text-2xl font-bold">{formatCurrency(currentValue)}</div>
            <div className="flex items-center space-x-2">
              {totalChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <Badge variant={totalChange >= 0 ? "default" : "destructive"}>
                {totalChange >= 0 ? '+' : ''}{formatCurrency(totalChange)} ({totalChangePercent.toFixed(2)}%)
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={portfolioData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                className="text-xs"
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                className="text-xs"
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Portfolio Value']}
                labelFormatter={(label) => formatDate(label)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}