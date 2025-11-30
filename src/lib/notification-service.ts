// Notification Service for LeadTrade PWA
export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  timestamp?: number;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationPreferences {
  tradeAlerts: boolean;
  portfolioUpdates: boolean;
  marketNews: boolean;
  copyTradingUpdates: boolean;
  systemNotifications: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

export class NotificationService {
  private static instance: NotificationService;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private preferences: NotificationPreferences;

  private constructor() {
    this.preferences = this.loadPreferences();
    this.initializeServiceWorker();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
        console.log('Notification service initialized with service worker');
      } catch (error) {
        console.error('Failed to initialize service worker for notifications:', error);
      }
    }
  }

  private loadPreferences(): NotificationPreferences {
    const stored = localStorage.getItem('notification-preferences');
    if (stored) {
      try {
        const preferences = JSON.parse(stored);
        // Also sync to IndexedDB for service worker access
        this.syncPreferencesToIndexedDB(preferences);
        return preferences;
      } catch (error) {
        console.error('Failed to parse notification preferences:', error);
      }
    }

    // Default preferences
    const defaultPreferences = {
      tradeAlerts: true,
      portfolioUpdates: true,
      marketNews: false,
      copyTradingUpdates: true,
      systemNotifications: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };

    // Save default preferences to IndexedDB
    this.syncPreferencesToIndexedDB(defaultPreferences);
    return defaultPreferences;
  }

  private async syncPreferencesToIndexedDB(preferences: NotificationPreferences) {
    try {
      const { offlineStorage } = await import('./offline-storage');
      await offlineStorage.savePreference('notifications', preferences, 'notification');
    } catch (error) {
      console.error('Failed to sync preferences to IndexedDB:', error);
    }
  }

  public async savePreferences(preferences: NotificationPreferences) {
    this.preferences = preferences;
    
    // Save to localStorage for immediate access
    localStorage.setItem('notification-preferences', JSON.stringify(preferences));
    
    // Save to IndexedDB for service worker access
    try {
      const { offlineStorage } = await import('./offline-storage');
      await offlineStorage.savePreference('notifications', preferences, 'notification');
    } catch (error) {
      console.error('Failed to save notification preferences to IndexedDB:', error);
    }
  }

  public getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // Subscribe to push notifications if service worker is available
        await this.subscribeToPush();
      }
      
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  private async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.serviceWorkerRegistration) {
      console.warn('Service worker not available for push subscription');
      return null;
    }

    try {
      // Check if already subscribed
      let subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const vapidPublicKey = this.getVapidPublicKey();
        subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
        });

        // Send subscription to server
        await this.sendSubscriptionToServer(subscription);
      }

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  private getVapidPublicKey(): string {
    // In a real implementation, this would come from your environment variables
    // For now, using a placeholder - you'll need to generate VAPID keys
    return 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NqIUHI80NqIUHI80NqIUHI80NqIUHI80NqIUHI80NqIUHI80NqIUHI80NqI';
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      // Get auth token if available
      const authToken = localStorage.getItem('supabase.auth.token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Send subscription to your backend
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          preferences: this.preferences
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send subscription to server');
      }

      const result = await response.json();
      console.log('Push subscription sent to server successfully:', result.subscriptionId);
      
      // Store subscription ID locally for future reference
      localStorage.setItem('push-subscription-id', result.subscriptionId);
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      throw error;
    }
  }

  public async showNotification(data: NotificationData): Promise<void> {
    if (!this.canShowNotification(data)) {
      return;
    }

    // Check if we're in quiet hours
    if (this.isInQuietHours()) {
      console.log('Notification suppressed due to quiet hours');
      return;
    }

    const options: NotificationOptions = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.svg',
      badge: data.badge || '/icons/icon-72x72.svg',
      tag: data.tag,
      data: {
        ...data.data,
        timestamp: data.timestamp || Date.now(),
        url: data.data?.url || '/dashboard'
      },
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      vibrate: data.vibrate || [100, 50, 100]
    };

    // Add actions for service worker notifications (not supported in regular Notification API)
    if (this.serviceWorkerRegistration && (data.actions || this.getDefaultActions())) {
      (options as any).actions = data.actions || this.getDefaultActions();
    }

    try {
      if (this.serviceWorkerRegistration) {
        // Use service worker to show notification
        await this.serviceWorkerRegistration.showNotification(data.title, options);
      } else {
        // Fallback to regular notification
        new Notification(data.title, options);
      }

      // Track notification for analytics
      this.trackNotification(data);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  private canShowNotification(data: NotificationData): boolean {
    if (Notification.permission !== 'granted') {
      return false;
    }

    // Check notification type preferences
    const tag = data.tag || '';
    if (tag.includes('trade') && !this.preferences.tradeAlerts) return false;
    if (tag.includes('portfolio') && !this.preferences.portfolioUpdates) return false;
    if (tag.includes('market') && !this.preferences.marketNews) return false;
    if (tag.includes('copy-trading') && !this.preferences.copyTradingUpdates) return false;
    if (tag.includes('system') && !this.preferences.systemNotifications) return false;

    return true;
  }

  private isInQuietHours(): boolean {
    if (!this.preferences.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = this.preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.preferences.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      // Same day quiet hours (e.g., 14:00 to 18:00)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private getDefaultActions(): NotificationAction[] {
    return [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/dashboard-96x96.svg'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/icon-72x72.svg'
      }
    ];
  }

  private trackNotification(data: NotificationData): void {
    // Track notification for analytics
    const event = {
      type: 'notification_shown',
      tag: data.tag,
      timestamp: Date.now(),
      title: data.title
    };

    // Store in local analytics or send to analytics service
    const analytics = JSON.parse(localStorage.getItem('notification-analytics') || '[]');
    analytics.push(event);
    
    // Keep only last 100 events
    if (analytics.length > 100) {
      analytics.splice(0, analytics.length - 100);
    }
    
    localStorage.setItem('notification-analytics', JSON.stringify(analytics));
  }

  // Predefined notification types for common use cases
  public async showTradeAlert(symbol: string, action: string, price: number): Promise<void> {
    await this.showNotification({
      title: 'Trade Alert',
      body: `${action.toUpperCase()} ${symbol} at $${price.toFixed(2)}`,
      tag: 'trade-alert',
      icon: '/icons/trade-96x96.svg',
      data: { 
        type: 'trade',
        symbol,
        action,
        price,
        url: '/trade'
      },
      actions: [
        { action: 'view-trade', title: 'View Trade', icon: '/icons/trade-96x96.svg' },
        { action: 'view-portfolio', title: 'Portfolio', icon: '/icons/dashboard-96x96.svg' }
      ]
    });
  }

  public async showPortfolioUpdate(change: number, changePercent: number): Promise<void> {
    const isPositive = change >= 0;
    await this.showNotification({
      title: 'Portfolio Update',
      body: `Your portfolio is ${isPositive ? 'up' : 'down'} ${Math.abs(changePercent).toFixed(2)}% (${isPositive ? '+' : ''}$${change.toFixed(2)})`,
      tag: 'portfolio-update',
      icon: '/icons/dashboard-96x96.svg',
      data: { 
        type: 'portfolio',
        change,
        changePercent,
        url: '/dashboard'
      }
    });
  }

  public async showCopyTradingUpdate(traderName: string, action: string, symbol: string): Promise<void> {
    await this.showNotification({
      title: 'Copy Trading Update',
      body: `${traderName} ${action} ${symbol}. Your copy trade is being executed.`,
      tag: 'copy-trading-update',
      icon: '/icons/leaderboard-96x96.svg',
      data: { 
        type: 'copy-trading',
        traderName,
        action,
        symbol,
        url: '/leaderboard'
      },
      actions: [
        { action: 'view-leader', title: 'View Leader', icon: '/icons/leaderboard-96x96.svg' },
        { action: 'manage-copy', title: 'Manage Copy', icon: '/icons/trade-96x96.svg' }
      ]
    });
  }

  public async showMarketAlert(title: string, message: string): Promise<void> {
    await this.showNotification({
      title: `Market Alert: ${title}`,
      body: message,
      tag: 'market-alert',
      icon: '/icons/icon-192x192.svg',
      data: { 
        type: 'market',
        url: '/dashboard'
      }
    });
  }

  // Utility methods
  public async clearAllNotifications(): Promise<void> {
    if (this.serviceWorkerRegistration) {
      const notifications = await this.serviceWorkerRegistration.getNotifications();
      notifications.forEach(notification => notification.close());
    }
  }

  public async clearNotificationsByTag(tag: string): Promise<void> {
    if (this.serviceWorkerRegistration) {
      const notifications = await this.serviceWorkerRegistration.getNotifications({ tag });
      notifications.forEach(notification => notification.close());
    }
  }

  public isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  public getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  public async unsubscribeFromPush(): Promise<boolean> {
    if (!this.serviceWorkerRegistration) {
      console.warn('Service worker not available for push unsubscription');
      return false;
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from browser
        const unsubscribed = await subscription.unsubscribe();
        
        if (unsubscribed) {
          // Notify server about unsubscription
          await this.removeSubscriptionFromServer(subscription);
          console.log('Successfully unsubscribed from push notifications');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      const authToken = localStorage.getItem('supabase.auth.token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to remove subscription from server');
      }

      console.log('Push subscription removed from server successfully');
      localStorage.removeItem('push-subscription-id');
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
      throw error;
    }
  }

  public async getPushSubscription(): Promise<PushSubscription | null> {
    if (!this.serviceWorkerRegistration) {
      return null;
    }

    try {
      return await this.serviceWorkerRegistration.pushManager.getSubscription();
    } catch (error) {
      console.error('Failed to get push subscription:', error);
      return null;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();