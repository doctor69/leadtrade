// OAuth Authentication Handler for Google and Apple Sign-in
// Handles post-OAuth account setup including Alpaca account creation

import { createClient } from '@supabase/supabase-js';
import { createAlpacaAccount, type AlpacaAccountData } from './alpaca-account';
import { encryptToken, hashUserData } from './encryption';

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

    // Parse names from full_name if individual names not provided
    const nameParts = userData.full_name.split(' ');
    const given_name = userData.given_name || nameParts[0] || '';
    const family_name = userData.family_name || nameParts.slice(1).join(' ') || '';

    // Create Alpaca account with OAuth user data + additional info
    const alpacaAccountData: AlpacaAccountData = {
      given_name,
      family_name,
      date_of_birth: additionalData.date_of_birth,
      tax_id: additionalData.tax_id,
      tax_id_type: 'USA_SSN',
      phone_number: additionalData.phone_number,
      email_address: userData.email,
      street_address: [additionalData.street_address],
      city: additionalData.city,
      state: additionalData.state,
      postal_code: additionalData.postal_code,
      country: 'USA',
      annual_income_min: '25000',
      annual_income_max: '50000',
      total_net_worth_min: '25000',
      total_net_worth_max: '50000',
      liquid_net_worth_min: '10000',
      liquid_net_worth_max: '25000',
      investment_experience_with_stocks: 'limited',
      investment_objective: 'growth',
      risk_tolerance: 'moderate',
    };

    const alpacaResult = await createAlpacaAccount(alpacaAccountData, 'paper');

    if (!alpacaResult.success) {
      return {
        success: false,
        needsAdditionalInfo: false,
        error: `Failed to create trading account: ${alpacaResult.error}`,
      };
    }

    // Store encrypted Alpaca credentials
    if (alpacaResult.account && alpacaResult.accountId) {
      // Create encryption key from user email (since we don't have password for OAuth users)
      const encryptionKey = await hashUserData(userData.email + user.id);

      // Store placeholder tokens (in production, these would come from Alpaca)
      const placeholderAccessToken = `alpaca_access_${alpacaResult.accountId}`;
      const placeholderRefreshToken = `alpaca_refresh_${alpacaResult.accountId}`;

      const encryptedAccessToken = await encryptToken(placeholderAccessToken, encryptionKey);
      const encryptedRefreshToken = await encryptToken(placeholderRefreshToken, encryptionKey);

      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          alpaca_access_token: encryptedAccessToken,
          alpaca_refresh_token: encryptedRefreshToken,
          is_paper_trading: true,
          share_trades: additionalData.share_trades,
          show_asset_amounts: additionalData.show_asset_amounts,
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
      }

      // Store additional user details
      const { error: detailsError } = await supabase
        .from('user_details')
        .insert({
          user_id: user.id,
          email: userData.email,
          password_hash: await hashUserData(user.id), // Use user ID as password hash for OAuth users
          given_name,
          family_name,
          date_of_birth: additionalData.date_of_birth,
          tax_id: additionalData.tax_id,
          tax_id_type: 'USA_SSN',
          phone_number: additionalData.phone_number,
          street_address: [additionalData.street_address],
          city: additionalData.city,
          state: additionalData.state,
          postal_code: additionalData.postal_code,
          investment_experience_with_stocks: 'limited',
          investment_objective: 'growth',
          risk_tolerance: 'moderate',
        });

      if (detailsError) {
        console.error('Failed to store user details:', detailsError);
      }

      // Store Alpaca account info
      const { error: alpacaError } = await supabase
        .from('alpaca_accounts')
        .insert({
          user_id: user.id,
          alpaca_account_id: alpacaResult.accountId,
          alpaca_account_number: alpacaResult.account.account_number,
          alpaca_account_status: alpacaResult.account.status,
          account_type: 'paper',
        });

      if (alpacaError) {
        console.error('Failed to store Alpaca account info:', alpacaError);
      }
    }

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