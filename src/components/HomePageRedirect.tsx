import { useEffect } from 'react';
import { checkAuthStatus } from '../lib/auth';

export default function HomePageRedirect() {
  useEffect(() => {
    const checkAndRedirect = () => {
      const isAuthenticated = checkAuthStatus();
      
      if (isAuthenticated && window.location.pathname === '/') {
        window.location.href = '/dashboard';
      }
    };

    checkAndRedirect();
  }, []);

  return null;
}
