/**
 * Portfolio Transfer History Wrapper
 * 
 * Fetches user account ID and displays transfer history
 * Only shows if user has linked Alpaca account to prevent 401 errors
 * 
 * Requirements: 21.3
 */

import { useState, useEffect } from 'react';
import TransferHistory from '@/components/account/TransferHistory';
import { Card, CardContent } from '@/components/ui/card';
import { getAuthenticatedUser } from '@/lib/auth';
import apiService from '@/lib/apiService';

export default function PortfolioTransferHistory() {
  const [accountId, setAccountId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [hasAlpacaAccount, setHasAlpacaAccount] = useState(false);

  useEffect(() => {
    const checkAlpacaAccount = async () => {
      try {
        const user = await getAuthenticatedUser();
        if (!user?.id) {
          setLoading(false);
          return;
        }

        // Check if user has an Alpaca account by trying to fetch account data
        const accountResult = await apiService.getAccount();
        
        if (accountResult.success && accountResult.data?.id) {
          // User has a linked Alpaca account
          setAccountId(accountResult.data.id);
          setHasAlpacaAccount(true);
        } else {
          // User doesn't have Alpaca account or it's not accessible
          setHasAlpacaAccount(false);
        }
      } catch (error) {
        console.error('Error checking Alpaca account:', error);
        setHasAlpacaAccount(false);
      } finally {
        setLoading(false);
      }
    };

    checkAlpacaAccount();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't render anything if user doesn't have Alpaca account
  // This prevents 401 errors from blocking dashboard rendering
  if (!hasAlpacaAccount || !accountId) {
    return null;
  }

  return <TransferHistory accountId={accountId} />;
}
