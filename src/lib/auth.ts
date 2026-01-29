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
      isPaperTrading: profile?.trading_mode === 'paper',
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
    // Use consistent method: email + userId (we'll update signup to match)
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
      
      // Clear invalid tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb-access-token');
        localStorage.removeItem('sb-refresh-token');
      }
      
      return false;
    }

    // Update stored tokens with expiration tracking
    if (typeof window !== 'undefined') {
      localStorage.setItem('sb-access-token', data.session.access_token);
      localStorage.setItem('sb-refresh-token', data.session.refresh_token);
      localStorage.setItem('sb-token-expires-at', data.session.expires_at?.toString() || '');
      localStorage.setItem('sb-token-refreshed-at', Date.now().toString());
    }

    return true;
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Clear potentially corrupted tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('sb-token-expires-at');
      localStorage.removeItem('sb-token-refreshed-at');
    }
    
    return false;
  }
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
    
    // Clear all stored tokens and session data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('sb-token-expires-at');
      localStorage.removeItem('sb-token-refreshed-at');
      
      // Clear any cached user data
      sessionStorage.clear();
      
      // Redirect to home page
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Sign out error:', error);
    
    // Even if signOut fails, clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('sb-token-expires-at');
      localStorage.removeItem('sb-token-refreshed-at');
      sessionStorage.clear();
    }
  }
}

export function checkAuthStatus(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check for auth tokens in localStorage
    const hasAccessToken = localStorage.getItem('sb-access-token');
    const hasRefreshToken = localStorage.getItem('sb-refresh-token');
    const expiresAt = localStorage.getItem('sb-token-expires-at');
    
    if (!hasAccessToken || !hasRefreshToken) {
      return false;
    }
    
    // Check if token is expired
    if (expiresAt) {
      const expirationTime = parseInt(expiresAt) * 1000; // Convert to milliseconds
      const now = Date.now();
      
      if (now >= expirationTime) {
        // Token is expired, clear storage
        localStorage.removeItem('sb-access-token');
        localStorage.removeItem('sb-refresh-token');
        localStorage.removeItem('sb-token-expires-at');
        localStorage.removeItem('sb-token-refreshed-at');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    // localStorage not available (e.g., in tests)
    return false;
  }
}

export function isTokenNearExpiry(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const expiresAt = localStorage.getItem('sb-token-expires-at');
    if (!expiresAt) return false;
    
    const expirationTime = parseInt(expiresAt) * 1000;
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    
    return (expirationTime - now) < fifteenMinutes;
  } catch (error) {
    return false;
  }
}

export async function validateAndRefreshToken(): Promise<boolean> {
  if (!checkAuthStatus()) {
    return false;
  }
  
  if (isTokenNearExpiry()) {
    return await refreshAuthTokens();
  }
  
  return true;
}

export function clearAuthData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sb-access-token');
    localStorage.removeItem('sb-refresh-token');
    localStorage.removeItem('sb-token-expires-at');
    localStorage.removeItem('sb-token-refreshed-at');
    sessionStorage.clear();
  }
}

export async function handleAuthStateChange(): Promise<void> {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event, session?.user?.id);
    
    if (event === 'SIGNED_IN' && session) {
      // Store tokens with expiration tracking
      if (typeof window !== 'undefined') {
        localStorage.setItem('sb-access-token', session.access_token);
        localStorage.setItem('sb-refresh-token', session.refresh_token);
        localStorage.setItem('sb-token-expires-at', session.expires_at?.toString() || '');
        localStorage.setItem('sb-token-refreshed-at', Date.now().toString());
      }
      
      // Sync Alpaca account status on login
      try {
        const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
        console.log('Syncing Alpaca accounts for user:', session.user.id);
        console.log('Supabase URL:', supabaseUrl);
        
        if (!supabaseUrl) {
          console.error('PUBLIC_SUPABASE_URL not configured');
          return;
        }
        
        const response = await fetch(`${supabaseUrl}/functions/v1/sync-alpaca-accounts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: session.user.id })
        });
        
        console.log('Sync response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Alpaca account sync completed:', result);
        } else {
          const errorText = await response.text();
          console.warn('Failed to sync Alpaca accounts:', response.status, errorText);
        }
      } catch (error) {
        console.error('Error syncing Alpaca accounts:', error);
        // Don't block login if sync fails
      }
    } else if (event === 'SIGNED_OUT') {
      // Clear all tokens and session data
      clearAuthData();
    } else if (event === 'TOKEN_REFRESHED' && session) {
      // Update tokens with new expiration
      if (typeof window !== 'undefined') {
        localStorage.setItem('sb-access-token', session.access_token);
        localStorage.setItem('sb-refresh-token', session.refresh_token);
        localStorage.setItem('sb-token-expires-at', session.expires_at?.toString() || '');
        localStorage.setItem('sb-token-refreshed-at', Date.now().toString());
      }
    }
  });
}