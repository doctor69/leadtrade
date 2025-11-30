import { useState, useEffect } from 'react';

interface OfflineStatus {
  isOnline: boolean;
  lastOnlineTime: Date | null;
  connectionType: string | null;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  );
  const [connectionType, setConnectionType] = useState<string | null>(null);

  useEffect(() => {
    // Get connection type if available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      setConnectionType(connection.effectiveType || connection.type || 'unknown');
    }

    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineTime(new Date());
      
      // Update connection type when coming online
      if (connection) {
        setConnectionType(connection.effectiveType || connection.type || 'unknown');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleConnectionChange = () => {
      if (connection) {
        setConnectionType(connection.effectiveType || connection.type || 'unknown');
      }
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return {
    isOnline,
    lastOnlineTime,
    connectionType
  };
}