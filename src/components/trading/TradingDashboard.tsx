import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Activity, BarChart3, Wallet, PieChart, Bell, Radio, Zap } from 'lucide-react';
import PortfolioChart from './PortfolioChart';
import PortfolioSummary from '@/components/dashboard/PortfolioSummary';
import AssetGrid from '@/components/dashboard/AssetGrid';
import AssetChart from '@/components/dashboard/AssetChart';
import CorporateActionNotifications from './CorporateActionNotifications';
import EventStreamFeed from './EventStreamFeed';
import OptionsExercise from './OptionsExercise';
import { apiService, type AccountData, type Position } from '@/lib/apiService';



// Helper function to safely format financial values
const formatCurrency = (value: string | number | undefined | null): string => {
    if (!value) return '0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(numValue) ? '0.00' : numValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function TradingDashboard() {
    const [accountData, setAccountData] = useState<AccountData | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch real data from Alpaca API
    useEffect(() => {
        fetchAccountData();
        fetchPositions();
    }, []);

    const fetchAccountData = async () => {
        try {
            const result = await apiService.getAccount();
            if (result.success && result.data) {
                setAccountData(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch account data:', error);
        }
    };

    const fetchPositions = async () => {
        try {
            const result = await apiService.getPositions();
            if (result.success && result.data) {
                setPositions(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch positions:', error);
        } finally {
            setLoading(false);
        }
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
            {/* Portfolio Summary Cards */}
            <PortfolioSummary />

            {/* Main Dashboard Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 h-auto">
                    <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 min-h-[44px] text-xs sm:text-sm">
                        <PieChart className="h-4 w-4" />
                        <span className="hidden xs:inline">Overview</span>
                        <span className="xs:hidden">Home</span>
                    </TabsTrigger>
                    <TabsTrigger value="assets" className="flex items-center gap-1 sm:gap-2 min-h-[44px] text-xs sm:text-sm">
                        <Wallet className="h-4 w-4" />
                        <span>Assets</span>
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="flex items-center gap-1 sm:gap-2 min-h-[44px] text-xs sm:text-sm">
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden xs:inline">Performance</span>
                        <span className="xs:hidden">Perf</span>
                    </TabsTrigger>
                    <TabsTrigger value="watchlist" className="flex items-center gap-1 sm:gap-2 min-h-[44px] text-xs sm:text-sm">
                        <TrendingUp className="h-4 w-4" />
                        <span className="hidden xs:inline">Watchlist</span>
                        <span className="xs:hidden">Watch</span>
                    </TabsTrigger>
                    <TabsTrigger value="events" className="flex items-center gap-1 sm:gap-2 min-h-[44px] text-xs sm:text-sm">
                        <Radio className="h-4 w-4" />
                        <span className="hidden xs:inline">Events</span>
                        <span className="xs:hidden">Live</span>
                    </TabsTrigger>
                    <TabsTrigger value="corporate" className="flex items-center gap-1 sm:gap-2 min-h-[44px] text-xs sm:text-sm">
                        <Bell className="h-4 w-4" />
                        <span className="hidden xs:inline">Corporate</span>
                        <span className="xs:hidden">Corp</span>
                    </TabsTrigger>
                    <TabsTrigger value="options" className="flex items-center gap-1 sm:gap-2 min-h-[44px] text-xs sm:text-sm">
                        <Zap className="h-4 w-4" />
                        <span className="hidden xs:inline">Options</span>
                        <span className="xs:hidden">Opts</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                        <div className="lg:col-span-2 order-2 lg:order-1">
                            <PortfolioChart />
                        </div>
                        <div className="space-y-4 order-1 lg:order-2">
                            {/* Account Summary */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base sm:text-lg">Account Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 sm:space-y-4">
                                    {accountData && (
                                        <>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs sm:text-sm text-muted-foreground">Status:</span>
                                                <Badge variant={(accountData.status || 'UNKNOWN') === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                                                    {accountData.status || 'Loading...'}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs sm:text-sm text-muted-foreground">Equity:</span>
                                                <span className="text-xs sm:text-sm font-medium">
                                                    ${formatCurrency(accountData.equity)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs sm:text-sm text-muted-foreground">Multiplier:</span>
                                                <span className="text-xs sm:text-sm font-medium">{accountData.multiplier || '1'}x</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs sm:text-sm text-muted-foreground">Day Trades:</span>
                                                <Badge variant={(accountData.daytrade_count || 0) >= 4 ? 'destructive' : 'default'} className="text-xs">
                                                    {accountData.daytrade_count || 0}/4
                                                </Badge>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="assets">
                    <AssetGrid />
                </TabsContent>

                <TabsContent value="performance" className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <PortfolioChart />
                        <AssetChart symbol="AAPL" name="Apple Inc." />
                    </div>
                </TabsContent>

                <TabsContent value="watchlist" className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <AssetChart symbol="TSLA" name="Tesla Inc." />
                        <AssetChart symbol="MSFT" name="Microsoft Corp." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <AssetChart symbol="GOOGL" name="Alphabet Inc." />
                        <AssetChart symbol="AMZN" name="Amazon.com Inc." />
                    </div>
                </TabsContent>

                <TabsContent value="events" className="space-y-4 sm:space-y-6">
                    <EventStreamFeed />
                </TabsContent>

                <TabsContent value="corporate" className="space-y-4 sm:space-y-6">
                    <CorporateActionNotifications />
                </TabsContent>

                <TabsContent value="options" className="space-y-4 sm:space-y-6">
                    <OptionsExercise />
                </TabsContent>
            </Tabs>
        </div>
    );
}