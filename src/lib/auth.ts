import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name,
      username: user.user_metadata?.username,
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

export function checkAuthStatus(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for auth cookies
  const hasAccessToken = document.cookie.includes('sb-access-token');
  const hasRefreshToken = document.cookie.includes('sb-refresh-token');
  
  return hasAccessToken && hasRefreshToken;
}