import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@supabase/supabase-js';

interface AccountCreationFormProps {
  returnUrl?: string;
}

export default function AccountCreationForm({ returnUrl = '/dashboard' }: AccountCreationFormProps) {
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
          redirectTo: `${window.location.origin}${returnUrl}`,
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
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.given_name} ${formData.family_name}`,
            given_name: formData.given_name,
            family_name: formData.family_name,
            date_of_birth: formData.date_of_birth,
            phone_number: formData.phone_number,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postal_code,
            investment_experience: formData.investment_experience_with_stocks,
            investment_objective: formData.investment_objective,
            risk_tolerance: formData.risk_tolerance,
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create account');
      }

      setSuccess(true);
      // Redirect to signin after successful account creation with return URL
      setTimeout(() => {
        const signinUrl = returnUrl !== '/dashboard' 
          ? `/signin?returnUrl=${encodeURIComponent(returnUrl)}`
          : '/signin';
        window.location.href = signinUrl;
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold mb-2">Account Created Successfully!</h2>
          <p className="text-muted-foreground mb-4">
            Your LEADTRADE account has been created successfully!
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting to sign in page...
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

      {/* Social Login Options */}
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
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialSignup('apple')}
              disabled={loading}
              className="w-full"
            >
              <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
              </svg>
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
        <a href={returnUrl !== '/dashboard' ? `/signin?returnUrl=${encodeURIComponent(returnUrl)}` : '/signin'} className="text-primary hover:underline">
          Sign in here
        </a>
      </div>
    </form>
  );
}