import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Trophy, 
  Activity, 
  Target, 
  Users, 
  BarChart3,
  Clock,
  DollarSign,
  Percent
} from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/apiService';

interface TraderProfileModalProps {
  trader: LeaderboardEntry;
  onClose: () => void;
}

export default function TraderProfileModal({ trader, onClose }: TraderProfileModalProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTradingStyleColor = (style: string) => {
    switch (style) {
      case 'conservative': return 'text-blue-600 bg-blue-100';
      case 'moderate': return 'text-purple-600 bg-purple-100';
      case 'active': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleFollow = async () => {
    setLoading(true);
    try {
      // TODO: Implement follow/unfollow API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Failed to follow/unfollow trader:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock performance history data
  const performanceHistory = [
    { period: 'Last 7 days', return: 2.3, trades: 8 },
    { period: 'Last 30 days', return: 8.7, trades: 24 },
    { period: 'Last 90 days', return: 15.2, trades: 67 },
    { period: 'All time', return: trader.totalReturnPercent, trades: trader.tradesCount }
  ];

  // Mock recent trades data
  const recentTrades = [
    { symbol: 'AAPL', side: 'buy', quantity: 50, price: 185.20, date: '2024-01-15', profit: 245.50 },
    { symbol: 'MSFT', side: 'sell', quantity: 25, price: 412.80, date: '2024-01-14', profit: -89.25 },
    { symbol: 'GOOGL', side: 'buy', quantity: 10, price: 142.65, date: '2024-01-13', profit: 156.80 },
    { symbol: 'TSLA', side: 'sell', quantity: 15, price: 238.45, date: '2024-01-12', profit: 312.75 }
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl font-bold">
                  {getInitials(trader.username)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl">{trader.username}</DialogTitle>
                <DialogDescription className="flex items-center space-x-4 mt-2">
                  <span className="flex items-center space-x-1">
                    <Trophy className="h-4 w-4" />
                    <span>Rank #{trader.rank}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{trader.followers || 0} followers</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Active {trader.lastActive ? new Date(trader.lastActive).toLocaleDateString() : 'recently'}</span>
                  </span>
                </DialogDescription>
              </div>
            </div>
            <Button
              onClick={handleFollow}
              disabled={loading}
              variant={isFollowing ? 'outline' : 'default'}
              className="ml-4"
            >
              {loading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Return</p>
                    <p className="text-lg font-semibold text-green-600">
                      ${trader.totalReturn.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Percent className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Return %</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {trader.totalReturnPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-lg font-semibold text-purple-600">
                      {trader.winRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Trades</p>
                    <p className="text-lg font-semibold text-orange-600">
                      {trader.tradesCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trading Style & Risk Profile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trading Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trading Style</span>
                  <Badge className={getTradingStyleColor(trader.tradingStyle || 'moderate')}>
                    {(trader.tradingStyle || 'moderate').charAt(0).toUpperCase() + (trader.tradingStyle || 'moderate').slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Risk Level</span>
                  <Badge className={getRiskLevelColor(trader.riskLevel || 'medium')}>
                    {(trader.riskLevel || 'medium').charAt(0).toUpperCase() + (trader.riskLevel || 'medium').slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Hold Time</span>
                  <span className="text-sm font-medium">{trader.avgHoldTime || 7} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Portfolio Size</span>
                  <span className="text-sm font-medium">
                    {trader.showAssetAmounts ? `$${trader.portfolioValue.toLocaleString()}` : 'Hidden'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performanceHistory.map((period, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{period.period}</span>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${period.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {period.return >= 0 ? '+' : ''}{period.return.toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({period.trades} trades)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Trades */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Recent Trades</span>
              </CardTitle>
              <CardDescription>
                Latest trading activity from this trader
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTrades.map((trade, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'}>
                        {trade.side.toUpperCase()}
                      </Badge>
                      <div>
                        <p className="font-medium">{trade.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {trade.quantity} shares @ ${trade.price}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">{trade.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Copy Trading Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Copy This Trader</CardTitle>
              <CardDescription>
                Automatically copy trades from {trader.username} with customizable allocation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Start copying trades</p>
                  <p className="text-sm text-muted-foreground">
                    Set your allocation percentage and risk limits
                  </p>
                </div>
                <Button onClick={handleFollow} disabled={loading}>
                  {isFollowing ? 'Manage Copy Settings' : 'Start Copying'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}