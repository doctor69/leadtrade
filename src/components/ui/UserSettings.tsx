import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Switch } from './switch';
import { Button } from './button';
import { AlertCircle, User, Shield, Palette } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ThemeCustomizer } from './ThemeCustomizer';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username: string;
  share_trades: boolean;
  show_asset_amounts: boolean;
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

  // Load user profile
  useEffect(() => {
    loadUserProfile();
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
        .select('id, email, full_name, username, share_trades, show_asset_amounts')
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

  const handlePrivacyToggle = async (field: 'share_trades' | 'show_asset_amounts', value: boolean) => {
    await updateProfile({ [field]: value });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
          <Button onClick={loadUserProfile} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your basic account details and profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <div className="text-sm font-medium">{profile?.email}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Username</label>
              <div className="text-sm font-medium">{profile?.username || 'Not set'}</div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Full Name</label>
            <div className="text-sm font-medium">{profile?.full_name || 'Not set'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme & Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of your trading interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeCustomizer />
        </CardContent>
      </Card>

      {/* Privacy & Sharing Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Sharing
          </CardTitle>
          <CardDescription>
            Control how your trading information is shared with other users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Share Trades</div>
              <div className="text-sm text-muted-foreground">
                Allow other users to see and copy your trades on the leaderboard
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
              <div className="font-medium">Show Portfolio Values</div>
              <div className="text-sm text-muted-foreground">
                Display your actual portfolio amounts to potential followers
              </div>
            </div>
            <Switch
              checked={profile?.show_asset_amounts || false}
              onCheckedChange={(value) => handlePrivacyToggle('show_asset_amounts', value)}
              disabled={saving || !profile?.share_trades}
            />
          </div>

          {!profile?.share_trades && (
            <div className="text-sm text-muted-foreground italic">
              Enable "Share Trades" to control portfolio value visibility
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Privacy Note:</strong> When sharing is enabled, other users can see your trading activity and performance. 
              You can disable portfolio value visibility while still allowing trade copying.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Status */}
      {saving && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
          <span className="text-sm text-muted-foreground">Saving changes...</span>
        </div>
      )}
    </div>
  );
}