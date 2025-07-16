import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import PortfolioChart from './PortfolioChart';

interface Position {
    symbol: string;
    qty: number;
    market_value: number;
    unrealized_pl: number;
    unrealized_plpc: number;
}

interface AccountData {
    buying_power: number;
    portfolio_value: number;
    equity: number;
    cash: number;
}

export default function TradingDashboard() {
    const [accountData, setAccountData] = useState<AccountData | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);

    // Mock data for now - you can replace with actual API calls
    useEffect(() => {
        // Simulate API call
        setTimeout(() => {
            setAccountData({
                buying_power: 25000,
                portfolio_value: 32500,
                equity: 32500,
                cash: 7500
            });

            setPositions([
                {
                    symbol: 'AAPL',
                    qty: 10,
                    market_value: 1850,
                    unrealized_pl: 150,
                    unrealized_plpc: 0.088
                },
                {
                    symbol: 'TSLA',
                    qty: 5,
                    market_value: 1200,
                    unrealized_pl: -50,
                    unrealized_plpc: -0.04
                }
            ]);

            setLoading(false);
        }, 1000);
    }, []);

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