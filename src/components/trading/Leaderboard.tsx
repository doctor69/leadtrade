import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, TrendingUp, TrendingDown, Medal, Award } from 'lucide-react';
import { apiService, type LeaderboardEntry } from '@/lib/apiService';



export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('weekly');

  // Fetch real leaderboard data from Supabase
  useEffect(() => {
    fetchLeaderboardData();
  }, [timeframe]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      const result = await apiService.getLeaderboard({
        timeframe,
        limit: 50
      });
      
      if (result.success && result.data) {
        setLeaderboardData(result.data);
      } else {
        setLeaderboardData([]);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard data:', error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <span>Trading Leaderboard</span>
          </CardTitle>
          <CardDescription>Top performing traders this week</CardDescription>
        </CardHeader>
      </Card>

      {/* Timeframe Selector */}
      <div className="flex space-x-2">
        {(['daily', 'weekly', 'monthly', 'all'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setTimeframe(period)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeframe === period
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {leaderboardData.slice(0, 3).map((trader) => (
          <Card key={trader.id} className={`${trader.rank === 1 ? 'ring-2 ring-yellow-500' : ''}`}>
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                {getRankIcon(trader.rank)}
              </div>
              
              <Avatar className="h-16 w-16 mx-auto mb-4">
                <AvatarFallback className="text-lg font-bold">
                  {getInitials(trader.username)}
                </AvatarFallback>
              </Avatar>
              
              <h3 className="font-semibold text-lg mb-2">{trader.username}</h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  {trader.totalReturn >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <Badge variant={trader.totalReturn >= 0 ? "default" : "destructive"}>
                    {trader.totalReturn >= 0 ? '+' : ''}${trader.totalReturn.toLocaleString()} ({trader.totalReturnPercent.toFixed(1)}%)
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Portfolio: ${trader.portfolioValue.toLocaleString()}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Win Rate: {trader.winRate.toFixed(1)}%
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Full Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leaderboardData.map((trader) => (
              <div key={trader.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8">
                    {trader.rank <= 3 ? getRankIcon(trader.rank) : (
                      <span className="text-sm font-bold text-muted-foreground">#{trader.rank}</span>
                    )}
                  </div>
                  
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(trader.username)}</AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h4 className="font-semibold">{trader.username}</h4>
                    <p className="text-sm text-muted-foreground">
                      {trader.tradesCount} trades • {trader.winRate.toFixed(1)}% win rate
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-1">
                    {trader.totalReturn >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <Badge variant={trader.totalReturn >= 0 ? "default" : "destructive"}>
                      {trader.totalReturn >= 0 ? '+' : ''}${trader.totalReturn.toLocaleString()}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ${trader.portfolioValue.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}