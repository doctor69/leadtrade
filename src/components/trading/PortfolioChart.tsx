import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, ZoomIn, ZoomOut, RotateCcw, BarChart3 } from 'lucide-react';
import { apiService } from '@/lib/apiService';

interface PortfolioData {
  date: string;
  value: number;
  change: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startDistance: number;
  isZooming: boolean;
  isPanning: boolean;
}

interface ChartZoom {
  startIndex: number;
  endIndex: number;
  scale: number;
}

export default function PortfolioChart() {
  const [portfolioData, setPortfolioData] = useState<PortfolioData[]>([]);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1A'>('1W');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [chartZoom, setChartZoom] = useState<ChartZoom>({ startIndex: 0, endIndex: -1, scale: 1 });
  const [touchState, setTouchState] = useState<TouchState | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(264);

  // Mobile detection and responsive setup
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setChartHeight(mobile ? 200 : 264);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch real portfolio history data
  useEffect(() => {
    fetchPortfolioHistory();
  }, [timeframe]);

  const fetchPortfolioHistory = async () => {
    try {
      setLoading(true);
      const result = await apiService.getPortfolioHistory({
        period: timeframe,
        timeframe: '1D'
      });
      
      if (result.success && result.data) {
        const historyData = result.data;
        
        if (historyData.timestamp && historyData.equity) {
          const formattedData: PortfolioData[] = historyData.timestamp.map((timestamp: string, index: number) => ({
            date: new Date(timestamp).toISOString().split('T')[0],
            value: historyData.equity[index] || 0,
            change: index > 0 ? (historyData.equity[index] - historyData.equity[index - 1]) : 0,
          }));
          setPortfolioData(formattedData);
        } else {
          // Try to get current account value if no history
          const accountResult = await apiService.getAccount();
          if (accountResult.success && accountResult.data) {
            const currentValue = accountResult.data.portfolio_value || 0;
            setPortfolioData([{
              date: new Date().toISOString().split('T')[0],
              value: currentValue,
              change: 0,
            }]);
          } else {
            setPortfolioData([]);
          }
        }
      } else {
        // Handle 404 or other errors gracefully - try to get current account value
        console.log('Portfolio history not available, using current account value');
        const accountResult = await apiService.getAccount();
        if (accountResult.success && accountResult.data) {
          const currentValue = accountResult.data.portfolio_value || 0;
          setPortfolioData([{
            date: new Date().toISOString().split('T')[0],
            value: currentValue,
            change: 0,
          }]);
        } else {
          setPortfolioData([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch portfolio history:', error);
      // Fallback to current account value on any error
      try {
        const accountResult = await apiService.getAccount();
        if (accountResult.success && accountResult.data) {
          const currentValue = accountResult.data.portfolio_value || 0;
          setPortfolioData([{
            date: new Date().toISOString().split('T')[0],
            value: currentValue,
            change: 0,
          }]);
        } else {
          setPortfolioData([]);
        }
      } catch (fallbackError) {
        console.error('Failed to fetch account data:', fallbackError);
        setPortfolioData([]);
      }
    } finally {
      setLoading(false);
    }
  };

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

  // Touch gesture handlers for mobile
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    if (e.touches.length === 1) {
      // Single touch - potential pan
      setTouchState({
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startDistance: 0,
        isZooming: false,
        isPanning: true,
      });
    } else if (e.touches.length === 2) {
      // Two touches - zoom
      const distance = getTouchDistance(e.touches);
      setTouchState({
        startX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        startY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        startDistance: distance,
        isZooming: true,
        isPanning: false,
      });
    }
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !touchState) return;
    
    e.preventDefault();
    
    if (touchState.isZooming && e.touches.length === 2) {
      const currentDistance = getTouchDistance(e.touches);
      const scaleChange = currentDistance / touchState.startDistance;
      
      if (scaleChange > 1.1 || scaleChange < 0.9) {
        const newScale = Math.max(0.5, Math.min(3, chartZoom.scale * scaleChange));
        setChartZoom(prev => ({ ...prev, scale: newScale }));
        setTouchState(prev => prev ? { ...prev, startDistance: currentDistance } : null);
      }
    } else if (touchState.isPanning && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - touchState.startX;
      const sensitivity = 0.01;
      const dataLength = portfolioData.length;
      const panAmount = Math.floor(deltaX * sensitivity * dataLength);
      
      if (Math.abs(panAmount) > 0) {
        setChartZoom(prev => {
          const newStartIndex = Math.max(0, Math.min(dataLength - 1, prev.startIndex - panAmount));
          const newEndIndex = prev.endIndex === -1 ? dataLength - 1 : 
            Math.max(newStartIndex + 1, Math.min(dataLength - 1, prev.endIndex - panAmount));
          
          return { ...prev, startIndex: newStartIndex, endIndex: newEndIndex };
        });
        setTouchState(prev => prev ? { ...prev, startX: e.touches[0].clientX } : null);
      }
    }
  }, [isMobile, touchState, chartZoom.scale, portfolioData.length]);

  const handleTouchEnd = useCallback(() => {
    setTouchState(null);
  }, []);

  // Chart control functions
  const handleZoomIn = () => {
    setChartZoom(prev => ({ ...prev, scale: Math.min(3, prev.scale * 1.2) }));
  };

  const handleZoomOut = () => {
    setChartZoom(prev => ({ ...prev, scale: Math.max(0.5, prev.scale / 1.2) }));
  };

  const handleResetZoom = () => {
    setChartZoom({ startIndex: 0, endIndex: -1, scale: 1 });
  };

  // Get visible data based on zoom state
  const getVisibleData = () => {
    if (chartZoom.endIndex === -1) {
      return portfolioData.slice(chartZoom.startIndex);
    }
    return portfolioData.slice(chartZoom.startIndex, chartZoom.endIndex + 1);
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

  // Show fallback UI when no portfolio data is available
  if (!loading && portfolioData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'items-center justify-between'}`}>
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                <span className={isMobile ? 'text-lg' : ''}>Portfolio Performance</span>
              </CardTitle>
              <CardDescription className={isMobile ? 'text-sm' : ''}>
                Track your portfolio value over time
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-muted-foreground mb-4">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No portfolio history available yet</p>
            <p className="text-xs mt-1">Start trading to see your performance over time</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'items-center justify-between'}`}>
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              <span className={isMobile ? 'text-lg' : ''}>Portfolio Performance</span>
            </CardTitle>
            <CardDescription className={isMobile ? 'text-sm' : ''}>
              Track your portfolio value over time
            </CardDescription>
          </div>
          
          {/* Timeframe Selector */}
          <div className={`flex ${isMobile ? 'flex-wrap gap-1' : 'space-x-1'}`}>
            {(['1D', '1W', '1M', '3M', '1A'] as const).map((period) => (
              <Button
                key={`portfolio-timeframe-${period}`}
                variant={timeframe === period ? "default" : "outline"}
                size={isMobile ? "sm" : "sm"}
                onClick={() => setTimeframe(period)}
                className={isMobile ? 'min-w-[44px] h-9' : ''}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Current Value and Change */}
        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center space-x-4'} mt-3`}>
          <div className={isMobile ? 'text-center' : ''}>
            <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
              {formatCurrency(currentValue)}
            </div>
            <div className={`flex items-center ${isMobile ? 'justify-center' : ''} space-x-2 mt-1`}>
              {totalChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <Badge variant={totalChange >= 0 ? "default" : "destructive"} className={isMobile ? 'text-xs' : ''}>
                {totalChange >= 0 ? '+' : ''}{formatCurrency(totalChange)} ({totalChangePercent.toFixed(2)}%)
              </Badge>
            </div>
          </div>
          
          {/* Mobile Chart Controls */}
          {isMobile && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                className="h-8 w-8 p-0"
                disabled={chartZoom.scale <= 0.5}
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetZoom}
                className="h-8 w-8 p-0"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                className="h-8 w-8 p-0"
                disabled={chartZoom.scale >= 3}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        <div 
          ref={chartRef}
          className={`relative ${isMobile ? 'touch-pan-y' : ''}`}
          style={{ height: chartHeight }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getVisibleData()}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                interval={isMobile ? 'preserveStartEnd' : 'preserveStart'}
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                width={isMobile ? 40 : 60}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Portfolio Value']}
                labelFormatter={(label) => formatDate(label)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: isMobile ? '12px' : '14px',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={isMobile ? 1.5 : 2}
                dot={false}
                activeDot={{ 
                  r: isMobile ? 3 : 4, 
                  stroke: 'hsl(var(--primary))', 
                  strokeWidth: isMobile ? 1.5 : 2 
                }}
              />
            </LineChart>
          </ResponsiveContainer>
          
          {/* Desktop Chart Controls */}
          {!isMobile && (
            <div className="absolute top-2 right-2 flex space-x-1 opacity-70 hover:opacity-100 transition-opacity">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                className="h-7 w-7 p-0"
                disabled={chartZoom.scale <= 0.5}
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetZoom}
                className="h-7 w-7 p-0"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                className="h-7 w-7 p-0"
                disabled={chartZoom.scale >= 3}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {/* Touch instruction for mobile */}
          {isMobile && portfolioData.length > 0 && (
            <div className="absolute bottom-2 left-2 text-xs text-muted-foreground opacity-60">
              Pinch to zoom • Drag to pan
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}