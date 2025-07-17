import { useState, useEffect } from 'react';
import RealTimeMarketData from './RealTimeMarketData';
import AccountPositions from './AccountPositions';

export default function SmartMarketData() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if user is logged in by checking for auth cookies
    const checkLoginStatus = () => {
      const accessToken = document.cookie.includes('sb-access-token');
      setIsLoggedIn(accessToken);
    };
    
    checkLoginStatus();
    
    // Listen for storage changes to update login status
    const handleStorageChange = () => {
      checkLoginStatus();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check on focus in case cookies changed in another tab
    window.addEventListener('focus', checkLoginStatus);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', checkLoginStatus);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {isLoggedIn ? (
        <AccountPositions />
      ) : (
        <RealTimeMarketData />
      )}
    </div>
  );
}