import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Switch } from './switch';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { AlertCircle, User, Shield, TrendingUp, RefreshCw, Edit, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { apiService } from '@/lib/apiService';

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
  accountId?: string | null;
  onSettingsChange?: (settings: Partial<UserProfile>) => void;
}

export default function UserSettings({ userId, accountId, onSettingsChange }: UserSettingsProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingStats, setUpdatingStats] = useState(false);
  const [statsMessage, setStatsMessage] = useState<string | null>(null);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Alpaca account data
  const [alpacaAccount, setAlpacaAccount] = useState<any>(null);
  const [loadingAlpaca, setLoadingAlpaca] = useState(false);
  
  // Edit form state
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editZip, setEditZip] = useState('');

  // Load user profile
  useEffect(() => {
    loadUserProfile();
    if (accountId) {
      loadAlpacaAccount();
    }
  }, [userId, accountId]);

  const loadAlpacaAccount = async () => {
    if (!accountId) return;
    
    try {
      setLoadingAlpaca(true);
      const result = await apiService.getAccount();
      
      if (result.success && result.data) {
        setAlpacaAccount(result.data);
        // Populate edit form
        setEditEmail(result.data.contact?.email_address || '');
        setEditPhone(result.data.contact?.phone_number || '');
        const street = result.data.contact?.street_address || [];
        setEditStreet(street[0] || '');
        setEditCity(result.data.contact?.city || '');
        setEditState(result.data.contact?.state || '');
        setEditZip(result.data.contact?.postal_code || '');
      }
    } catch (err) {
      console.error('Error loading Alpaca account:', err);
    } finally {
      setLoadingAlpaca(false);
    }
  };

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
    setSettingsChanged(true);
  };

  const handleSaveProfile = async () => {
    if (!accountId) return;
    
    try {
      setSaving(true);
      setError(null);

      const updates = {
        contact: {
          email_address: editEmail,
          phone_number: editPhone,
          street_address: [editStreet].filter(Boolean),
          city: editCity,
          state: editState,
          postal_code: editZip,
        },
      };

      const response = await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-account-update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          account_id: accountId,
          updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      await loadAlpacaAccount();
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setError(null);
    // Reset form to current values
    if (alpacaAccount) {
      setEditEmail(alpacaAccount.contact?.email_address || '');
      setEditPhone(alpacaAccount.contact?.phone_number || '');
      const street = alpacaAccount.contact?.street_address || [];
      setEditStreet(street[0] || '');
      setEditCity(alpacaAccount.contact?.city || '');
      setEditState(alpacaAccount.contact?.state || '');
      setEditZip(alpacaAccount.contact?.postal_code || '');
    }
  };

  const handleUpdateLeaderboardStats = async () => {
    try {
      setUpdatingStats(true);
      setStatsMessage(null);
      
      const result = await apiService.updateLeaderboardStats();
      
      if (result.success) {
        setStatsMessage('Leaderboard stats updated successfully!');
        setSettingsChanged(false); // Reset the changed state
      } else {
        setStatsMessage(result.error || 'Failed to update stats');
      }
    } catch (err) {
      setStatsMessage(err instanceof Error ? err.message : 'Failed to update stats');
    } finally {
      setUpdatingStats(false);
      // Clear message after 5 seconds
      setTimeout(() => setStatsMessage(null), 5000);
    }
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your basic account details and profile information
              </CardDescription>
            </div>
            {accountId && alpacaAccount && !isEditingProfile && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEditingProfile ? (
            // Read-only view
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="text-sm font-medium">{alpacaAccount?.contact?.email_address || profile?.email || 'Not set'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <div className="text-sm font-medium">{alpacaAccount?.contact?.phone_number || 'Not set'}</div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <div className="text-sm font-medium">
                  {alpacaAccount?.identity?.given_name && alpacaAccount?.identity?.family_name
                    ? `${alpacaAccount.identity.given_name} ${alpacaAccount.identity.family_name}`
                    : profile?.full_name || 'Not set'}
                </div>
              </div>
              {alpacaAccount?.contact?.street_address && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <div className="text-sm font-medium">
                    {alpacaAccount.contact.street_address.join(', ')}
                    {alpacaAccount.contact.city && `, ${alpacaAccount.contact.city}`}
                    {alpacaAccount.contact.state && `, ${alpacaAccount.contact.state}`}
                    {alpacaAccount.contact.postal_code && ` ${alpacaAccount.contact.postal_code}`}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Edit mode
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-street">Street Address</Label>
                <Input
                  id="edit-street"
                  value={editStreet}
                  onChange={(e) => setEditStreet(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-state">State</Label>
                  <Input
                    id="edit-state"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-zip">ZIP Code</Label>
                  <Input
                    id="edit-zip"
                    value={editZip}
                    onChange={(e) => setEditZip(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
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

          {profile?.share_trades && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Leaderboard Stats
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Update your performance metrics to appear on the leaderboard. Stats auto-update when you make trades.
                  </div>
                </div>
                <Button
                  onClick={handleUpdateLeaderboardStats}
                  disabled={updatingStats}
                  size="sm"
                  variant={settingsChanged ? "default" : "outline"}
                  className={settingsChanged ? "animate-pulse" : ""}
                >
                  {updatingStats ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {settingsChanged ? "Update Now" : "Update Stats"}
                    </>
                  )}
                </Button>
              </div>
              {statsMessage && (
                <div className={`mt-3 text-sm p-2 rounded ${
                  statsMessage.includes('success') 
                    ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200' 
                    : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
                }`}>
                  {statsMessage}
                </div>
              )}
            </div>
          )}
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