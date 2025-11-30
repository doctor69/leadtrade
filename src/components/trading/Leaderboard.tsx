import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, TrendingUp, TrendingDown, Medal, Award, Search, Filter, Eye, Users, BarChart3 } from 'lucide-react';
import { apiService, type LeaderboardEntry } from '@/lib/apiService';
import TraderProfileModal from './TraderProfileModal';

type SortOption = 'return' | 'winRate' | 'trades' | 'portfolio';
type FilterOption = 'all' | 'profitable' | 'highVolume' | 'consistent';

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [filteredData, setFilteredData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('weekly');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('return');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedTrader, setSelectedTrader] = useState<LeaderboardEntry | null>(null);

  // Fetch real leaderboard data from Supabase
  useEffect(() => {
    fetchLeaderboardData();
  }, [timeframe]);

  // Filter and sort data when dependencies change
  useEffect(() => {
    let filtered = [...leaderboardData];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(trader =>
        trader.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    switch (filterBy) {
      case 'profitable':
        filtered = filtered.filter(trader => trader.totalReturn > 0);
        break;
      case 'highVolume':
        filtered = filtered.filter(trader => trader.tradesCount >= 20);
        break;
      case 'consistent':
        filtered = filtered.filter(trader => trader.winRate >= 60);
        break;
      default:
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'return':
          return b.totalReturnPercent - a.totalReturnPercent;
        case 'winRate':
          return b.winRate - a.winRate;
        case 'trades':
          return b.tradesCount - a.tradesCount;
        case 'portfolio':
          return b.portfolioValue - a.portfolioValue;
        default:
          return a.rank - b.rank;
      }
    });

    // Update ranks after filtering and sorting
    filtered.forEach((trader, index) => {
      trader.rank = index + 1;
    });

    setFilteredData(filtered);
  }, [leaderboardData, searchTerm, sortBy, filterBy]);

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
          <CardDescription>
            Discover and follow top performing traders • {filteredData.length} traders found
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Controls Section */}
      <div className="space-y-4">
        {/* Timeframe Selector */}
        <div className="flex flex-wrap gap-2">
          {(['daily', 'weekly', 'monthly', 'all'] as const).map((period) => (
            <Button
              key={`timeframe-${period}`}
              variant={timeframe === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe(period)}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search traders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 min-h-[44px]"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-[140px] min-h-[44px]">
                <BarChart3 className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="return">Total Return</SelectItem>
                <SelectItem value="winRate">Win Rate</SelectItem>
                <SelectItem value="trades">Trade Count</SelectItem>
                <SelectItem value="portfolio">Portfolio Size</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
              <SelectTrigger className="w-full sm:w-[130px] min-h-[44px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Traders</SelectItem>
                <SelectItem value="profitable">Profitable</SelectItem>
                <SelectItem value="highVolume">High Volume</SelectItem>
                <SelectItem value="consistent">Consistent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      {filteredData.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.slice(0, 3).map((trader) => (
            <Card 
              key={trader.id} 
              className={`cursor-pointer transition-all hover:shadow-lg active:scale-95 ${
                trader.rank === 1 ? 'ring-2 ring-yellow-500' : ''
              }`}
              onClick={() => setSelectedTrader(trader)}
            >
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="flex justify-center mb-3 sm:mb-4">
                  {getRankIcon(trader.rank)}
                </div>
                
                <Avatar className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4">
                  <AvatarFallback className="text-sm sm:text-lg font-bold">
                    {getInitials(trader.username)}
                  </AvatarFallback>
                </Avatar>
                
                <h3 className="font-semibold text-base sm:text-lg mb-2 truncate">{trader.username}</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    {trader.totalReturn >= 0 ? (
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
                    )}
                    <Badge variant={trader.totalReturn >= 0 ? "default" : "destructive"} className="text-xs">
                      {trader.totalReturn >= 0 ? '+' : ''}${trader.totalReturn.toLocaleString()} ({trader.totalReturnPercent.toFixed(1)}%)
                    </Badge>
                  </div>
                  
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {trader.showAssetAmounts ? (
                      `Portfolio: $${trader.portfolioValue.toLocaleString()}`
                    ) : (
                      'Portfolio: Hidden'
                    )}
                  </div>
                  
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Win Rate: {trader.winRate.toFixed(1)}%
                  </div>

                  <Button size="sm" className="mt-2 min-h-[36px] text-xs">
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Traders</span>
            <Badge variant="secondary">{filteredData.length} results</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No traders found matching your criteria</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  setSearchTerm('');
                  setFilterBy('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredData.map((trader) => (
                <div 
                  key={trader.id} 
                  className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer min-h-[60px]"
                  onClick={() => setSelectedTrader(trader)}
                >
                  <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-6 sm:w-8 flex-shrink-0">
                      {trader.rank <= 3 ? getRankIcon(trader.rank) : (
                        <span className="text-xs sm:text-sm font-bold text-muted-foreground">#{trader.rank}</span>
                      )}
                    </div>
                    
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                      <AvatarFallback className="text-xs sm:text-sm">{getInitials(trader.username)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base truncate">{trader.username}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {trader.tradesCount} trades • {trader.winRate.toFixed(1)}% win rate
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center space-x-1 sm:space-x-2 mb-1">
                        {trader.totalReturn >= 0 ? (
                          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                        )}
                        <Badge variant={trader.totalReturn >= 0 ? "default" : "destructive"} className="text-xs">
                          {trader.totalReturn >= 0 ? '+' : ''}${trader.totalReturn.toLocaleString()}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {trader.showAssetAmounts ? `$${trader.portfolioValue.toLocaleString()}` : 'Portfolio Hidden'}
                      </div>
                    </div>
                    
                    <Button size="sm" variant="outline" className="min-h-[36px] text-xs">
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trader Profile Modal/Detail View */}
      {selectedTrader && (
        <TraderProfileModal 
          trader={selectedTrader} 
          onClose={() => setSelectedTrader(null)} 
        />
      )}
    </div>
  );
}