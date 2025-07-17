import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import PortfolioChart from './PortfolioChart';
import { apiService, type AccountData, type Position } from '@/lib/apiService';



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
            {/* Portfolio Chart */}
            <PortfolioChart />

            {/* Account Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${accountData?.portfolio_value.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Buying Power</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${accountData?.buying_power.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cash</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${accountData?.cash.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Equity</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${accountData?.equity.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Positions */}
            <Card>
                <CardHeader>
                    <CardTitle>Current Positions</CardTitle>
                    <CardDescription>Your active trading positions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {positions.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">No positions found</p>
                        ) : (
                            positions.map((position) => (
                                <div key={position.symbol} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center space-x-4">
                                        <div>
                                            <h3 className="font-semibold">{position.symbol}</h3>
                                            <p className="text-sm text-muted-foreground">{position.qty} shares</p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="font-semibold">${position.market_value.toLocaleString()}</div>
                                        <div className="flex items-center space-x-2">
                                            {position.unrealized_pl >= 0 ? (
                                                <TrendingUp className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4 text-red-500" />
                                            )}
                                            <Badge variant={position.unrealized_pl >= 0 ? "default" : "destructive"}>
                                                ${position.unrealized_pl.toFixed(2)} ({(position.unrealized_plpc * 100).toFixed(2)}%)
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}