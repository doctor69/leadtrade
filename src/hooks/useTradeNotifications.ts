// React hook for trade notifications via WebSocket
import { useState, useEffect, useCallback } from 'react';
import { webSocketService, WebSocketService, type WebSocketNotification } from '../lib/websocket-service';

export interface UseTradeNotificationsReturn {
  notifications: WebSocketNotification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  clearAll: () => void;
  removeNotification: (notificationId: string) => void;
}

export const useTradeNotifications = (enabled: boolean = true): UseTradeNotificationsReturn => {
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Handle new notifications
  const handleNewNotification = useCallback((notification: WebSocketNotification) => {
    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.some(n => n.id === notification.id);
      if (exists) return prev;

      // Add new notification to the beginning
      const updated = [notification, ...prev.slice(0, 49)]; // Keep last 50
      return updated;
    });

    // Update unread count
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const success = await WebSocketService.markNotificationAsRead(notificationId);
      
      if (success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true }
              : notification
          )
        );

        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Remove specific notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      const filtered = prev.filter(n => n.id !== notificationId);
      
      // Update unread count if removing an unread notification
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      
      return filtered;
    });
  }, []);

  // Initialize WebSocket service and load recent notifications
  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const initializeService = async () => {
      try {
        // Initialize WebSocket service
        const connected = await webSocketService.initialize();
        
        if (mounted) {
          setIsConnected(connected);
        }

        if (connected) {
          // Add listener for new notifications
          const listenerId = `trade-notifications-${Date.now()}`;
          webSocketService.addListener(listenerId, handleNewNotification);

          // Load recent notifications
          const user = await import('../lib/auth').then(auth => auth.getAuthenticatedUser());
          if (user && mounted) {
            const recentNotifications = await WebSocketService.getRecentNotifications(user.id);
            const unreadCount = await WebSocketService.getUnreadNotificationCount(user.id);
            
            if (mounted) {
              setNotifications(recentNotifications);
              setUnreadCount(unreadCount);
            }
          }

          // Cleanup function
          return () => {
            webSocketService.removeListener(listenerId);
          };
        }
      } catch (error) {
        console.error('Error initializing trade notifications:', error);
        if (mounted) {
          setIsConnected(false);
        }
      }
    };

    let cleanup: (() => void) | undefined;
    
    initializeService().then(cleanupFn => {
      cleanup = cleanupFn;
    });

    return () => {
      mounted = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, [enabled, handleNewNotification]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!enabled) {
        webSocketService.disconnect();
      }
    };
  }, [enabled]);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    clearAll,
    removeNotification,
  };
};