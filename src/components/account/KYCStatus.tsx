import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertCircle, CheckCircle, Clock, Shield, XCircle } from 'lucide-react';
import { getAlpacaAccount, type AlpacaAccountResponse } from '../../lib/alpaca-account';

interface KYCStatusProps {
  accountId: string;
  tradingMode?: 'paper' | 'live';
}

export default function KYCStatus({ accountId, tradingMode = 'paper' }: KYCStatusProps) {
  const [account, setAccount] = useState<AlpacaAccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccountStatus();
  }, [accountId]);

  const loadAccountStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getAlpacaAccount(accountId, tradingMode);

      if (result.success && result.account) {
        setAccount(result.account);
      } else {
        setError(result.error || 'Failed to load account status');
      }
    } catch (err) {
      console.error('Error loading account status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load account status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
      case 'submitted':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'rejected':
      case 'disabled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      submitted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      disabled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status.toLowerCase()] || statusColors.inactive}`}>
        {status}
      </span>
    );
  };

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

  if (!account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading KYC Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
          <Button onClick={loadAccountStatus} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isActive = account.status.toLowerCase() === 'active';
  const isPending = account.status.toLowerCase() === 'pending' || account.status.toLowerCase() === 'submitted';
  const isRejected = account.status.toLowerCase() === 'rejected' || account.status.toLowerCase() === 'disabled';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          KYC Verification Status
        </CardTitle>
        <CardDescription>
          Know Your Customer verification and account status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(account.status)}
            <div>
              <div className="font-medium">Account Status</div>
              <div className="text-sm text-muted-foreground">
                Current verification status
              </div>
            </div>
          </div>
          {getStatusBadge(account.status)}
        </div>

        {/* Crypto Status (if available) */}
        {account.crypto_status && (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(account.crypto_status)}
              <div>
                <div className="font-medium">Crypto Trading Status</div>
                <div className="text-sm text-muted-foreground">
                  Cryptocurrency trading approval
                </div>
              </div>
            </div>
            {getStatusBadge(account.crypto_status)}
          </div>
        )}

        {/* Account Restrictions */}
        <div className="space-y-2">
          <h3 className="font-medium">Account Restrictions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={`p-3 border rounded-lg ${account.trading_blocked ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm">Trading</span>
                {account.trading_blocked ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {account.trading_blocked ? 'Blocked' : 'Enabled'}
              </div>
            </div>

            <div className={`p-3 border rounded-lg ${account.transfers_blocked ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm">Transfers</span>
                {account.transfers_blocked ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {account.transfers_blocked ? 'Blocked' : 'Enabled'}
              </div>
            </div>

            <div className={`p-3 border rounded-lg ${account.account_blocked ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm">Account</span>
                {account.account_blocked ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {account.account_blocked ? 'Blocked' : 'Active'}
              </div>
            </div>

            <div className={`p-3 border rounded-lg ${account.trade_suspended_by_user ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm">User Suspension</span>
                {account.trade_suspended_by_user ? (
                  <Clock className="h-4 w-4 text-yellow-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {account.trade_suspended_by_user ? 'Suspended' : 'Not Suspended'}
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {isActive && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">
                Your account is fully verified and active. You can trade and transfer funds.
              </span>
            </div>
          </div>
        )}

        {isPending && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                Your account verification is pending. This typically takes 1-3 business days. 
                You'll receive an email once your account is approved.
              </span>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">
                Your account verification was not approved. Please contact support for more information.
              </span>
            </div>
          </div>
        )}

        {/* Account Details */}
        <div className="space-y-2 pt-4 border-t">
          <h3 className="font-medium">Account Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Account Number</div>
              <div className="font-medium font-mono">{account.account_number}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Currency</div>
              <div className="font-medium">{account.currency}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Created</div>
              <div className="font-medium">{new Date(account.created_at).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Shorting</div>
              <div className="font-medium">{account.shorting_enabled ? 'Enabled' : 'Disabled'}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
