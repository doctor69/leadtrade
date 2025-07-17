import { useEffect, useState } from 'react';

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
    
    const checkAuth = () => {
      try {
        // Only check auth status on client-side
        if (typeof window === 'undefined') {
          return false;
        }
        
        // Check for auth tokens in localStorage
        const hasAccessToken = localStorage.getItem('sb-access-token');
        const hasRefreshToken = localStorage.getItem('sb-refresh-token');
        
        return hasAccessToken && hasRefreshToken;
      } catch (error) {
        console.error('Auth check error:', error);
        return false;
      }
    };

    const isAuth = checkAuth();
    setIsAuthenticated(isAuth);
    
    if (!isAuth && typeof window !== 'undefined') {
      // Redirect to signin page with return URL
      const currentPath = window.location.pathname + window.location.search;
      const returnUrl = encodeURIComponent(currentPath);
      window.location.href = `/signin?returnUrl=${returnUrl}`;
      return;
    }
    
    setIsLoading(false);
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