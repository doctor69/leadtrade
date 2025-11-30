import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { notificationService, NotificationPreferences } from '@/lib/notification-service';
import { useNotificationPermission } from '@/components/NotificationPermissionPrompt';

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className = '' }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { permission, canShowNotifications, requestPermission } = useNotificationPermission();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = () => {
    try {
      const prefs = notificationService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    setIsSaving(true);
    try {
      notificationService.savePreferences(newPreferences);
      setPreferences(newPreferences);
      
      // Show confirmation notification if permissions are granted
      if (canShowNotifications) {
        await notificationService.showNotification({
          title: 'Notification Settings Updated',
          body: 'Your notification preferences have been saved.',
          tag: 'settings-updated',
          silent: true
        });
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;
    
    const updated = { ...preferences, [key]: value };
    savePreferences(updated);
  };

  const handleQuietHoursToggle = (enabled: boolean) => {
    if (!preferences) return;
    
    const updated = {
      ...preferences,
      quietHours: { ...preferences.quietHours, enabled }
    };
    savePreferences(updated);
  };

  const handleQuietHoursTimeChange = (field: 'start' | 'end', value: string) => {
    if (!preferences) return;
    
    const updated = {
      ...preferences,
      quietHours: { ...preferences.quietHours, [field]: value }
    };
    savePreferences(updated);
  };

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      // Reload preferences to reflect any changes
      loadPreferences();
    }
  };

  const testNotification = async () => {
    if (!canShowNotifications) {
      await handleRequestPermission();
      return;
    }

    await notificationService.showNotification({
      title: 'Test Notification',
      body: 'This is a test notification from LeadTrade. Your notifications are working correctly!',
      tag: 'test-notification',
      icon: '/icons/icon-192x192.svg'
    });
  };

  if (isLoading || !preferences) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage your notification preferences and stay updated on important trading activities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {canShowNotifications ? (
                <Bell className="h-4 w-4 text-green-600" />
              ) : (
                <BellOff className="h-4 w-4 text-gray-400" />
              )}
              <span className="font-medium">
                Notifications {canShowNotifications ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex gap-2">
              {!canShowNotifications && (
                <Button onClick={handleRequestPermission} size="sm">
                  Enable
                </Button>
              )}
              <Button onClick={testNotification} variant="outline" size="sm">
                Test
              </Button>
            </div>
          </div>
          {permission === 'denied' && (
            <p className="text-sm text-red-600">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          )}
        </div>

        <Separator />

        {/* Notification Types */}
        <div className="space-y-4">
          <h4 className="font-medium">Notification Types</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trade-alerts">Trade Alerts</Label>
                <p className="text-sm text-gray-600">
                  Get notified when trades are executed or orders are filled
                </p>
              </div>
              <Switch
                id="trade-alerts"
                checked={preferences.tradeAlerts}
                onCheckedChange={(checked) => handleToggle('tradeAlerts', checked)}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="portfolio-updates">Portfolio Updates</Label>
                <p className="text-sm text-gray-600">
                  Receive updates on significant portfolio changes
                </p>
              </div>
              <Switch
                id="portfolio-updates"
                checked={preferences.portfolioUpdates}
                onCheckedChange={(checked) => handleToggle('portfolioUpdates', checked)}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="copy-trading-updates">Copy Trading Updates</Label>
                <p className="text-sm text-gray-600">
                  Get notified when traders you follow make new trades
                </p>
              </div>
              <Switch
                id="copy-trading-updates"
                checked={preferences.copyTradingUpdates}
                onCheckedChange={(checked) => handleToggle('copyTradingUpdates', checked)}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="market-news">Market News</Label>
                <p className="text-sm text-gray-600">
                  Receive important market news and alerts
                </p>
              </div>
              <Switch
                id="market-news"
                checked={preferences.marketNews}
                onCheckedChange={(checked) => handleToggle('marketNews', checked)}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="system-notifications">System Notifications</Label>
                <p className="text-sm text-gray-600">
                  App updates, maintenance notices, and system alerts
                </p>
              </div>
              <Switch
                id="system-notifications"
                checked={preferences.systemNotifications}
                onCheckedChange={(checked) => handleToggle('systemNotifications', checked)}
                disabled={isSaving}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Quiet Hours */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <h4 className="font-medium">Quiet Hours</h4>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
                <p className="text-sm text-gray-600">
                  Suppress non-critical notifications during specified hours
                </p>
              </div>
              <Switch
                id="quiet-hours"
                checked={preferences.quietHours.enabled}
                onCheckedChange={handleQuietHoursToggle}
                disabled={isSaving}
              />
            </div>

            {preferences.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4 pl-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={preferences.quietHours.start}
                    onChange={(e) => handleQuietHoursTimeChange('start', e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end">End Time</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={preferences.quietHours.end}
                    onChange={(e) => handleQuietHoursTimeChange('end', e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Settings className="h-4 w-4 animate-spin" />
            Saving preferences...
          </div>
        )}
      </CardContent>
    </Card>
  );
}