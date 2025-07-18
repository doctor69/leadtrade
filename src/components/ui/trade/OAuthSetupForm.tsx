import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { completeOAuthSetup, type OAuthUserData } from '@/lib/oauth-handler';

interface OAuthSetupFormProps {
  userData: OAuthUserData;
  onComplete: () => void;
}

export default function OAuthSetupForm({ userData, onComplete }: OAuthSetupFormProps) {
  const [formData, setFormData] = useState({
    date_of_birth: '',
    tax_id: '',
    phone_number: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    share_trades: false,
    show_asset_amounts: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await completeOAuthSetup(userData, formData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to complete account setup');
      }

      // Redirect to leaderboard
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        onComplete();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Complete Your Trading Account</h1>
        <p className="text-muted-foreground">
          Welcome {userData.full_name}! We need a few more details to set up your trading account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Required for your trading account verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date of Birth</label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tax ID (SSN)</label>
              <Input
                value={formData.tax_id}
                onChange={(e) => handleInputChange('tax_id', e.target.value)}
                placeholder="123-45-6789"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
            <CardDescription>Your residential address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Street Address</label>
              <Input
                value={formData.street_address}
                onChange={(e) => handleInputChange('street_address', e.target.value)}
                placeholder="123 Main Street"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="New York"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State</label>
                <Input
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="NY"
                  maxLength={2}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ZIP Code</label>
                <Input
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  placeholder="10001"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy & Sharing Settings</CardTitle>
            <CardDescription>Control how your trading activity is shared</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="share_trades"
                checked={formData.share_trades}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, share_trades: checked as boolean }))
                }
              />
              <div className="space-y-1">
                <label htmlFor="share_trades" className="text-sm font-medium cursor-pointer">
                  Share my trades for copy trading
                </label>
                <p className="text-xs text-muted-foreground">
                  Allow other users to see and copy your trades.
                </p>
              </div>
            </div>

            {formData.share_trades && (
              <div className="flex items-start space-x-3 ml-6">
                <Checkbox
                  id="show_asset_amounts"
                  checked={formData.show_asset_amounts}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, show_asset_amounts: checked as boolean }))
                  }
                />
                <div className="space-y-1">
                  <label htmlFor="show_asset_amounts" className="text-sm font-medium cursor-pointer">
                    Show my portfolio values
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Display your actual portfolio amounts to potential followers.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full max-w-md"
            size="lg"
          >
            {loading ? 'Setting Up Account...' : 'Complete Trading Account Setup'}
          </Button>
        </div>
      </form>
    </div>
  );
}