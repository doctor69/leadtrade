import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/datatable';
import { TrendingUp, TrendingDown, Search, RefreshCw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { safeNavigate } from '@/lib/navigation';

interface MarketDataItem {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdate: string;
}

const DOW_JONES_30 = [
  'AAPL', 'AMGN', 'AXP', 'BA', 'CAT', 'CRM', 'CSCO', 'CVX', 'DIS', 'DOW',
  'GS', 'HD', 'HON', 'IBM', 'INTC', 'JNJ', 'JPM', 'KO', 'MCD', 'MMM',
  'MRK', 'MSFT', 'NKE', 'PG', 'TRV', 'UNH', 'V', 'VZ', 'WBA', 'WMT'
];

const COLUMNS: ColumnDef<MarketDataItem>[] = [
  {
    accessorKey: 'symbol',
    header: 'Symbol',
    cell: ({ row }) => (
      <div className="font-medium">
        {row.getValue('symbol') as string}
      </div>
    ),
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => <div className="font-mono">${parseFloat(row.getValue('price')).toFixed(2)}</div>,
  },
  {
    accessorKey: 'change',
    header: 'Change',
    cell: ({ row }) => {
      const change = parseFloat(row.getValue('change') || '0');
      const changePercent = parseFloat(String(row.original.changePercent || 0));
      const isPositive = change >= 0;
      return (
        <div className={`flex items-center space-x-1 ${isPositive ? 'text-positive' : 'text-negative'}`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span className="font-mono">
            {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'volume',
    header: 'Volume',
    cell: ({ row }) => <div className="font-mono">{parseFloat(row.getValue('volume')).toLocaleString()}</div>,
  },
  {
    accessorKey: 'bid',
    header: 'Bid',
    cell: ({ row }) => <div className="font-mono">${parseFloat(row.getValue('bid')).toFixed(2)}</div>,
  },
  {
    accessorKey: 'ask',
    header: 'Ask',
    cell: ({ row }) => <div className="font-mono">${parseFloat(row.getValue('ask')).toFixed(2)}</div>,
  },
  {
    id: 'actions',
    header: 'Action',
    cell: ({ row }) => (
      <Button
        size="sm"
        onClick={() => safeNavigate(`/trade?symbol=${row.getValue('symbol')}&type=stock`)}
      >
        Trade
      </Button>
    ),
  },
];

export default function SimpleMarketGrid() {
  const [searchQuery, setSearchQuery] = useState('');
  const [marketData, setMarketData] = useState<MarketDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Fetch market data for given symbols
  const fetchMarketData = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setIsLoading(false);
        return;
      }
      
      const symbolsParam = symbols.join(',');
      const apiUrl = `${supabaseUrl}/functions/v1/alpaca-market-quotes?symbols=${symbolsParam}&feed=iex`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch market data: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data?.quotes) {
        const quotes = result.data.quotes.map((q: any) => {
          const price = q.latest_trade?.price || q.ask || q.bid || 0;
          return {
            symbol: q.symbol,
            price,
            bid: q.bid || 0,
            ask: q.ask || 0,
            change: 0,
            changePercent: 0,
            volume: q.latest_trade?.size || 0,
            lastUpdate: q.timestamp || new Date().toISOString()
          };
        });
        
        setMarketData(quotes);
        setLastUpdate(new Date().toLocaleTimeString());
      } else {
        throw new Error(result.error || 'Invalid response format');
      }
    } catch (err) {
      console.error('Market data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search for assets
  const searchAssets = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setIsLoading(false);
        return;
      }
      
      // For MVP: Just search within a predefined list of popular stocks
      const popularStocks = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'V', 'JNJ',
        'WMT', 'JPM', 'MA', 'PG', 'UNH', 'HD', 'DIS', 'BAC', 'ADBE', 'CRM',
        'NFLX', 'CMCSA', 'XOM', 'PFE', 'CSCO', 'ABT', 'KO', 'PEP', 'TMO', 'COST',
        'AVGO', 'MRK', 'ACN', 'NKE', 'LLY', 'DHR', 'TXN', 'NEE', 'ORCL', 'MDT',
        'AMD', 'QCOM', 'UNP', 'PM', 'HON', 'UPS', 'RTX', 'LOW', 'INTU', 'IBM',
        'AMGN', 'AXP', 'BA', 'CAT', 'CVX', 'DOW', 'GS', 'INTC', 'MMM', 'MCD',
        'VZ', 'WBA', 'TRV', 'SPGI', 'BLK', 'ADP', 'GILD', 'BKNG', 'MDLZ', 'ISRG',
        'CI', 'SYK', 'ZTS', 'REGN', 'CB', 'MMC', 'SO', 'DUK', 'PLD', 'CL',
        'PYPL', 'SCHW', 'USB', 'TGT', 'MO', 'BMY', 'CVS', 'EL', 'ATVI', 'FIS'
      ];
      
      const queryUpper = query.toUpperCase();
      const matchingSymbols = popularStocks
        .filter(symbol => symbol.includes(queryUpper))
        .slice(0, 30);
      
      if (matchingSymbols.length > 0) {
        await fetchMarketData(matchingSymbols);
      } else {
        setMarketData([]);
        setError(`No results found for "${query}". Try searching for popular stocks like AAPL, TSLA, MSFT, etc.`);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!searchQuery.trim()) {
        fetchMarketData(DOW_JONES_30);
      } else {
        searchAssets(searchQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Initial load
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetchMarketData(DOW_JONES_30);
      }
    };
    
    checkAuthAndLoad();
  }, [fetchMarketData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!searchQuery) {
        fetchMarketData(DOW_JONES_30);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [searchQuery, fetchMarketData]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {searchQuery ? 'Search Results' : 'Dow Jones Industrial Average (DJIA)'}
              </CardTitle>
              <CardDescription>
                {searchQuery 
                  ? `Showing results for "${searchQuery}"`
                  : 'Real-time quotes for all 30 Dow Jones stocks'
                }
                {lastUpdate && <span className="ml-2">• Updated {lastUpdate}</span>}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search any stock..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => searchQuery ? searchAssets(searchQuery) : fetchMarketData(DOW_JONES_30)}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          {error && (
            <div className="text-sm text-destructive mt-2">
              {error}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && marketData.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <DataTable 
                columns={COLUMNS} 
                data={marketData}
                enablePagination={true}
                pageSize={10}
              />
              {searchQuery && marketData.length === 0 && !isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  No stocks found matching "{searchQuery}"
                </div>
              )}
            </>
          )}
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <p>• Data provided by Alpaca Markets via IEX feed</p>
            <p>• Showing {marketData.length} stocks</p>
            <p>• Auto-refreshes every 10 seconds</p>
            <p>• Click Trade button to start trading</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
