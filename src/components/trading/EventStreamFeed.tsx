/**
 * Event Stream Feed Component
 * 
 * Real-time SSE event feed for trades, transfers, journals, and account status
 * with automatic reconnection and event filtering.
 * 
 * Requirements: 21.2
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

interface EventStreamFeedProps {
  accountId?: string;
  enabled?: boolean;
}

export default function EventStreamFeed({ accountId, enabled = false }: EventStreamFeedProps) {
  const [activeTab, setActiveTab] = useState<EventFeedType>('all');

  // Subscribe to trade events - disabled by default until user enables
  const tradeStream = useTradeEvents({
    accountId,
    enabled: enabled && (activeTab === 'all' || activeTab === 'trades'),
    autoReconnect: true,
    maxReconnectAttempts: 10,
  });

  // Subscribe to transfer events - disabled by default until user enables
  const transferStream = useTransferEvents({
    accountId,
    enabled: enabled && (activeTab === 'all' || activeTab === 'transfers'),
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

    return combined.slice(0, 50);
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
            {!enabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Real-time event streaming is available but disabled by default. 
                  The Supabase edge function must be deployed first. 
                  Run: <code className="text-xs bg-muted px-1 py-0.5 rounded">supabase functions deploy alpaca-events</code>
                </AlertDescription>
              </Alert>
            )}

            {(tradeStream.error || transferStream.error) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {tradeStream.error || transferStream.error}
                  {' - '}Make sure the edge function is deployed.
                </AlertDescription>
              </Alert>
            )}

            {!accountId && enabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please provide an account ID to view events.
                </AlertDescription>
              </Alert>
            )}

            {accountId && enabled && getCombinedEvents().length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {tradeStream.isConnecting || transferStream.isConnecting
                  ? 'Connecting to event stream...'
                  : 'No events yet. Events will appear here in real-time.'}
              </div>
            )}

            {accountId && enabled && getCombinedEvents().length > 0 && (
              <div className="space-y-2">
                {getCombinedEvents().map((item, index) => (
                  item.type === 'trade'
                    ? renderTradeEvent(item.event as TradeEvent, index)
                    : renderTransferEvent(item.event as TransferEvent, index)
                ))}
              </div>
            )}

            {!enabled && (
              <div className="text-center py-8 text-muted-foreground">
                Event streaming is disabled. Enable it via component props after deploying the edge function.
              </div>
            )}
          </TabsContent>

          <TabsContent value="trades" className="space-y-4">
            {!enabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Trade event streaming is disabled. Deploy the edge function first.
                </AlertDescription>
              </Alert>
            )}

            {tradeStream.error && enabled && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {tradeStream.error}
                  {' - '}Make sure the edge function is deployed.
                </AlertDescription>
              </Alert>
            )}

            {!accountId && enabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please provide an account ID to view trade events.
                </AlertDescription>
              </Alert>
            )}

            {accountId && enabled && tradeStream.events.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {tradeStream.isConnecting
                  ? 'Connecting to trade events...'
                  : 'No trade events yet. Events will appear here in real-time.'}
              </div>
            )}

            {accountId && enabled && tradeStream.events.length > 0 && (
              <div className="space-y-2">
                {tradeStream.events.slice(0, 50).map((event, index) => 
                  renderTradeEvent(event as TradeEvent, index)
                )}
              </div>
            )}

            {!enabled && (
              <div className="text-center py-8 text-muted-foreground">
                Trade event streaming is disabled.
              </div>
            )}
          </TabsContent>

          <TabsContent value="transfers" className="space-y-4">
            {!enabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Transfer event streaming is disabled. Deploy the edge function first.
                </AlertDescription>
              </Alert>
            )}

            {transferStream.error && enabled && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {transferStream.error}
                  {' - '}Make sure the edge function is deployed.
                </AlertDescription>
              </Alert>
            )}

            {!accountId && enabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please provide an account ID to view transfer events.
                </AlertDescription>
              </Alert>
            )}

            {accountId && enabled && transferStream.events.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {transferStream.isConnecting
                  ? 'Connecting to transfer events...'
                  : 'No transfer events yet. Events will appear here in real-time.'}
              </div>
            )}

            {accountId && enabled && transferStream.events.length > 0 && (
              <div className="space-y-2">
                {transferStream.events.slice(0, 50).map((event, index) => 
                  renderTransferEvent(event as TransferEvent, index)
                )}
              </div>
            )}

            {!enabled && (
              <div className="text-center py-8 text-muted-foreground">
                Transfer event streaming is disabled.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
