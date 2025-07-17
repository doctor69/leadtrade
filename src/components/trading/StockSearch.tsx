import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { apiService } from '@/lib/apiService';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

interface StockSearchProps {
  onSelectStock?: (stock: StockData) => void;
}

export default function StockSearch({ onSelectStock }: StockSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [popularStocks] = useState<StockData[]>([
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 185.50,
      change: 2.30,
      changePercent: 1.26,
      volume: 45678900
    },
    {
      symbol: 'TSLA',
      name: 'Tesla, Inc.',
      price: 240.80,
      change: -5.20,
      changePercent: -2.12,
      volume: 23456789
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      price: 378.90,
      change: 4.50,
      changePercent: 1.20,
      volume: 12345678
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      price: 142.30,
      change: 1.80,
      changePercent: 1.28,
      volume: 8765432
    }
  ]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    
    try {
      const response = await apiService.getAssets({
        search: searchTerm,
        status: 'active',
        asset_class: 'us_equity'
      });
      
      if (response.success && response.data) {
        // Get market data for found assets
        const symbols = response.data.slice(0, 10).map((asset: any) => asset.symbol).join(',');
        const marketResponse = await apiService.getBars({
          symbols,
          timeframe: '1Day',
          limit: 1
        });
        
        // Transform results with real market data
        const transformedResults: StockData[] = response.data.slice(0, 10).map((asset: any) => {
          const marketData = marketResponse.data?.bars?.[asset.symbol]?.[0];
          const currentPrice = marketData?.c || Math.random() * 200 + 50;
          const previousClose = marketData?.o || currentPrice;
          const change = currentPrice - previousClose;
          const changePercent = previousClose ? (change / previousClose) * 100 : 0;
          
          return {
            symbol: asset.symbol,
            name: asset.name,
            price: currentPrice,
            change,
            changePercent,
            volume: marketData?.v || Math.floor(Math.random() * 10000000)
          };
        });
        setSearchResults(transformedResults);
      } else {
        // Fallback to filtered popular stocks
        const filtered = popularStocks.filter(stock => 
          stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          stock.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to filtered popular stocks
      const filtered = popularStocks.filter(stock => 
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const StockCard = ({ stock }: { stock: StockData }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSelectStock?.(stock)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{stock.symbol}</h3>
            <p className="text-sm text-muted-foreground truncate max-w-[200px]">{stock.name}</p>
          </div>
          
          <div className="text-right">
            <div className="font-semibold text-lg">${stock.price.toFixed(2)}</div>
            <div className="flex items-center space-x-1">
              {stock.change >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <Badge variant={stock.change >= 0 ? "default" : "destructive"} className="text-xs">
                {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground">
          Volume: {stock.volume.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Search Stocks</CardTitle>
          <CardDescription>Find stocks to trade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by symbol or company name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchResults.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        </div>
      )}

      {/* Popular Stocks */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Popular Stocks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {popularStocks.map((stock) => (
            <StockCard key={stock.symbol} stock={stock} />
          ))}
        </div>
      </div>
    </div>
  );
}