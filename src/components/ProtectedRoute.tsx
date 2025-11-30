import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { checkAuthStatus, handleAuthStateChange } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Set mounted flag to prevent hydration issues
    setIsMounted(true);
    
    // Initialize auth state change handler
    handleAuthStateChange();
    
    const checkAuth = async () => {
      try {
        // Only check auth status on client-side
        if (typeof window === 'undefined') {
          return false;
        }
        
        // Check Supabase session first
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          return false;
        }
        
        if (session) {
          console.log('Found valid Supabase session');
          // Store tokens if we have a valid session
          localStorage.setItem('sb-access-token', session.access_token);
          localStorage.setItem('sb-refresh-token', session.refresh_token);
          localStorage.setItem('sb-token-expires-at', session.expires_at?.toString() || '');
          return true;
        }
        
        // Fallback to checking stored tokens
        const tokenAuth = checkAuthStatus();
        console.log('Token auth check:', tokenAuth);
        return tokenAuth;
      } catch (error) {
        console.error('Auth check error:', error);
        return false;
      }
    };

    checkAuth().then((isAuth) => {
      console.log('ProtectedRoute auth check result:', isAuth);
      setIsAuthenticated(isAuth);
      
      if (!isAuth && typeof window !== 'undefined') {
        console.log('User not authenticated, redirecting to signin');
        // Redirect to signin page with return URL
        const currentPath = window.location.pathname + window.location.search;
        const returnUrl = encodeURIComponent(currentPath);
        window.location.href = `/signin?returnUrl=${returnUrl}`;
        return;
      }
      
      setIsLoading(false);
    });
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // This should not happen as we redirect above, but just in case
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}