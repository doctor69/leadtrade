import { supabase } from './supabase';
import { decryptToken, hashUserData } from './encryption';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  alpacaAccountId?: string;
  isPaperTrading?: boolean;
  shareTrades?: boolean;
  showAssetAmounts?: boolean;
}

export interface AlpacaCredentials {
  accessToken: string;
  refreshToken: string;
  accountId: string;
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Get user profile with additional data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || profile?.full_name,
      username: profile?.username,
      isPaperTrading: profile?.is_paper_trading,
      shareTrades: profile?.share_trades,
      showAssetAmounts: profile?.show_asset_amounts,
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    // Redirect to signin if not authenticated
    if (typeof window !== 'undefined') {
      window.location.href = '/signin';
    }
    throw new Error('Authentication required');
  }
  
  return user;
}

export async function getAlpacaCredentials(userId: string, userEmail: string): Promise<AlpacaCredentials | null> {
  try {
    // Get encrypted tokens from user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('alpaca_access_token, alpaca_refresh_token')
      .eq('id', userId)
      .single();

    if (error || !profile?.alpaca_access_token) {
      return null;
    }

    // Get Alpaca account ID
    const { data: alpacaAccount } = await supabase
      .from('alpaca_accounts')
      .select('alpaca_account_id')
      .eq('user_id', userId)
      .single();

    if (!alpacaAccount?.alpaca_account_id) {
      return null;
    }

    // Create decryption key from user data
    const encryptionKey = await hashUserData(userEmail + userId);

    // Decrypt tokens
    const accessToken = await decryptToken(profile.alpaca_access_token, encryptionKey);
    const refreshToken = profile.alpaca_refresh_token 
      ? await decryptToken(profile.alpaca_refresh_token, encryptionKey)
      : '';

    return {
      accessToken,
      refreshToken,
      accountId: alpacaAccount.alpaca_account_id,
    };

  } catch (error) {
    console.error('Error getting Alpaca credentials:', error);
    return null;
  }
}

export async function refreshAuthTokens(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error || !data.session) {
      console.error('Token refresh failed:', error);
      return false;
    }

    // Update stored tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem('sb-access-token', data.session.access_token);
      localStorage.setItem('sb-refresh-token', data.session.refresh_token);
    }

    return true;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
    
    // Clear stored tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      
      // Redirect to home page
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

export function checkAuthStatus(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check for auth tokens in localStorage
    const hasAccessToken = localStorage.getItem('sb-access-token');
    const hasRefreshToken = localStorage.getItem('sb-refresh-token');
    
    return !!(hasAccessToken && hasRefreshToken);
  } catch (error) {
    // localStorage not available (e.g., in tests)
    return false;
  }
}

export async function handleAuthStateChange(): Promise<void> {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // Store tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('sb-access-token', session.access_token);
        localStorage.setItem('sb-refresh-token', session.refresh_token);
      }
    } else if (event === 'SIGNED_OUT') {
      // Clear tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb-access-token');
        localStorage.removeItem('sb-refresh-token');
      }
    } else if (event === 'TOKEN_REFRESHED' && session) {
      // Update tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('sb-access-token', session.access_token);
        localStorage.setItem('sb-refresh-token', session.refresh_token);
      }
    }
  });
}