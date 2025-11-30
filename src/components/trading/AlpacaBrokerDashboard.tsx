import React, { useState } from 'react'
import { useAlpacaBroker, useMarketStatus } from '@/hooks/useAlpacaBroker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, TrendingUp, Clock, DollarSign, Activity } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface OrderFormData {
    symbol: string
    qty: number
    side: 'buy' | 'sell'
    type: 'market' | 'limit' | 'stop' | 'stop_limit'
    limit_price?: number
    stop_price?: number
    time_in_force: 'day' | 'gtc'
}

export function AlpacaBrokerDashboard() {
    const {
        account,
        positions,
        orders,
        watchlists,
        isLoading,
        error,
        placeOrder,
        cancelOrder,
        closePosition,
        createWatchlist,
        clearError
    } = useAlpacaBroker()

    const { isOpen: marketIsOpen, clock } = useMarketStatus()

    const [orderForm, setOrderForm] = useState<OrderFormData>({
        symbol: '',
        qty: 1,
        side: 'buy',
        type: 'market',
        time_in_force: 'day'
    })

    const [newWatchlistName, setNewWatchlistName] = useState('')

    // Format currency
    const formatCurrency = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value) : value
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(num)
    }

    // Format percentage
    const formatPercent = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value) : value
        return `${(num * 100).toFixed(2)}%`
    }

    // Handle order submission
    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!orderForm.symbol || orderForm.qty <= 0) {
            return
        }

        const orderData: any = {
            symbol: orderForm.symbol.toUpperCase(),
            qty: orderForm.qty,
            side: orderForm.side,
            type: orderForm.type,
            time_in_force: orderForm.time_in_force
        }

        if (orderForm.type === 'limit' && orderForm.limit_price) {
            orderData.limit_price = orderForm.limit_price
        }

        if ((orderForm.type === 'stop' || orderForm.type === 'stop_limit') && orderForm.stop_price) {
            orderData.stop_price = orderForm.stop_price
        }

        const result = await placeOrder(orderData)
        if (result) {
            // Reset form
            setOrderForm({
                symbol: '',
                qty: 1,
                side: 'buy',
                type: 'market',
                time_in_force: 'day'
            })
        }
    }

    // Handle watchlist creation
    const handleCreateWatchlist = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newWatchlistName.trim()) return

        const result = await createWatchlist(newWatchlistName.trim())
        if (result) {
            setNewWatchlistName('')
        }
    }

    return (
        <div className="space-y-6">
            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                        {error}
                        <Button variant="outline" size="sm" onClick={clearError}>
                            Dismiss
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Market Status */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Market Status</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Badge variant={marketIsOpen ? "default" : "secondary"}>
                            {marketIsOpen ? "Open" : "Closed"}
                        </Badge>
                        {clock && (
                            <span className="text-sm text-muted-foreground">
                                {marketIsOpen ? `Closes at ${clock.next_close}` : `Opens at ${clock.next_open}`}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Account Overview */}
            {account && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(account.portfolio_value)}</div>
                            <p className="text-xs text-muted-foreground">
                                Cash: {formatCurrency(account.cash)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Buying Power</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(account.buying_power)}</div>
                            <p className="text-xs text-muted-foreground">
                                Day Trading: {formatCurrency(account.daytrading_buying_power)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Equity</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(account.equity)}</div>
                            <p className="text-xs text-muted-foreground">
                                Last Equity: {formatCurrency(account.last_equity)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Day Trades</CardTitle>
                            <Badge variant={account.pattern_day_trader ? "destructive" : "default"}>
                                {account.pattern_day_trader ? "PDT" : "Normal"}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{account.daytrade_count}</div>
                            <p className="text-xs text-muted-foreground">
                                Multiplier: {account.multiplier}x
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="positions" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="positions">Positions</TabsTrigger>
                    <TabsTrigger value="orders">Orders</TabsTrigger>
                    <TabsTrigger value="trade">Trade</TabsTrigger>
                    <TabsTrigger value="watchlists">Watchlists</TabsTrigger>
                </TabsList>

                {/* Positions Tab */}
                <TabsContent value="positions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Positions</CardTitle>
                            <CardDescription>
                                Your active positions and their performance
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {positions.length === 0 ? (
                                <p className="text-center text-muted-foreground py-4">
                                    No positions found
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {positions.map((position) => (
                                        <div key={position.symbol} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="space-y-1">
                                                <div className="font-medium">{position.symbol}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {position.qty} shares @ {formatCurrency(position.avg_entry_price)}
                                                </div>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <div className="font-medium">{formatCurrency(position.market_value)}</div>
                                                <div className={`text-sm ${parseFloat(position.unrealized_pl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(position.unrealized_pl)} ({formatPercent(position.unrealized_plpc)})
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => closePosition(position.symbol)}
                                                disabled={isLoading}
                                            >
                                                Close
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Orders</CardTitle>
                            <CardDescription>
                                Your order history and current pending orders
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {orders.length === 0 ? (
                                <p className="text-center text-muted-foreground py-4">
                                    No orders found
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {orders.slice(0, 10).map((order) => (
                                        <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="space-y-1">
                                                <div className="font-medium">{order.symbol}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {order.side.toUpperCase()} {order.qty} @ {order.type.toUpperCase()}
                                                    {order.limit_price && ` $${order.limit_price}`}
                                                </div>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <Badge variant={
                                                    order.status === 'filled' ? 'default' :
                                                        order.status === 'canceled' ? 'secondary' :
                                                            order.status === 'rejected' ? 'destructive' : 'outline'
                                                }>
                                                    {order.status}
                                                </Badge>
                                                <div className="text-sm text-muted-foreground">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                            {(order.status === 'new' || order.status === 'partially_filled') && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => cancelOrder(order.id)}
                                                    disabled={isLoading}
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Trade Tab */}
                <TabsContent value="trade" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Place Order</CardTitle>
                            <CardDescription>
                                Create a new trading order
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePlaceOrder} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="symbol">Symbol</Label>
                                        <Input
                                            id="symbol"
                                            placeholder="AAPL"
                                            value={orderForm.symbol}
                                            onChange={(e) => setOrderForm(prev => ({ ...prev, symbol: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="qty">Quantity</Label>
                                        <Input
                                            id="qty"
                                            type="number"
                                            min="1"
                                            value={orderForm.qty}
                                            onChange={(e) => setOrderForm(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="side">Side</Label>
                                        <Select value={orderForm.side} onValueChange={(value: 'buy' | 'sell') =>
                                            setOrderForm(prev => ({ ...prev, side: value }))
                                        }>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="buy">Buy</SelectItem>
                                                <SelectItem value="sell">Sell</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="type">Order Type</Label>
                                        <Select value={orderForm.type} onValueChange={(value: any) =>
                                            setOrderForm(prev => ({ ...prev, type: value }))
                                        }>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="market">Market</SelectItem>
                                                <SelectItem value="limit">Limit</SelectItem>
                                                <SelectItem value="stop">Stop</SelectItem>
                                                <SelectItem value="stop_limit">Stop Limit</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {(orderForm.type === 'limit' || orderForm.type === 'stop_limit') && (
                                    <div className="space-y-2">
                                        <Label htmlFor="limit_price">Limit Price</Label>
                                        <Input
                                            id="limit_price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            value={orderForm.limit_price || ''}
                                            onChange={(e) => setOrderForm(prev => ({
                                                ...prev,
                                                limit_price: parseFloat(e.target.value) || undefined
                                            }))}
                                        />
                                    </div>
                                )}

                                {(orderForm.type === 'stop' || orderForm.type === 'stop_limit') && (
                                    <div className="space-y-2">
                                        <Label htmlFor="stop_price">Stop Price</Label>
                                        <Input
                                            id="stop_price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            value={orderForm.stop_price || ''}
                                            onChange={(e) => setOrderForm(prev => ({
                                                ...prev,
                                                stop_price: parseFloat(e.target.value) || undefined
                                            }))}
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="time_in_force">Time in Force</Label>
                                    <Select value={orderForm.time_in_force} onValueChange={(value: 'day' | 'gtc') =>
                                        setOrderForm(prev => ({ ...prev, time_in_force: value }))
                                    }>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="day">Day</SelectItem>
                                            <SelectItem value="gtc">Good Till Canceled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button type="submit" disabled={isLoading || !orderForm.symbol}>
                                    {isLoading ? 'Placing Order...' : 'Place Order'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Watchlists Tab */}
                <TabsContent value="watchlists" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Watchlists</CardTitle>
                            <CardDescription>
                                Manage your stock watchlists
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Create Watchlist Form */}
                            <form onSubmit={handleCreateWatchlist} className="flex gap-2">
                                <Input
                                    placeholder="Watchlist name"
                                    value={newWatchlistName}
                                    onChange={(e) => setNewWatchlistName(e.target.value)}
                                />
                                <Button type="submit" disabled={isLoading || !newWatchlistName.trim()}>
                                    Create
                                </Button>
                            </form>

                            {/* Watchlists List */}
                            {watchlists.length === 0 ? (
                                <p className="text-center text-muted-foreground py-4">
                                    No watchlists found
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {watchlists.map((watchlist) => (
                                        <div key={watchlist.id} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-medium">{watchlist.name}</h3>
                                                <Badge variant="outline">
                                                    {watchlist.assets?.length || 0} symbols
                                                </Badge>
                                            </div>
                                            {watchlist.assets && watchlist.assets.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {watchlist.assets.map((asset) => (
                                                        <Badge key={asset.symbol} variant="secondary">
                                                            {asset.symbol}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}