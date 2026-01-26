import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { safeNavigate } from '@/lib/navigation';
import { edgeFunctionClient } from '@/lib/edgeFunctionClient';
import { User, Mail, Lock, UserCheck, Settings, FileText } from 'lucide-react';
import DocumentUpload from '@/components/DocumentUpload';
import type { DocumentUpload as DocumentUploadType } from '@/types/documents';

interface SupabaseSignUpFormProps {
  returnUrl?: string;
}

export default function SupabaseSignUpForm({ returnUrl = '/dashboard' }: SupabaseSignUpFormProps) {
  // Check if user came from OAuth (already authenticated)
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [oauthUserData, setOauthUserData] = useState<any>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic account info
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    username: '',
    
    // Personal information (required by Alpaca)
    givenName: '',
    familyName: '',
    dateOfBirth: '',
    phoneNumber: '',
    
    // Address information
    streetAddress: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA',
    
    // Tax information
    taxId: '',
    taxIdType: 'USA_SSN',
    
    // Financial information
    annualIncomeMin: '25000',
    annualIncomeMax: '49999',
    totalNetWorthMin: '25000',
    totalNetWorthMax: '49999',
    liquidNetWorthMin: '10000',
    liquidNetWorthMax: '24999',
    
    // Investment profile
    investmentExperience: 'limited',
    investmentObjective: 'growth',
    riskTolerance: 'moderate',
    
    // Employment information
    employmentStatus: 'employed',
    employerName: '',
    employerAddress: '',
    employmentPosition: 'other',
    
    // Trading preferences
    shareTrades: false,
    showAssetAmounts: false,
    
    // Disclosures
    isControlPerson: false,
    isAffiliatedExchangeOrFinra: false,
    isPoliticallyExposed: false,
    immediateFamilyExposed: false,
  });

  // Document upload state
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [skipDocuments, setSkipDocuments] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Check if user is already authenticated via OAuth
  useEffect(() => {
    const checkOAuthUser = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isOAuth = urlParams.get('oauth') === 'true';
      const startStep = urlParams.get('step');
      
      if (isOAuth) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('OAuth user detected:', user.email);
          setIsOAuthUser(true);
          setOauthUserData(user);
          
          // Pre-fill form with OAuth data
          setFormData(prev => ({
            ...prev,
            email: user.email || '',
            givenName: user.user_metadata?.given_name || user.user_metadata?.full_name?.split(' ')[0] || '',
            familyName: user.user_metadata?.family_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            fullName: user.user_metadata?.full_name || '',
          }));
          
          // Skip to step 2 (personal info) for OAuth users
          if (startStep) {
            setCurrentStep(parseInt(startStep));
          } else {
            setCurrentStep(2);
          }
        }
      }
    };
    
    checkOAuthUser();
  }, []);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const nextStep = () => {
    if (loading) return; // Prevent navigation while loading
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      setError(''); // Clear any previous errors
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCurrentStep = (): string | null => {
    switch (currentStep) {
      case 1:
        // Skip validation for OAuth users
        if (isOAuthUser) {
          return null;
        }
        if (!formData.email || !formData.password || !formData.confirmPassword) {
          return 'Please fill in all account fields';
        }
        if (formData.password.length < 6) {
          return 'Password must be at least 6 characters long';
        }
        if (formData.password !== formData.confirmPassword) {
          return 'Passwords do not match';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          return 'Please enter a valid email address';
        }
        break;
      
      case 2:
        if (!formData.givenName || !formData.familyName || !formData.dateOfBirth || !formData.phoneNumber) {
          return 'Please fill in all personal information';
        }
        // Age validation
        const birthDate = new Date(formData.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 18) {
          return 'You must be at least 18 years old';
        }
        break;
      
      case 3:
        if (!formData.streetAddress || !formData.city || !formData.state || !formData.postalCode || !formData.taxId) {
          return 'Please fill in all address and tax information';
        }
        const ssnRegex = /^\d{9}$/;
        const cleanSSN = formData.taxId.replace(/[-\s]/g, '');
        if (!ssnRegex.test(cleanSSN)) {
          return 'Please enter a valid 9-digit Social Security Number';
        }
        break;
      
      case 4:
        if (formData.employmentStatus === 'employed' && !formData.employerName) {
          return 'Please enter your employer name';
        }
        // Additional validation for financial information
        if (!formData.annualIncomeMin || !formData.totalNetWorthMin || !formData.liquidNetWorthMin) {
          return 'Please select your income and net worth ranges';
        }
        break;
      
      case 5:
        // Document validation - at least identity verification required unless skipped
        if (!skipDocuments && !documents.some(doc => doc.type === 'identity_verification' && doc.uploaded)) {
          return 'Please upload an identity verification document or choose to skip';
        }
        break;
    }
    return null;
  };

  const validateForm = (): string | null => {
    // Basic validation
    if (!formData.email || !formData.password || !formData.fullName) {
      return 'Please fill in all required fields';
    }

    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Please enter a valid email address';
    }

    // Alpaca required fields validation
    if (!formData.givenName || !formData.familyName) {
      return 'Please enter your first and last name';
    }

    if (!formData.dateOfBirth) {
      return 'Please enter your date of birth';
    }

    // Check if user is at least 18 years old
    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (age < 18 || (age === 18 && monthDiff < 0) || (age === 18 && monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return 'You must be at least 18 years old to create an account';
    }

    if (!formData.phoneNumber) {
      return 'Please enter your phone number';
    }

    if (!formData.streetAddress || !formData.city || !formData.state || !formData.postalCode) {
      return 'Please fill in your complete address';
    }

    if (!formData.taxId) {
      return 'Please enter your Social Security Number';
    }

    // Basic SSN validation (9 digits)
    const ssnRegex = /^\d{9}$/;
    const cleanSSN = formData.taxId.replace(/[-\s]/g, '');
    if (!ssnRegex.test(cleanSSN)) {
      return 'Please enter a valid 9-digit Social Security Number';
    }

    if (!formData.employerName && formData.employmentStatus === 'employed') {
      return 'Please enter your employer name';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (loading || success) {
      return;
    }
    
    setLoading(true);
    setError('');

    console.log('🚀 Starting signup process...', isOAuthUser ? '(OAuth user)' : '(Email/Password user)');

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      console.error('❌ Form validation failed:', validationError);
      setError(validationError);
      setLoading(false);
      return;
    }

    console.log('✅ Form validation passed');

    try {
      let userId: string;
      
      if (isOAuthUser && oauthUserData) {
        // OAuth user - skip Supabase signup, use existing user ID
        console.log('📝 OAuth user detected, skipping Supabase signup...');
        userId = oauthUserData.id;
        console.log('✅ Using OAuth user ID:', userId);
      } else {
        // Regular signup flow
        console.log('📝 Step 1: Creating account via Edge Function...');
        
        const signupData = {
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          username: formData.username || formData.email.split('@')[0],
          given_name: formData.givenName,
          family_name: formData.familyName,
          date_of_birth: formData.dateOfBirth,
          tax_id: formData.taxId.replace(/[-\s]/g, ''), // Clean SSN
          tax_id_type: formData.taxIdType,
          phone_number: formData.phoneNumber,
          street_address: formData.streetAddress,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postalCode,
          country: formData.country,
          annual_income_min: formData.annualIncomeMin,
          annual_income_max: formData.annualIncomeMax,
          total_net_worth_min: formData.totalNetWorthMin,
          total_net_worth_max: formData.totalNetWorthMax,
          liquid_net_worth_min: formData.liquidNetWorthMin,
          liquid_net_worth_max: formData.liquidNetWorthMax,
          investment_experience: formData.investmentExperience,
          investment_objective: formData.investmentObjective,
          risk_tolerance: formData.riskTolerance,
          employment_status: formData.employmentStatus,
          employer_name: formData.employerName,
          employer_address: formData.employerAddress,
          employment_position: formData.employmentPosition,
          is_control_person: formData.isControlPerson,
          is_affiliated_exchange_or_finra: formData.isAffiliatedExchangeOrFinra,
          is_politically_exposed: formData.isPoliticallyExposed,
          immediate_family_exposed: formData.immediateFamilyExposed,
          share_trades: formData.shareTrades,
          show_asset_amounts: formData.showAssetAmounts,
        };

        console.log('📤 Sending signup data:', {
          ...signupData,
          password: '***masked***',
          tax_id: signupData.tax_id ? '***masked***' : 'missing'
        });

        const signupResponse = await edgeFunctionClient.post('streamlined-signup', signupData, undefined, false);

        if (!signupResponse.success) {
          console.error('❌ Signup Edge Function failed:', signupResponse.error);
          throw new Error(signupResponse.error?.message || 'Failed to create account');
        }

        console.log('✅ Account created successfully via Edge Function');
        const userData = signupResponse.data.data; // Fix: access nested data
        console.log('🔍 Debug - userData from signup:', userData);
        userId = userData.user_id;
        console.log('🔍 Debug - userId:', userId);
      }

      // Step 2: Auto-sign in the user (skip for OAuth users - already signed in)
      if (!isOAuthUser) {
        console.log('🔐 Step 2: Auto-signing in user...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError || !signInData.session) {
          console.error('Auto sign-in error:', signInError);
          setError(`Account created successfully, but auto sign-in failed: ${signInError?.message || 'Unknown error'}. Please sign in manually.`);
          // Don't redirect immediately on error - let user see the error
          setTimeout(() => {
            safeNavigate('/signin');
          }, 5000);
          setLoading(false);
          return;
        }

        console.log('✅ User signed in successfully');
      } else {
        console.log('✅ OAuth user already signed in, skipping auto sign-in');
      }

      // Step 3: Create Alpaca account with KYC data
      console.log('🏦 Step 3: Creating Alpaca brokerage account...');
      
      try {
        // Prepare documents for Alpaca
        const alpacaDocuments = documents.map(doc => ({
          document_type: doc.type,
          document_sub_type: doc.subType,
          content: doc.base64Content,
          content_data: null,
          mime_type: doc.mimeType
        }));

        const alpacaAccountData = {
          user_id: userData.user_id,
          email: formData.email,
          full_name: formData.fullName,
          given_name: formData.givenName,
          family_name: formData.familyName,
          date_of_birth: formData.dateOfBirth,
          tax_id: formData.taxId.replace(/[-\s]/g, ''),
          tax_id_type: formData.taxIdType,
          phone_number: formData.phoneNumber,
          street_address: [formData.streetAddress],
          city: formData.city,
          state: formData.state,
          postal_code: formData.postalCode,
          country: formData.country,
          annual_income_min: formData.annualIncomeMin,
          annual_income_max: formData.annualIncomeMax,
          total_net_worth_min: formData.totalNetWorthMin,
          total_net_worth_max: formData.totalNetWorthMax,
          liquid_net_worth_min: formData.liquidNetWorthMin,
          liquid_net_worth_max: formData.liquidNetWorthMax,
          investment_experience: formData.investmentExperience,
          investment_objective: formData.investmentObjective,
          risk_tolerance: formData.riskTolerance,
          employment_status: formData.employmentStatus,
          employer_name: formData.employerName,
          employer_address: formData.employerAddress,
          employment_position: formData.employmentPosition,
          is_control_person: formData.isControlPerson,
          is_affiliated_exchange_or_finra: formData.isAffiliatedExchangeOrFinra,
          is_politically_exposed: formData.isPoliticallyExposed,
          immediate_family_exposed: formData.immediateFamilyExposed,
          documents: alpacaDocuments.length > 0 ? alpacaDocuments : undefined
        };

        console.log('🏦 Sending Alpaca account data:', {
          ...alpacaAccountData,
          tax_id: alpacaAccountData.tax_id ? '***masked***' : 'missing'
        });

        const alpacaResponse = await edgeFunctionClient.request('create-alpaca-account', {
          method: 'POST',
          body: alpacaAccountData,
          requireAuth: false,
          timeout: 30000, // 30 seconds for Alpaca account creation
          retries: 1 // Only retry once
        });

        if (!alpacaResponse.success) {
          console.error('❌ Alpaca account creation failed:', alpacaResponse.error);
          
          // Check if this is a validation error that the user can fix
          const errorMessage = alpacaResponse.error?.message || 'Unknown error';
          const isValidationError = errorMessage.includes('required') || 
                                   errorMessage.includes('invalid') || 
                                   errorMessage.includes('format') ||
                                   errorMessage.includes('must be');
          
          // Check if this is a database storage error
          const isDatabaseError = errorMessage.includes('Failed to store account information') ||
                                 errorMessage.includes('database') ||
                                 errorMessage.includes('RLS') ||
                                 errorMessage.includes('policy');
          
          if (isValidationError) {
            // This is a validation error - show it prominently so user can fix the form
            throw new Error(`Please check your information: ${errorMessage}`);
          } else if (isDatabaseError) {
            // This is a database error - show specific message
            setError(`Account created successfully, but there was an issue saving your trading account information: ${errorMessage}. Please contact support.`);
          } else {
            // This is a system error - don't fail the signup but show a warning
            setError(`Account created successfully, but brokerage setup encountered an issue: ${errorMessage}. You can complete this later in your dashboard.`);
          }
        } else {
          console.log('✅ Alpaca brokerage account created successfully');
          console.log('✅ Trading account information saved to database');
        }
      } catch (alpacaError) {
        console.error('❌ Alpaca account creation error:', alpacaError);
        // Don't fail the entire signup process
        setError(`Account created successfully, but brokerage setup encountered an issue. You can complete this later in your dashboard.`);
      }

      // Session is automatically managed by Supabase client
      // No need to manually store tokens - Supabase handles this
      console.log('✅ Session established automatically by Supabase');

      // Trigger storage event to update navbar
      window.dispatchEvent(new Event('storage'));

      // Set success state
      setSuccess(true);

      // Redirect to dashboard on success
      setTimeout(() => {
        safeNavigate(returnUrl);
      }, 3000);

    } catch (err) {
      console.error('Account creation error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during account creation');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      const { data, error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnUrl=${encodeURIComponent(returnUrl)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (googleError) {
        throw new Error(googleError.message);
      }

      // OAuth redirect will handle the rest
      console.log('Google OAuth initiated successfully');

    } catch (err) {
      console.error('Google sign-up error:', err);
      setError(err instanceof Error ? err.message : 'Google sign-up failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold mb-2">Account Created Successfully!</h2>
          <p className="text-muted-foreground mb-4">
            Welcome to LEADTRADE! Your trading account has been created successfully.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✅ Trading account created and verified</p>
            <p>✅ Alpaca brokerage account set up</p>
            <p>✅ $100,000 paper trading balance</p>
            <p>✅ Access to real-time market data</p>
            <p>✅ Copy trading features available</p>
            <p>✅ Portfolio analytics enabled</p>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Redirecting to your dashboard...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Paper Trading
            </Badge>
            <Badge variant="outline">Real Market Data</Badge>
          </div>
          <CardTitle className="text-2xl">Create Your Trading Account</CardTitle>
          <CardDescription>
            Start paper trading with $100,000 virtual funds and real market data
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : step < currentStep 
                      ? 'bg-green-500 text-white' 
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {step < currentStep ? '✓' : step}
                </div>
                {step < 5 && (
                  <div className={`w-full h-0.5 mx-2 ${
                    step < currentStep ? 'bg-green-500' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of 5: {
                currentStep === 1 ? 'Account Setup' :
                currentStep === 2 ? 'Personal Information' :
                currentStep === 3 ? 'Address & Tax Info' :
                currentStep === 4 ? 'Employment & Investment Profile' :
                'Document Upload'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sign Up Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStep === 1 && <><User className="h-5 w-5" />Account Setup</>}
            {currentStep === 2 && <><User className="h-5 w-5" />Personal Information</>}
            {currentStep === 3 && <><Mail className="h-5 w-5" />Address & Tax Information</>}
            {currentStep === 4 && <><Settings className="h-5 w-5" />Employment & Investment Profile</>}
            {currentStep === 5 && <><FileText className="h-5 w-5" />Document Upload</>}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Create your LEADTRADE account credentials'}
            {currentStep === 2 && 'Required personal information for account verification'}
            {currentStep === 3 && 'Address and tax information required by regulations'}
            {currentStep === 4 && 'Complete your investment profile and preferences'}
            {currentStep === 5 && 'Upload identity verification documents (optional)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (currentStep === 5) {
              handleSubmit(e);
            } else {
              const error = validateCurrentStep();
              if (error) {
                setError(error);
              } else {
                setError('');
                nextStep();
              }
            }
          }} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Step 1: Account Setup */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Google Sign-Up Button */}
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading || googleLoading}
                    onClick={handleGoogleSignUp}
                    className="w-full"
                    size="lg"
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
                    {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
                  </Button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or create account manually
                      </span>
                    </div>
                  </div>
                </div>

                {/* Basic Account Information */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address *
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Full Name *
                      </label>
                      <Input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Username (optional)
                    </label>
                    <Input
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder="Leave empty to use email prefix"
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be your display name on leaderboards
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Password *
                      </label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="Create a strong password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Confirm Password *
                      </label>
                      <Input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        placeholder="Confirm your password"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Personal Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name *</label>
                    <Input
                      type="text"
                      value={formData.givenName}
                      onChange={(e) => handleInputChange('givenName', e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name *</label>
                    <Input
                      type="text"
                      value={formData.familyName}
                      onChange={(e) => handleInputChange('familyName', e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date of Birth *</label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">You must be 18 or older</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number *</label>
                    <Input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      placeholder="(555) 123-4567"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Address & Tax Information */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Street Address *</label>
                  <Input
                    type="text"
                    value={formData.streetAddress}
                    onChange={(e) => handleInputChange('streetAddress', e.target.value)}
                    placeholder="123 Main Street"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City *</label>
                    <Input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="New York"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">State *</label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => handleInputChange('state', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AL">Alabama</SelectItem>
                        <SelectItem value="AK">Alaska</SelectItem>
                        <SelectItem value="AZ">Arizona</SelectItem>
                        <SelectItem value="AR">Arkansas</SelectItem>
                        <SelectItem value="CA">California</SelectItem>
                        <SelectItem value="CO">Colorado</SelectItem>
                        <SelectItem value="CT">Connecticut</SelectItem>
                        <SelectItem value="DE">Delaware</SelectItem>
                        <SelectItem value="FL">Florida</SelectItem>
                        <SelectItem value="GA">Georgia</SelectItem>
                        <SelectItem value="HI">Hawaii</SelectItem>
                        <SelectItem value="ID">Idaho</SelectItem>
                        <SelectItem value="IL">Illinois</SelectItem>
                        <SelectItem value="IN">Indiana</SelectItem>
                        <SelectItem value="IA">Iowa</SelectItem>
                        <SelectItem value="KS">Kansas</SelectItem>
                        <SelectItem value="KY">Kentucky</SelectItem>
                        <SelectItem value="LA">Louisiana</SelectItem>
                        <SelectItem value="ME">Maine</SelectItem>
                        <SelectItem value="MD">Maryland</SelectItem>
                        <SelectItem value="MA">Massachusetts</SelectItem>
                        <SelectItem value="MI">Michigan</SelectItem>
                        <SelectItem value="MN">Minnesota</SelectItem>
                        <SelectItem value="MS">Mississippi</SelectItem>
                        <SelectItem value="MO">Missouri</SelectItem>
                        <SelectItem value="MT">Montana</SelectItem>
                        <SelectItem value="NE">Nebraska</SelectItem>
                        <SelectItem value="NV">Nevada</SelectItem>
                        <SelectItem value="NH">New Hampshire</SelectItem>
                        <SelectItem value="NJ">New Jersey</SelectItem>
                        <SelectItem value="NM">New Mexico</SelectItem>
                        <SelectItem value="NY">New York</SelectItem>
                        <SelectItem value="NC">North Carolina</SelectItem>
                        <SelectItem value="ND">North Dakota</SelectItem>
                        <SelectItem value="OH">Ohio</SelectItem>
                        <SelectItem value="OK">Oklahoma</SelectItem>
                        <SelectItem value="OR">Oregon</SelectItem>
                        <SelectItem value="PA">Pennsylvania</SelectItem>
                        <SelectItem value="RI">Rhode Island</SelectItem>
                        <SelectItem value="SC">South Carolina</SelectItem>
                        <SelectItem value="SD">South Dakota</SelectItem>
                        <SelectItem value="TN">Tennessee</SelectItem>
                        <SelectItem value="TX">Texas</SelectItem>
                        <SelectItem value="UT">Utah</SelectItem>
                        <SelectItem value="VT">Vermont</SelectItem>
                        <SelectItem value="VA">Virginia</SelectItem>
                        <SelectItem value="WA">Washington</SelectItem>
                        <SelectItem value="WV">West Virginia</SelectItem>
                        <SelectItem value="WI">Wisconsin</SelectItem>
                        <SelectItem value="WY">Wyoming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">ZIP Code *</label>
                    <Input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      placeholder="12345"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Social Security Number *</label>
                  <Input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => handleInputChange('taxId', e.target.value)}
                    placeholder="123-45-6789"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for account verification. Your information is encrypted and secure.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Employment & Investment Profile */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {/* Employment Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Employment Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Employment Status *</label>
                      <Select
                        value={formData.employmentStatus}
                        onValueChange={(value) => handleInputChange('employmentStatus', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employed">Employed</SelectItem>
                          <SelectItem value="unemployed">Unemployed</SelectItem>
                          <SelectItem value="retired">Retired</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="self_employed">Self Employed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {formData.employmentStatus === 'employed' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Employer Name *</label>
                        <Input
                          type="text"
                          value={formData.employerName}
                          onChange={(e) => handleInputChange('employerName', e.target.value)}
                          placeholder="Company Name"
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Annual Income Range *</label>
                      <Select
                        value={`${formData.annualIncomeMin}-${formData.annualIncomeMax}`}
                        onValueChange={(value) => {
                          const [min, max] = value.split('-');
                          handleInputChange('annualIncomeMin', min);
                          handleInputChange('annualIncomeMax', max);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25000-49999">$25,000 - $49,999</SelectItem>
                          <SelectItem value="50000-99999">$50,000 - $99,999</SelectItem>
                          <SelectItem value="100000-199999">$100,000 - $199,999</SelectItem>
                          <SelectItem value="200000-499999">$200,000 - $499,999</SelectItem>
                          <SelectItem value="500000-999999">$500,000 - $999,999</SelectItem>
                          <SelectItem value="1000000-4999999">$1,000,000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Net Worth Range *</label>
                      <Select
                        value={`${formData.totalNetWorthMin}-${formData.totalNetWorthMax}`}
                        onValueChange={(value) => {
                          const [min, max] = value.split('-');
                          handleInputChange('totalNetWorthMin', min);
                          handleInputChange('totalNetWorthMax', max);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25000-49999">$25,000 - $49,999</SelectItem>
                          <SelectItem value="50000-99999">$50,000 - $99,999</SelectItem>
                          <SelectItem value="100000-199999">$100,000 - $199,999</SelectItem>
                          <SelectItem value="200000-499999">$200,000 - $499,999</SelectItem>
                          <SelectItem value="500000-999999">$500,000 - $999,999</SelectItem>
                          <SelectItem value="1000000-4999999">$1,000,000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Investment Profile */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Investment Profile</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Investment Experience *</label>
                      <Select
                        value={formData.investmentExperience}
                        onValueChange={(value) => handleInputChange('investmentExperience', value)}
                      >
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
                      <label className="text-sm font-medium">Risk Tolerance *</label>
                      <Select
                        value={formData.riskTolerance}
                        onValueChange={(value) => handleInputChange('riskTolerance', value)}
                      >
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
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Investment Objective *</label>
                    <Select
                      value={formData.investmentObjective}
                      onValueChange={(value) => handleInputChange('investmentObjective', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="growth">Growth</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="capital_preservation">Capital Preservation</SelectItem>
                        <SelectItem value="speculation">Speculation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Privacy Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Privacy & Sharing</h3>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="share_trades"
                        checked={formData.shareTrades}
                        onCheckedChange={(checked) => handleInputChange('shareTrades', checked as boolean)}
                      />
                      <div className="space-y-1">
                        <label htmlFor="share_trades" className="text-sm font-medium cursor-pointer">
                          Share my trades for copy trading
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Allow other users to see and copy your trades. You can change this later.
                        </p>
                      </div>
                    </div>

                    {formData.shareTrades && (
                      <div className="flex items-start space-x-3 ml-6">
                        <Checkbox
                          id="show_asset_amounts"
                          checked={formData.showAssetAmounts}
                          onCheckedChange={(checked) => handleInputChange('showAssetAmounts', checked as boolean)}
                        />
                        <div className="space-y-1">
                          <label htmlFor="show_asset_amounts" className="text-sm font-medium cursor-pointer">
                            Show my portfolio values
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Display your actual portfolio amounts. If disabled, only percentages are visible.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Regulatory Disclosures */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Regulatory Disclosures</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="is_control_person"
                        checked={formData.isControlPerson}
                        onCheckedChange={(checked) => handleInputChange('isControlPerson', checked as boolean)}
                      />
                      <div className="space-y-1">
                        <label htmlFor="is_control_person" className="text-sm font-medium cursor-pointer">
                          I am a control person of a publicly traded company
                        </label>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="is_affiliated_exchange_or_finra"
                        checked={formData.isAffiliatedExchangeOrFinra}
                        onCheckedChange={(checked) => handleInputChange('isAffiliatedExchangeOrFinra', checked as boolean)}
                      />
                      <div className="space-y-1">
                        <label htmlFor="is_affiliated_exchange_or_finra" className="text-sm font-medium cursor-pointer">
                          I am affiliated with an exchange or FINRA
                        </label>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="is_politically_exposed"
                        checked={formData.isPoliticallyExposed}
                        onCheckedChange={(checked) => handleInputChange('isPoliticallyExposed', checked as boolean)}
                      />
                      <div className="space-y-1">
                        <label htmlFor="is_politically_exposed" className="text-sm font-medium cursor-pointer">
                          I am a politically exposed person
                        </label>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="immediate_family_exposed"
                        checked={formData.immediateFamilyExposed}
                        onCheckedChange={(checked) => handleInputChange('immediateFamilyExposed', checked as boolean)}
                      />
                      <div className="space-y-1">
                        <label htmlFor="immediate_family_exposed" className="text-sm font-medium cursor-pointer">
                          My immediate family is politically exposed
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Document Upload */}
            {currentStep === 5 && (
              <DocumentUpload
                documents={documents}
                onDocumentsChange={setDocuments}
                allowSkip={true}
                onSkip={() => setSkipDocuments(true)}
              />
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={loading}
                >
                  Previous
                </Button>
              )}
              
              <div className="ml-auto">
                {currentStep < 5 ? (
                  <Button
                    type="submit"
                    disabled={loading}
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading || googleLoading}
                    size="lg"
                  >
                    {loading ? 'Creating Account...' : 'Create Trading Account'}
                  </Button>
                )}
              </div>
            </div>

            {currentStep === 1 && (
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => safeNavigate('/signin')}
                  className="text-primary hover:underline"
                >
                  Sign in here
                </button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Features Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Platform Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Real-time market data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Copy trading features</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Portfolio analytics</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Leaderboard rankings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Social trading community</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                <span>Advanced trading tools</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}