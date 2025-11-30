// OAuth Authentication Handler for Google and Apple Sign-in
// Handles post-OAuth account setup including Alpaca account creation

import { createClient } from '@supabase/supabase-js';
import { createOAuthUserAccount } from './signup-service';

export interface OAuthUserData {
  email: string;
  full_name: string;
  given_name?: string;
  family_name?: string;
  provider: 'google' | 'apple';
}

export interface CompleteOAuthSetupResult {
  success: boolean;
  needsAdditionalInfo: boolean;
  error?: string;
  redirectUrl?: string;
}

/**
 * Completes OAuth user setup by creating Alpaca account and storing encrypted credentials
 */
export async function completeOAuthSetup(
  userData: OAuthUserData,
  additionalData?: {
    date_of_birth: string;
    tax_id: string;
    phone_number: string;
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
    share_trades: boolean;
    show_asset_amounts: boolean;
  }
): Promise<CompleteOAuthSetupResult> {
  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        needsAdditionalInfo: false,
        error: 'User not authenticated',
      };
    }

    // Check if user already has Alpaca account
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('alpaca_access_token')
      .eq('id', user.id)
      .single();

    if (existingProfile?.alpaca_access_token) {
      // User already has Alpaca account, redirect to dashboard
      return {
        success: true,
        needsAdditionalInfo: false,
        redirectUrl: '/leaderboard',
      };
    }

    // If additional data is not provided, we need to collect it
    if (!additionalData) {
      return {
        success: false,
        needsAdditionalInfo: true,
        error: 'Additional information required for trading account',
      };
    }

    // Use the new transactional OAuth signup service
    const result = await createOAuthUserAccount(
      userData,
      additionalData,
      'paper'
    );

    if (!result.success) {
      return {
        success: false,
        needsAdditionalInfo: false,
        error: result.error || 'Failed to create trading account',
      };
    }

    console.log('OAuth account setup completed successfully:', {
      userId: result.userId,
      alpacaAccountId: result.alpacaAccountId
    });

    return {
      success: true,
      needsAdditionalInfo: false,
      redirectUrl: '/leaderboard',
    };

  } catch (error) {
    console.error('OAuth setup error:', error);
    return {
      success: false,
      needsAdditionalInfo: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Checks if OAuth user needs additional information to complete setup
 */
export async function checkOAuthUserStatus(): Promise<{
  needsSetup: boolean;
  userData?: OAuthUserData;
}> {

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { needsSetup: false };
    }

    // Check if user signed up via OAuth
    const isOAuthUser = user.app_metadata?.provider && user.app_metadata.provider !== 'email';

    if (!isOAuthUser) {
      return { needsSetup: false };
    }

    // Check if user has completed Alpaca account setup
    const { data: profile } = await supabase
      .from('profiles')
      .select('alpaca_access_token')
      .eq('id', user.id)
      .single();

    const needsSetup = !profile?.alpaca_access_token;

    if (needsSetup) {
      return {
        needsSetup: true,
        userData: {
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
          given_name: user.user_metadata?.given_name,
          family_name: user.user_metadata?.family_name,
          provider: user.app_metadata?.provider as 'google' | 'apple',
        },
      };
    }

    return { needsSetup: false };

  } catch (error) {
    console.error('Error checking OAuth user status:', error);
    return { needsSetup: false };
  }
}