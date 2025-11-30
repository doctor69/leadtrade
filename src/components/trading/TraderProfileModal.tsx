import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Trophy, 
  Users, 
  DollarSign,
  Target,
  Activity,
  X
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis } from 'recharts';
import type { LeaderboardEntry } from '@/lib/apiService';

interface TraderProfileModalProps {
  trader: LeaderboardEntry;
  onClose: () => void;
}

interface TradeHistory {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: string;
  profit?: number;
}

// Mock data for trader performance chart
const generatePerformanceData = () => {
  const data = [];
  let value = 10000;
  
  for (let i = 0; i < 30; i++) {
    value += (Math.random() - 0.4) * 500;
    data.push({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.max(value, 5000)
    });
  }
  
  return data;
};

// Mock trade history
const generateTradeHistory = (): TradeHistory[] => {
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'META', 'NVDA'];
  const trades: TradeHistory[] = [];
  
  for (let i = 0; i < 10; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const type = Math.random() > 0.5 ? 'buy' : 'sell';
    const quantity = Math.floor(Math.random() * 100) + 1;
    const price = Math.random() * 200 + 50;
    const profit = type === 'sell' ? (Math.random() - 0.3) * 1000 : undefined;
    
    trades.push({
      id: `trade-${i}`,
      symbol,
      type,
      quantity,
      price,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      profit
    });
  }
  
  return trades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const chartConfig = {
  value: {
    label: "Portfolio Value",
    color: "hsl(var(--chart-1))",
  },
};

export default function TraderProfileModal({ trader, onClose }: TraderProfileModalProps) {
  const [following, setFollowing] = useState(false);
  const [performanceData] = useState(generatePerformanceData());
  const [tradeHistory] = useState(generateTradeHistory());

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const handleFollow = () => {
    setFollowing(!following);
    // In production, this would make an API call to follow/unfollow the trader
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg font-bold">
                  {getInitials(trader.username)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl">{trader.username}</DialogTitle>
                <DialogDescription className="flex items-center space-x-2 mt-1">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span>Rank #{trader.rank}</span>
                  <Badge variant="secondary">{trader.tradesCount} trades</Badge>
                </DialogDescription>
              </div>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {trader.totalReturn >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <div className="text-sm text-muted-foreground">Total Return</div>
                  <div className={`font-semibold ${trader.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trader.totalReturn >= 0 ? '+' : ''}${trader.totalReturn.toLocaleString()} ({trader.totalReturnPercent.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                  <div className="font-semibold">{trader.winRate.toFixed(1)}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Total Trades</div>
                  <div className="font-semibold">{trader.tradesCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Portfolio</div>
                  <div className="font-semibold">
                    {trader.showAssetAmounts ? `$${trader.portfolioValue.toLocaleString()}` : 'Hidden'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Follow Button */}
        <div className="flex justify-center mt-6">
          <Button 
            onClick={handleFollow}
            className={`px-8 ${following ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            <Users className="h-4 w-4 mr-2" />
            {following ? 'Following' : 'Follow Trader'}
          </Button>
        </div>

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="performance" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="trades">Recent Trades</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Performance (30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart data={performanceData}>
                    <XAxis 
                      dataKey="date" 
                      tickLine={false}
                      axisLine={false}
                      className="text-xs"
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      className="text-xs"
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Portfolio Value']}
                      />} 
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-value)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Trading Activity</CardTitle>
                <CardDescription>Last 10 trades by this trader</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tradeHistory.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant={trade.type === 'buy' ? 'default' : 'secondary'}>
                          {trade.type.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-medium">{trade.symbol}</div>
                          <div className="text-sm text-muted-foreground">
                            {trade.quantity} shares @ ${trade.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {new Date(trade.timestamp).toLocaleDateString()}
                        </div>
                        {trade.profit !== undefined && (
                          <div className={`text-sm font-medium ${trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trading Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center text-muted-foreground py-8">
                    <p>Trading statistics will be available when real data is connected.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Popular Holdings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN'].map((symbol, index) => (
                    <div key={`holding-${symbol}`} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="font-medium">{symbol}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{25 - index * 3}%</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}