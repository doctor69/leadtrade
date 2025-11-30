/**
 * Event Stream Feed Component
 * 
 * Real-time SSE event feed for trades, transfers, journals, and account status
 * with automatic reconnection and event filtering.
 * 
 * Requirements: 21.2
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { 
  useTradeEvents, 
  useTransferEvents,
  type UseAlpacaEventsReturn 
} from '@/hooks/useAlpacaEvents';
import type { TradeEvent, TransferEvent } from '@/lib/alpaca-events';

type EventFeedType = 'trades' | 'transfers' | 'all';

export default function EventStreamFeed() {
  const [activeTab, setActiveTab] = useState<EventFeedType>('all');
  const [maxEvents, setMaxEvents] = useState(50);

  // Subscribe to trade events
  const tradeStream = useTradeEvents({
    enabled: activeTab === 'trades' || activeTab === 'all',
    autoReconnect: true,
    maxReconnectAttempts: 10,
  });

  // Subscribe to transfer events
  const transferStream = useTransferEvents({
    enabled: activeTab === 'transfers' || activeTab === 'all',
    autoReconnect: true,
    maxReconnectAttempts: 10,
  });

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTradeEventIcon = (event: string) => {
    switch (event) {
      case 'fill':
      case 'partial_fill':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'canceled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'new':
      case 'pending_new':
      case 'accepted':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getTradeEventColor = (event: string) => {
    switch (event) {
      case 'fill':
        return 'default';
      case 'partial_fill':
        return 'secondary';
      case 'canceled':
        return 'outline';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getTransferStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejected':
      case 'canceled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
      case 'queued':
      case 'sent_to_clearing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const renderTradeEvent = (event: TradeEvent, index: number) => {
    const order = event.order;
    const isBuy = order.side === 'buy';

    return (
      <div key={`trade-${index}`} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="mt-1">
          {getTradeEventIcon(event.event)}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getTradeEventColor(event.event)}>
                {event.event.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="font-semibold">{order.symbol}</span>
              <Badge variant={isBuy ? 'default' : 'destructive'} className="flex items-center gap-1">
                {isBuy ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {order.side.toUpperCase()}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatTime(event.timestamp)}
            </span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {order.filled_qty} / {order.qty} shares
            {event.price && ` @ $${parseFloat(event.price).toFixed(2)}`}
          </div>

          {order.type !== 'market' && (
            <div className="text-xs text-muted-foreground">
              {order.type.toUpperCase()} order
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTransferEvent = (event: TransferEvent, index: number) => {
    const transfer = event.transfer;
    const isIncoming = transfer.direction === 'INCOMING';

    return (
      <div key={`transfer-${index}`} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="mt-1">
          {getTransferStatusIcon(transfer.status)}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={isIncoming ? 'default' : 'secondary'}>
                {transfer.direction}
              </Badge>
              <Badge variant="outline">
                {transfer.type.toUpperCase()}
              </Badge>
              <span className="font-semibold flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {parseFloat(transfer.amount).toFixed(2)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatTime(event.timestamp)}
            </span>
          </div>
          
          <div className="text-sm">
            <Badge variant="outline" className="text-xs">
              {transfer.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  const renderConnectionStatus = (stream: UseAlpacaEventsReturn, label: string) => {
    if (stream.isConnecting) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Connecting {label}...
        </Badge>
      );
    }

    if (stream.isConnected) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Wifi className="h-3 w-3" />
          {label} Connected
        </Badge>
      );
    }

    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <WifiOff className="h-3 w-3" />
        {label} Disconnected
      </Badge>
    );
  };

  const getCombinedEvents = () => {
    const combined: Array<{ type: 'trade' | 'transfer'; event: TradeEvent | TransferEvent; timestamp: string }> = [];

    tradeStream.events.forEach((event) => {
      combined.push({ type: 'trade', event: event as TradeEvent, timestamp: event.timestamp });
    });

    transferStream.events.forEach((event) => {
      combined.push({ type: 'transfer', event: event as TransferEvent, timestamp: event.timestamp });
    });

    // Sort by timestamp descending (newest first)
    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return combined.slice(0, maxEvents);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Event Feed
            </CardTitle>
            <CardDescription>
              Real-time updates for your account activity
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'trades' && renderConnectionStatus(tradeStream, 'Trades')}
            {activeTab === 'transfers' && renderConnectionStatus(transferStream, 'Transfers')}
            {activeTab === 'all' && (
              <>
                {renderConnectionStatus(tradeStream, 'Trades')}
                {renderConnectionStatus(transferStream, 'Transfers')}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EventFeedType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Events</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {(tradeStream.error || transferStream.error) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {tradeStream.error || transferStream.error}
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {getCombinedEvents().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No events yet. Events will appear here in real-time.
                  </div>
                ) : (
                  getCombinedEvents().map((item, index) => 
                    item.type === 'trade' 
                      ? renderTradeEvent(item.event as TradeEvent, index)
                      : renderTransferEvent(item.event as TransferEvent, index)
                  )
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                Showing {getCombinedEvents().length} of {tradeStream.events.length + transferStream.events.length} events
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  tradeStream.clearEvents();
                  transferStream.clearEvents();
                }}
              >
                Clear All
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="trades" className="space-y-4">
            {tradeStream.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{tradeStream.error}</AlertDescription>
              </Alert>
            )}

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {tradeStream.events.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No trade events yet. Trade events will appear here in real-time.
                  </div>
                ) : (
                  tradeStream.events.slice(0, maxEvents).map((event, index) => 
                    renderTradeEvent(event as TradeEvent, index)
                  )
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                {tradeStream.events.length} trade events
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={tradeStream.clearEvents}
              >
                Clear
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="transfers" className="space-y-4">
            {transferStream.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{transferStream.error}</AlertDescription>
              </Alert>
            )}

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {transferStream.events.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No transfer events yet. Transfer events will appear here in real-time.
                  </div>
                ) : (
                  transferStream.events.slice(0, maxEvents).map((event, index) => 
                    renderTransferEvent(event as TransferEvent, index)
                  )
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                {transferStream.events.length} transfer events
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={transferStream.clearEvents}
              >
                Clear
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
