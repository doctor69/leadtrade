// Trade Notifications Component - Real-time notifications for copy trading
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, BellOff, Check, X, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useTradeNotifications } from '@/hooks/useTradeNotifications';
import type { WebSocketNotification } from '@/lib/websocket-service';

interface TradeNotificationsProps {
  enabled?: boolean;
  maxHeight?: string;
}

export default function TradeNotifications({ 
  enabled = true, 
  maxHeight = "400px" 
}: TradeNotificationsProps) {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    clearAll,
    removeNotification,
  } = useTradeNotifications(enabled);

  const [showAll, setShowAll] = useState(false);

  const displayedNotifications = showAll ? notifications : notifications.slice(0, 10);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (notification: WebSocketNotification) => {
    const { type, side, executionStatus } = notification.data;

    if (type === 'leader_trade') {
      return side === 'buy' ? (
        <TrendingUp className="h-4 w-4 text-green-500" />
      ) : (
        <TrendingDown className="h-4 w-4 text-red-500" />
      );
    }

    if (type === 'copied_trade') {
      if (executionStatus === 'failed' || executionStatus === 'rejected') {
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      }
      if (executionStatus === 'filled') {
        return <Check className="h-4 w-4 text-green-500" />;
      }
      return side === 'buy' ? (
        <TrendingUp className="h-4 w-4 text-blue-500" />
      ) : (
        <TrendingDown className="h-4 w-4 text-blue-500" />
      );
    }

    return <Bell className="h-4 w-4 text-muted-foreground" />;
  };

  const getNotificationBadgeVariant = (notification: WebSocketNotification) => {
    const { type, executionStatus } = notification.data;

    if (type === 'leader_trade') return 'default';
    if (type === 'copied_trade') {
      if (executionStatus === 'failed' || executionStatus === 'rejected') return 'destructive';
      if (executionStatus === 'filled') return 'default';
      return 'secondary';
    }
    return 'outline';
  };

  const getNotificationBadgeText = (notification: WebSocketNotification) => {
    const { type, executionStatus } = notification.data;

    if (type === 'leader_trade') return 'Leader Trade';
    if (type === 'copied_trade') {
      if (executionStatus === 'failed') return 'Failed';
      if (executionStatus === 'rejected') return 'Rejected';
      if (executionStatus === 'filled') return 'Executed';
      if (executionStatus === 'pending') return 'Pending';
      return 'Copy Trade';
    }
    return 'Notification';
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleRemoveNotification = (notificationId: string) => {
    removeNotification(notificationId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="flex items-center space-x-2">
              {isConnected ? (
                <Bell className="h-5 w-5 text-blue-500" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <span>Trade Notifications</span>
            </CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
        
        <CardDescription>
          Real-time notifications for copy trading activities
        </CardDescription>
      </CardHeader>

      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No trade notifications yet</p>
            <p className="text-sm">You'll see real-time updates here when trades are executed</p>
          </div>
        ) : (
          <div className="space-y-4">
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {displayedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                      notification.read 
                        ? 'bg-muted/30 border-muted' 
                        : 'bg-background border-border shadow-sm'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge 
                            variant={getNotificationBadgeVariant(notification)}
                            className="text-xs"
                          >
                            {getNotificationBadgeText(notification)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveNotification(notification.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {notification.data.message}
                      </p>
                      
                      {notification.data.leaderName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          From: {notification.data.leaderName}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span>{notification.data.symbol}</span>
                        <span className={`font-medium ${
                          notification.data.side === 'buy' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {notification.data.side.toUpperCase()}
                        </span>
                        <span>{notification.data.quantity} shares</span>
                        {notification.data.price && (
                          <span>${notification.data.price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {notifications.length > 10 && !showAll && (
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAll(true)}
                >
                  Show {notifications.length - 10} more notifications
                </Button>
              </div>
            )}
            
            {showAll && notifications.length > 10 && (
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAll(false)}
                >
                  Show less
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}