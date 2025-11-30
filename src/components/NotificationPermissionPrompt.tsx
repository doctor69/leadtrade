import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface NotificationPermissionPromptProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function NotificationPermissionPrompt({
  onPermissionGranted,
  onPermissionDenied,
  onDismiss,
  className = ''
}: NotificationPermissionPromptProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isVisible, setIsVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      return;
    }

    const currentPermission = Notification.permission;
    setPermission(currentPermission);

    // Show prompt if permission is default and user hasn't dismissed it recently
    const dismissedAt = localStorage.getItem('notification-prompt-dismissed');
    const shouldShow = currentPermission === 'default' && 
                      (!dismissedAt || Date.now() - parseInt(dismissedAt) > 7 * 24 * 60 * 60 * 1000); // 7 days

    setIsVisible(shouldShow);
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    setIsRequesting(true);

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        onPermissionGranted?.();
        setIsVisible(false);
        
        // Show a test notification
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          new Notification('LeadTrade Notifications Enabled', {
            body: 'You\'ll now receive important trading updates and alerts.',
            icon: '/icons/icon-192x192.svg',
            badge: '/icons/icon-72x72.svg',
            tag: 'permission-granted'
          });
        }
      } else {
        onPermissionDenied?.();
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      onPermissionDenied?.();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('notification-prompt-dismissed', Date.now().toString());
    onDismiss?.();
  };

  if (!isVisible || permission !== 'default') {
    return null;
  }

  return (
    <Card className={`fixed bottom-4 right-4 w-80 shadow-lg border-2 z-50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Stay Updated</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Get notified about important trading updates, market alerts, and portfolio changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button
            onClick={requestPermission}
            disabled={isRequesting}
            className="flex-1"
            size="sm"
          >
            <Bell className="h-4 w-4 mr-2" />
            {isRequesting ? 'Requesting...' : 'Enable Notifications'}
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            size="sm"
            className="px-3"
          >
            <BellOff className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for managing notification permissions
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  };

  const canShowNotifications = permission === 'granted' && isSupported;

  return {
    permission,
    isSupported,
    canShowNotifications,
    requestPermission
  };
}