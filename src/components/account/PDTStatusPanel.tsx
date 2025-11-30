import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { getAlpacaAccount, removePDTFlag, type AlpacaAccountResponse } from '../../lib/alpaca-account';

interface PDTStatusPanelProps {
  accountId: string;
  tradingMode?: 'paper' | 'live';
}

export default function PDTStatusPanel({ accountId, tradingMode = 'paper' }: PDTStatusPanelProps) {
  const [account, setAccount] = useState<AlpacaAccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleRemovePDT = async () => {
    if (!confirm('Are you sure you want to use your one-time PDT flag removal? This action cannot be undone.')) {
      return;
    }

    try {
      setRemoving(true);
      setError(null);
      setSuccess(null);

      const result = await removePDTFlag(accountId);

      if (result.success) {
        setSuccess(result.message || 'PDT flag removed successfully');
        await loadAccountStatus();
      } else {
        setError(result.error || 'Failed to remove PDT flag');
      }
    } catch (err) {
      console.error('Error removing PDT flag:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove PDT flag');
    } finally {
      setRemoving(false);
    }
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
            Error Loading PDT Status
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

  const isPDT = account.pattern_day_trader;
  const pdtRemoved = account.pdt_removed || false;
  const pdtRemovedAt = account.pdt_removed_at;
  const dayTradeCount = account.daytrade_count || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isPDT ? (
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-600" />
          )}
          Pattern Day Trader Status
        </CardTitle>
        <CardDescription>
          Manage your PDT designation and day trading restrictions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{success}</span>
            </div>
          </div>
        )}

        {/* Current Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">PDT Status</div>
              <div className="text-sm text-muted-foreground">
                {isPDT ? 'Flagged as Pattern Day Trader' : 'Not flagged as PDT'}
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isPDT 
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {isPDT ? 'PDT' : 'Clear'}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Day Trades (Rolling 5 Days)</div>
              <div className="text-sm text-muted-foreground">
                Number of day trades in the last 5 trading days
              </div>
            </div>
            <div className="text-2xl font-bold">{dayTradeCount}</div>
          </div>

          {pdtRemoved && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
              <div>
                <div className="font-medium">PDT Removal Used</div>
                <div className="text-sm text-muted-foreground">
                  {pdtRemovedAt ? `Removed on ${new Date(pdtRemovedAt).toLocaleDateString()}` : 'Previously removed'}
                </div>
              </div>
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
          )}
        </div>

        {/* Information Box */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <p className="font-medium">What is Pattern Day Trading?</p>
              <p>
                A Pattern Day Trader (PDT) is someone who executes 4 or more day trades within 5 business days. 
                PDT accounts must maintain a minimum equity of $25,000.
              </p>
              <p className="font-medium mt-3">One-Time PDT Removal</p>
              <p>
                If you're flagged as a PDT, you can request a one-time removal of the flag. This option can only 
                be used once per account lifetime.
              </p>
            </div>
          </div>
        </div>

        {/* PDT Removal Action */}
        {isPDT && !pdtRemoved && (
          <div className="border-t pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Remove PDT Flag</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You can use your one-time PDT flag removal to clear your current PDT status. 
                  This action is permanent and cannot be reversed.
                </p>
              </div>
              <Button 
                onClick={handleRemovePDT} 
                disabled={removing}
                variant="destructive"
                className="w-full"
              >
                {removing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Removing PDT Flag...
                  </>
                ) : (
                  'Use One-Time PDT Removal'
                )}
              </Button>
            </div>
          </div>
        )}

        {isPDT && pdtRemoved && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                You have already used your one-time PDT removal. To avoid PDT restrictions, 
                maintain account equity above $25,000 or limit day trades to fewer than 4 in a 5-day period.
              </span>
            </div>
          </div>
        )}

        {!isPDT && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">
                Your account is not currently flagged as a Pattern Day Trader. 
                {pdtRemoved && ' Your one-time PDT removal has been used.'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
