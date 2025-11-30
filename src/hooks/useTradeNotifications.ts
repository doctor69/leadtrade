import { useEffect, useCallback, useRef } from 'react';
import { notificationService } from '@/lib/notification-service';

interface TradeNotificationData {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: number;
  orderId?: string;
  traderName?: string; // For copy trading notifications
}

interface PortfolioNotificationData {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  timestamp: number;
}

export function useTradeNotifications() {
  const lastPortfolioValue = useRef<number | null>(null);
  const notificationQueue = useRef<Set<string>>(new Set());

  // Handle service worker messages
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      switch (type) {
        case 'NOTIFICATION_CLICK':
          handleNotificationClick(data);
          break;
        case 'NOTIFICATION_INTERACTION':
          handleNotificationInteraction(data);
          break;
        default:
          break;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleNotificationClick = useCallback((data: any) => {
    console.log('Notification clicked, navigating to:', data.url);
    
    // Handle client-side navigation if needed
    if (data.url && window.location.pathname !== data.url) {
      window.location.href = data.url;
    }

    // Track the click for analytics
    trackNotificationClick(data);
  }, []);

  const handleNotificationInteraction = useCallback((data: any) => {
    console.log('Notification interaction tracked:', data);
    
    // Store interaction data for analytics
    const interactions = JSON.parse(localStorage.getItem('notification-interactions') || '[]');
    interactions.push(data);
    
    // Keep only last 50 interactions
    if (interactions.length > 50) {
      interactions.splice(0, interactions.length - 50);
    }
    
    localStorage.setItem('notification-interactions', JSON.stringify(interactions));
  }, []);

  const trackNotificationClick = useCallback((data: any) => {
    const clickEvent = {
      type: 'notification_click',
      url: data.url,
      action: data.action,
      timestamp: Date.now()
    };

    // Store click data
    const clicks = JSON.parse(localStorage.getItem('notification-clicks') || '[]');
    clicks.push(clickEvent);
    
    if (clicks.length > 50) {
      clicks.splice(0, clicks.length - 50);
    }
    
    localStorage.setItem('notification-clicks', JSON.stringify(clicks));
  }, []);

  const showTradeNotification = useCallback(async (trade: TradeNotificationData) => {
    // Prevent duplicate notifications for the same trade
    const tradeKey = `${trade.symbol}-${trade.action}-${trade.timestamp}`;
    if (notificationQueue.current.has(tradeKey)) {
      return;
    }

    notificationQueue.current.add(tradeKey);

    try {
      if (trade.traderName) {
        // Copy trading notification
        await notificationService.showCopyTradingUpdate(
          trade.traderName,
          `${trade.action.toLowerCase()}s`,
          trade.symbol
        );
      } else {
        // Regular trade notification
        await notificationService.showTradeAlert(
          trade.symbol,
          trade.action.toLowerCase(),
          trade.price
        );
      }
    } catch (error) {
      console.error('Failed to show trade notification:', error);
    } finally {
      // Clean up the queue after a delay
      setTimeout(() => {
        notificationQueue.current.delete(tradeKey);
      }, 5000);
    }
  }, []);

  const showPortfolioNotification = useCallback(async (portfolio: PortfolioNotificationData) => {
    // Only show notification if there's a significant change
    const significantChangeThreshold = 0.05; // 5%
    
    if (lastPortfolioValue.current !== null) {
      const changePercent = Math.abs(portfolio.dayChangePercent);
      
      if (changePercent >= significantChangeThreshold) {
        try {
          await notificationService.showPortfolioUpdate(
            portfolio.dayChange,
            portfolio.dayChangePercent
          );
        } catch (error) {
          console.error('Failed to show portfolio notification:', error);
        }
      }
    }

    lastPortfolioValue.current = portfolio.totalValue;
  }, []);

  const showMarketAlertNotification = useCallback(async (title: string, message: string, symbol?: string) => {
    try {
      await notificationService.showMarketAlert(title, message);
    } catch (error) {
      console.error('Failed to show market alert notification:', error);
    }
  }, []);

  const showOrderFillNotification = useCallback(async (
    symbol: string,
    action: 'BUY' | 'SELL',
    quantity: number,
    fillPrice: number,
    orderId: string
  ) => {
    try {
      await notificationService.showNotification({
        title: 'Order Filled',
        body: `${action} ${quantity} shares of ${symbol} at $${fillPrice.toFixed(2)}`,
        tag: 'order-fill',
        icon: '/icons/trade-96x96.svg',
        data: {
          type: 'order-fill',
          symbol,
          action,
          quantity,
          fillPrice,
          orderId,
          url: '/trade'
        },
        actions: [
          { action: 'view-trade', title: 'View Trade', icon: '/icons/trade-96x96.svg' },
          { action: 'view-portfolio', title: 'Portfolio', icon: '/icons/dashboard-96x96.svg' }
        ]
      });
    } catch (error) {
      console.error('Failed to show order fill notification:', error);
    }
  }, []);

  const showCopyTradeExecutedNotification = useCallback(async (
    traderName: string,
    symbol: string,
    action: 'BUY' | 'SELL',
    yourQuantity: number,
    price: number
  ) => {
    try {
      await notificationService.showNotification({
        title: 'Copy Trade Executed',
        body: `Following ${traderName}: ${action} ${yourQuantity} shares of ${symbol} at $${price.toFixed(2)}`,
        tag: 'copy-trade-executed',
        icon: '/icons/leaderboard-96x96.svg',
        data: {
          type: 'copy-trade',
          traderName,
          symbol,
          action,
          quantity: yourQuantity,
          price,
          url: '/leaderboard'
        },
        actions: [
          { action: 'view-leader', title: 'View Leader', icon: '/icons/leaderboard-96x96.svg' },
          { action: 'view-portfolio', title: 'Portfolio', icon: '/icons/dashboard-96x96.svg' }
        ]
      });
    } catch (error) {
      console.error('Failed to show copy trade notification:', error);
    }
  }, []);

  const showSystemNotification = useCallback(async (title: string, message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    try {
      await notificationService.showNotification({
        title: `System ${type.charAt(0).toUpperCase() + type.slice(1)}: ${title}`,
        body: message,
        tag: `system-${type}`,
        icon: '/icons/icon-192x192.svg',
        data: {
          type: 'system',
          level: type,
          url: '/settings'
        },
        requireInteraction: type === 'error',
        actions: type === 'error' ? [
          { action: 'view', title: 'View Details', icon: '/icons/icon-192x192.svg' },
          { action: 'dismiss', title: 'Dismiss', icon: '/icons/icon-72x72.svg' }
        ] : undefined
      });
    } catch (error) {
      console.error('Failed to show system notification:', error);
    }
  }, []);

  const clearNotifications = useCallback(async (tag?: string) => {
    try {
      if (tag) {
        await notificationService.clearNotificationsByTag(tag);
      } else {
        await notificationService.clearAllNotifications();
      }
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      return await notificationService.requestPermission();
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied' as NotificationPermission;
    }
  }, []);

  const isSupported = useCallback(() => {
    return notificationService.isSupported();
  }, []);

  const getPermissionStatus = useCallback(() => {
    return notificationService.getPermissionStatus();
  }, []);

  return {
    showTradeNotification,
    showPortfolioNotification,
    showMarketAlertNotification,
    showOrderFillNotification,
    showCopyTradeExecutedNotification,
    showSystemNotification,
    clearNotifications,
    requestPermission,
    isSupported,
    getPermissionStatus
  };
}