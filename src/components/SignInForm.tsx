import { useState, useEffect } from 'react';
import { checkOAuthUserStatus } from '@/lib/oauth-handler';
import OAuthSetupForm from '@/components/ui/trade/OAuthSetupForm';
import SupabaseSignInForm from '@/components/SupabaseSignInForm';

interface SignInFormProps {
  returnUrl?: string;
}

export default function SignInForm({ returnUrl = '/dashboard' }: SignInFormProps) {
  const [oauthSetupData, setOauthSetupData] = useState<any>(null);
  const [showOauthSetup, setShowOauthSetup] = useState(false);

  // Check if OAuth user needs additional setup
  useEffect(() => {
    const checkOAuthStatus = async () => {
      try {
        const status = await checkOAuthUserStatus();
        if (status.needsSetup && status.userData) {
          setOauthSetupData(status.userData);
          setShowOauthSetup(true);
        }
      } catch (error) {
        console.error('Error checking OAuth status:', error);
      }
    };

    checkOAuthStatus();
  }, []);

  // Show OAuth setup form if needed
  if (showOauthSetup && oauthSetupData) {
    return (
      <OAuthSetupForm 
        userData={oauthSetupData} 
        onComplete={() => {
          setShowOauthSetup(false);
          window.location.href = returnUrl;
        }} 
      />
    );
  }

  // Use Supabase sign in form
  return <SupabaseSignInForm returnUrl={returnUrl} />;
}