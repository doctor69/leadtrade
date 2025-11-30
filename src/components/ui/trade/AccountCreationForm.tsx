import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Checkbox } from '@/components/ui/checkbox';
import { createClient } from '@supabase/supabase-js';
import { createUserAccount, type SignupData } from '@/lib/signup-service';
import SupabaseSignUpForm from '@/components/SupabaseSignUpForm';

interface AccountCreationFormProps {
  returnUrl?: string;
}

export default function AccountCreationForm({ returnUrl }: AccountCreationFormProps) {
  // Always use Supabase form for production
  return <SupabaseSignUpForm returnUrl={returnUrl} />;

  // Get return URL from query params or use default
  const getReturnUrl = () => {
    if (returnUrl) return returnUrl;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('returnUrl') || '/dashboard';
    }
    return '/dashboard';
  };

  const finalReturnUrl = getReturnUrl();

  const [formData, setFormData] = useState({
    // Auth fields
    email: '',
    password: '',

    // Personal information
    given_name: '',
    family_name: '',
    date_of_birth: '',
    tax_id: '',
    tax_id_type: 'USA_SSN',

    // Contact information
    phone_number: '',
    street_address: [''],
    city: '',
    state: '',
    postal_code: '',

    // Financial information
    annual_income_min: '25000',
    annual_income_max: '50000',
    total_net_worth_min: '25000',
    total_net_worth_max: '50000',
    liquid_net_worth_min: '10000',
    liquid_net_worth_max: '25000',

    // Investment profile
    investment_experience_with_stocks: 'limited',
    investment_objective: 'growth',
    risk_tolerance: 'moderate',

    // Privacy controls
    share_trades: false,
    show_asset_amounts: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      street_address: [value]
    }));
  };

  const handleSocialSignup = async (provider: 'google' | 'apple') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${finalReturnUrl}`,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('Social signup failed. Please try again.');
      console.error('Social signup error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use the new transactional signup service
      const signupData: SignupData = {
        email: formData.email,
        password: formData.password,
        given_name: formData.given_name,
        family_name: formData.family_name,
        date_of_birth: formData.date_of_birth,
        tax_id: formData.tax_id,
        tax_id_type: formData.tax_id_type,
        phone_number: formData.phone_number,
        street_address: formData.street_address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        annual_income_min: formData.annual_income_min,
        annual_income_max: formData.annual_income_max,
        total_net_worth_min: formData.total_net_worth_min,
        total_net_worth_max: formData.total_net_worth_max,
        liquid_net_worth_min: formData.liquid_net_worth_min,
        liquid_net_worth_max: formData.liquid_net_worth_max,
        investment_experience_with_stocks: formData.investment_experience_with_stocks,
        investment_objective: formData.investment_objective,
        risk_tolerance: formData.risk_tolerance,
        share_trades: formData.share_trades,
        show_asset_amounts: formData.show_asset_amounts,
      };

      const result = await createUserAccount(signupData, 'paper');

      if (!result.success) {
        throw new Error(result.error || 'Account creation failed');
      }

      console.log('Account created successfully:', {
        userId: result.userId,
        alpacaAccountId: result.alpacaAccountId,
        needsEmailVerification: result.needsEmailVerification
      });

      setSuccess(true);
      
      // Redirect to leaderboard as specified in requirements
      setTimeout(() => {
        window.location.href = '/leaderboard';
      }, 2000);

    } catch (err) {
      console.error('Account creation error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during account creation');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold mb-2">Trading Account Created Successfully!</h2>
          <p className="text-muted-foreground mb-4">
            Your LEADTRADE account and Alpaca trading account have been created successfully!
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting to leaderboard to explore copy trading...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Social Login Options - Temporarily disabled */}
      {/*
      <Card>
        <CardHeader>
          <CardTitle>Quick Sign Up</CardTitle>
          <CardDescription>Sign up quickly with your existing account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialSignup('google')}
              disabled={loading}
              className="w-full"
            >
              Continue with Google
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialSignup('apple')}
              disabled={loading}
              className="w-full"
            >
              Continue with Apple
            </Button>
          </div>
          
          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or create account manually</span>
            </div>
          </div>
        </CardContent>
      </Card>
      */}

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Create your LEADTRADE login credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Create a strong password"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Required for your LEADTRADE trading account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name</label>
              <Input
                value={formData.given_name}
                onChange={(e) => handleInputChange('given_name', e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name</label>
              <Input
                value={formData.family_name}
                onChange={(e) => handleInputChange('family_name', e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tax ID (SSN)</label>
              <Input
                value={formData.tax_id}
                onChange={(e) => handleInputChange('tax_id', e.target.value)}
                placeholder="123-45-6789"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tax ID Type</label>
              <Select value={formData.tax_id_type} onValueChange={(value) => handleInputChange('tax_id_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USA_SSN">Social Security Number</SelectItem>
                  <SelectItem value="USA_ITIN">Individual Taxpayer ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              value={formData.street_address[0]}
              onChange={(e) => handleAddressChange(e.target.value)}
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

      {/* Investment Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Profile</CardTitle>
          <CardDescription>Help us understand your investment experience and goals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Stock Trading Experience</label>
              <Select value={formData.investment_experience_with_stocks} onValueChange={(value) => handleInputChange('investment_experience_with_stocks', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Experience</SelectItem>
                  <SelectItem value="limited">Limited (Less than 1 year)</SelectItem>
                  <SelectItem value="1_3_years">1-3 Years</SelectItem>
                  <SelectItem value="3_5_years">3-5 Years</SelectItem>
                  <SelectItem value="over_5_years">Over 5 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Investment Objective</label>
              <Select value={formData.investment_objective} onValueChange={(value) => handleInputChange('investment_objective', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="capital_preservation">Capital Preservation</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="speculation">Speculation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Risk Tolerance</label>
            <Select value={formData.risk_tolerance} onValueChange={(value) => handleInputChange('risk_tolerance', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Privacy and Sharing Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Sharing Settings</CardTitle>
          <CardDescription>Control how your trading activity is shared with other users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
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
                  Allow other users to see and copy your trades. You can change this later in settings.
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
                    Display your actual portfolio amounts to potential followers. If disabled, only trade percentages will be visible.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button
          type="submit"
          disabled={loading}
          className="w-full max-w-md"
          size="lg"
        >
          {loading ? 'Creating Account...' : 'Create Trading Account'}
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <a href={finalReturnUrl !== '/dashboard' ? `/signin?returnUrl=${encodeURIComponent(finalReturnUrl)}` : '/signin'} className="text-primary hover:underline">
          Sign in here
        </a>
      </div>
    </form>
  );
}