import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/datatable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ExternalLink, BarChart3, ChevronRight } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { safeNavigate } from '@/lib/navigation';


interface Asset {
  symbol: string;
  name: string;
  type: 'stock' | 'option';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  lastUpdate: string;
}

// Fetch real assets from Alpaca API
const fetchUserAssets = async (): Promise<Asset[]> => {
  try {
    // Import apiService dynamically to avoid SSR issues
    const { apiService } = await import('@/lib/apiService');
    
    // Get positions from Alpaca
    const positionsResult = await apiService.getPositions();
    if (!positionsResult.success || !positionsResult.data) {
      return [];
    }

    const positions = positionsResult.data;
    
    // Transform Alpaca positions to our Asset format
    return positions.map((position: any): Asset => ({
      symbol: position.symbol,
      name: position.symbol, // We'd need to fetch company names separately
      type: 'stock' as const, // Alpaca positions don't distinguish options here
      quantity: Number(position.qty || 0),
      avgPrice: Number(position.avg_entry_price || 0),
      currentPrice: Number(position.market_value || 0) / Number(position.qty || 1),
      marketValue: Number(position.market_value || 0),
      unrealizedPL: Number(position.unrealized_pl || 0),
      unrealizedPLPercent: Number(position.unrealized_plpc || 0),
      dayChange: Number(position.change_today || 0),
      dayChangePercent: Number(position.change_today || 0) / Number(position.market_value || 1) * 100,
      lastUpdate: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to fetch user assets:', error);
    return [];
  }
};

// Mobile Asset Card Component
const AssetCard = ({ asset }: { asset: Asset }) => {
  const isPositive = asset.unrealizedPL >= 0;
  const isDayPositive = asset.dayChange >= 0;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div>
            <div className="font-semibold text-base">{asset.symbol}</div>
            <div className="text-sm text-muted-foreground truncate max-w-[120px]">
              {asset.name}
            </div>
          </div>
          <Badge variant={asset.type === 'stock' ? 'default' : 'secondary'} className="text-xs">
            {asset.type}
          </Badge>
        </div>
        <div className="text-right">
          <div className="font-mono font-semibold">${asset.currentPrice.toFixed(2)}</div>
          <div className={`flex items-center justify-end space-x-1 text-xs ${
            isDayPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isDayPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>
              {isDayPositive ? '+' : ''}{asset.dayChange.toFixed(2)} ({isDayPositive ? '+' : ''}{asset.dayChangePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-muted-foreground">Quantity</div>
          <div className="font-mono">{asset.quantity.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Avg Price</div>
          <div className="font-mono">${asset.avgPrice.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Market Value</div>
          <div className="font-mono font-medium">${asset.marketValue.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Unrealized P&L</div>
          <div className={`font-mono font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}${Math.abs(asset.unrealizedPL).toLocaleString()}
          </div>
          <div className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            ({isPositive ? '+' : ''}{asset.unrealizedPLPercent.toFixed(2)}%)
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 pt-3 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => safeNavigate(`/trade?symbol=${asset.symbol}&type=${asset.type}`)}
          className="flex items-center space-x-1 flex-1 mr-2 h-9"
        >
          <ExternalLink className="h-3 w-3" />
          <span>Trade</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            console.log('View chart for', asset.symbol);
          }}
          className="h-9 w-9 p-0"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

const COLUMNS: ColumnDef<Asset>[] = [
  {
    accessorKey: 'symbol',
    header: 'Symbol',
    cell: ({ row }) => {
      const asset = row.original;
      return (
        <div className="flex items-center space-x-2 min-w-[140px]">
          <div>
            <div className="font-medium">{asset.symbol}</div>
            <div className="text-sm text-muted-foreground truncate max-w-[100px] md:max-w-[150px]">
              {asset.name}
            </div>
          </div>
          <Badge variant={asset.type === 'stock' ? 'default' : 'secondary'} className="text-xs">
            {asset.type}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'quantity',
    header: 'Qty',
    cell: ({ row }) => {
      const quantity = row.getValue('quantity') as number;
      return <div className="font-mono text-sm min-w-[60px]">{quantity.toLocaleString()}</div>;
    },
  },
  {
    accessorKey: 'avgPrice',
    header: 'Avg Price',
    cell: ({ row }) => {
      const price = row.getValue('avgPrice') as number;
      return <div className="font-mono text-sm min-w-[80px]">${price.toFixed(2)}</div>;
    },
  },
  {
    accessorKey: 'currentPrice',
    header: 'Current Price',
    cell: ({ row }) => {
      const price = row.getValue('currentPrice') as number;
      const dayChange = row.original.dayChange;
      const dayChangePercent = row.original.dayChangePercent;
      const isPositive = dayChange >= 0;

      return (
        <div className="space-y-1 min-w-[100px]">
          <div className="font-mono text-sm">${price.toFixed(2)}</div>
          <div className={`flex items-center space-x-1 text-xs ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="whitespace-nowrap">
              {isPositive ? '+' : ''}{dayChange.toFixed(2)} ({isPositive ? '+' : ''}{dayChangePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'marketValue',
    header: 'Market Value',
    cell: ({ row }) => {
      const value = row.getValue('marketValue') as number;
      return <div className="font-mono font-medium text-sm min-w-[100px]">${value.toLocaleString()}</div>;
    },
  },
  {
    accessorKey: 'unrealizedPL',
    header: 'Unrealized P&L',
    cell: ({ row }) => {
      const pl = row.getValue('unrealizedPL') as number;
      const plPercent = row.original.unrealizedPLPercent;
      const isPositive = pl >= 0;

      return (
        <div className={`space-y-1 min-w-[110px] ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          <div className="font-mono font-medium text-sm">
            {isPositive ? '+' : ''}${Math.abs(pl).toLocaleString()}
          </div>
          <div className="text-xs">
            ({isPositive ? '+' : ''}{plPercent.toFixed(2)}%)
          </div>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const asset = row.original;
      return (
        <div className="flex items-center space-x-1 min-w-[120px]">
          <Button
            variant="outline"
            size="sm"
            onClick={() => safeNavigate(`/trade?symbol=${asset.symbol}&type=${asset.type}`)}
            className="flex items-center space-x-1 h-8 px-2 text-xs"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">Trade</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Open chart modal or navigate to detailed view
              console.log('View chart for', asset.symbol);
            }}
            className="h-8 w-8 p-0"
          >
            <BarChart3 className="h-3 w-3" />
          </Button>
        </div>
      );
    },
  },
];

export default function AssetGrid() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    setMounted(true);
    
    // Mobile detection and responsive setup
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setViewMode(mobile ? 'cards' : 'table');
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const loadAssets = async () => {
      setLoading(true);
      const userAssets = await fetchUserAssets();
      setAssets(userAssets);
      setLoading(false);
    };

    loadAssets();
  }, [mounted]);

  if (!mounted || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Assets</CardTitle>
          <CardDescription>Loading your portfolio positions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (assets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Assets</CardTitle>
          <CardDescription>No positions found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No assets in your portfolio</p>
              <p className="text-sm text-muted-foreground">Start trading to see your positions here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className={isMobile ? 'pb-3' : ''}>
        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center justify-between'}`}>
          <div>
            <CardTitle className={isMobile ? 'text-lg' : ''}>Your Assets</CardTitle>
            <CardDescription className={isMobile ? 'text-sm' : ''}>
              Current portfolio positions with real-time pricing and performance metrics
            </CardDescription>
          </div>
          
          {/* View Mode Toggle for Desktop */}
          {!isMobile && (
            <div className="flex space-x-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                Cards
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={isMobile ? 'px-3' : ''}>
        {viewMode === 'table' ? (
          <div className={isMobile ? 'overflow-x-auto' : ''}>
            <DataTable columns={COLUMNS} data={assets} />
          </div>
        ) : (
          <div className={`grid gap-4 ${
            isMobile 
              ? 'grid-cols-1' 
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            {assets.map((asset) => (
              <AssetCard key={asset.symbol} asset={asset} />
            ))}
          </div>
        )}
        
        {/* Horizontal scroll indicator for mobile table */}
        {isMobile && viewMode === 'table' && assets.length > 0 && (
          <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground">
            <ChevronRight className="h-3 w-3 mr-1" />
            Scroll horizontally to see more columns
          </div>
        )}
      </CardContent>
    </Card>
  );
}