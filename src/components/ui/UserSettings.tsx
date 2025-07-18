import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Switch } from './switch';
import { Button } from './button';
import { Badge } from './badge';
import { AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { debugTradingConfig, validateAllTradingModes, type TradingMode } from '../../lib/trading-config';

interface UserProfile {
  id: string;
  is_paper_trading: boolean;
  share_trades: boolean;
  show_asset_amounts: boolean;
  theme_color: string;
}

interface UserSettingsProps {
  userId?: string;
  onSettingsChange?: (settings: Partial<UserProfile>) => void;
}

export default function UserSettings({ userId, onSettingsChange }: UserSettingsProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<{
    paper: { valid: boolean; missing: string[] };
    live: { valid: boolean; missing: string[] };
  } | null>(null);

  // Load user profile and validate trading configurations
  useEffect(() => {
    loadUserProfile();
    validateConfigurations();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = userId || user?.id;

      if (!currentUserId) {
        throw new Error('No user ID available');
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, is_paper_trading, share_trades, show_asset_amounts, theme_color')
        .eq('id', currentUserId)
        .single();

      if (profileError) {
        throw profileError;
      }

      setProfile(data);
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const validateConfigurations = () => {
    try {
      const validation = validateAllTradingModes();
      setConfigStatus(validation);
      
      // Debug log configuration status
      debugTradingConfig();
    } catch (err) {
      console.error('Error validating trading configurations:', err);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;

    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      
      // Notify parent component of changes
      onSettingsChange?.(updates);

      console.log('Profile updated successfully:', updates);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTradingModeToggle = async (isPaperTrading: boolean) => {
    const mode: TradingMode = isPaperTrading ? 'paper' : 'live';
    
    // Check if the selected mode is properly configured
    if (configStatus && !configStatus[mode].valid) {
      setError(`${mode.charAt(0).toUpperCase() + mode.slice(1)} trading is not properly configured. Missing: ${configStatus[mode].missing.join(', ')}`);
      return;
    }

    await updateProfile({ is_paper_trading: isPaperTrading });
  };

  const handlePrivacyToggle = async (field: 'share_trades' | 'show_asset_amounts', value: boolean) => {
    await updateProfile({ [field]: value });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            User Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Error Loading Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={loadUserProfile} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trading Mode Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Trading Mode
          </CardTitle>
          <CardDescription>
            Choose between paper trading (practice) and live trading (real money)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Paper Trading</div>
                <div className="text-sm text-gray-600">Practice with virtual money</div>
              </div>
              <div className="flex items-center gap-2">
                {configStatus?.paper.valid ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Configured
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Live Trading</div>
                <div className="text-sm text-gray-600">Trade with real money</div>
              </div>
              <div className="flex items-center gap-2">
                {configStatus?.live.valid ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Configured
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Trading Mode Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
            <div>
              <div className="font-medium">
                Current Mode: {profile?.is_paper_trading ? 'Paper Trading' : 'Live Trading'}
              </div>
              <div className="text-sm text-gray-600">
                {profile?.is_paper_trading 
                  ? 'You are currently in practice mode with virtual money'
                  : 'You are currently trading with real money'
                }
              </div>
            </div>
            <Switch
              checked={profile?.is_paper_trading || false}
              onCheckedChange={handleTradingModeToggle}
              disabled={saving}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Sharing</CardTitle>
          <CardDescription>
            Control how your trading information is shared with other users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Share Trades</div>
              <div className="text-sm text-gray-600">
                Allow other users to see and copy your trades
              </div>
            </div>
            <Switch
              checked={profile?.share_trades || false}
              onCheckedChange={(value) => handlePrivacyToggle('share_trades', value)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Show Asset Amounts</div>
              <div className="text-sm text-gray-600">
                Display your portfolio values to potential followers
              </div>
            </div>
            <Switch
              checked={profile?.show_asset_amounts || false}
              onCheckedChange={(value) => handlePrivacyToggle('show_asset_amounts', value)}
              disabled={saving || !profile?.share_trades}
            />
          </div>

          {!profile?.share_trades && (
            <div className="text-sm text-gray-500 italic">
              Enable "Share Trades" to control asset amount visibility
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Status */}
      {saving && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-gray-600">Saving changes...</span>
        </div>
      )}
    </div>
  );
}