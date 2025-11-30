import { useState, useEffect } from 'react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Wifi, Clock, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineStatusIndicatorProps {
  className?: string;
  showConnectionType?: boolean;
  compact?: boolean;
}

export function OfflineStatusIndicator({ 
  className, 
  showConnectionType = false,
  compact = false 
}: OfflineStatusIndicatorProps) {
  const { isOnline, lastOnlineTime, connectionType } = useOfflineStatus();
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      // Show offline alert after a brief delay to avoid flashing
      const timer = setTimeout(() => setShowOfflineAlert(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowOfflineAlert(false);
    }
  }, [isOnline]);

  const formatLastOnlineTime = (time: Date | null) => {
    if (!time) return 'Unknown';
    
    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getConnectionIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    
    switch (connectionType) {
      case 'slow-2g':
      case '2g':
        return <Signal className="h-4 w-4 text-red-500" />;
      case '3g':
        return <Signal className="h-4 w-4 text-yellow-500" />;
      case '4g':
      case '5g':
        return <Signal className="h-4 w-4 text-green-500" />;
      default:
        return <Wifi className="h-4 w-4" />;
    }
  };

  const getConnectionLabel = () => {
    if (!isOnline) return 'Offline';
    if (!connectionType) return 'Online';
    return connectionType.toUpperCase();
  };

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Badge 
          variant={isOnline ? "default" : "destructive"}
          className="flex items-center space-x-1"
        >
          {getConnectionIcon()}
          <span className="text-xs">{getConnectionLabel()}</span>
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Connection Status Badge */}
      <div className="flex items-center justify-between">
        <Badge 
          variant={isOnline ? "default" : "destructive"}
          className="flex items-center space-x-2"
        >
          {getConnectionIcon()}
          <span>{getConnectionLabel()}</span>
        </Badge>
        
        {showConnectionType && connectionType && (
          <div className="text-xs text-muted-foreground flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Last online: {formatLastOnlineTime(lastOnlineTime)}</span>
          </div>
        )}
      </div>

      {/* Offline Alert */}
      {showOfflineAlert && (
        <Alert variant="destructive" className="border-destructive/50">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You're currently offline. Some features may be limited. 
            {lastOnlineTime && (
              <span className="block text-xs mt-1">
                Last online: {formatLastOnlineTime(lastOnlineTime)}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Quality Warning */}
      {isOnline && (connectionType === 'slow-2g' || connectionType === '2g') && (
        <Alert className="border-yellow-500/50">
          <Signal className="h-4 w-4 text-yellow-500" />
          <AlertDescription>
            Slow connection detected. Some features may load slowly.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}