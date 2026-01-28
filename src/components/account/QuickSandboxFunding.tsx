import { useState, useEffect } from 'react';
import { DollarSign, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { edgeFunctionClient } from '../../lib/edgeFunctionClient';
import { getAppTradingMode } from '../../lib/appSettings';

interface QuickSandboxFundingProps {
  accountId: string;
  onFundingComplete?: () => void;
}

export default function QuickSandboxFunding({ accountId, onFundingComplete }: QuickSandboxFundingProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSandbox, setIsSandbox] = useState(true);
  const [checkingMode, setCheckingMode] = useState(true);

  useEffect(() => {
    const checkMode = async () => {
      const mode = await getAppTradingMode();
      setIsSandbox(mode === 'paper');
      setCheckingMode(false);
    };
    checkMode();
  }, []);

  const addFunds = async (amount: number) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      console.log(`💰 Adding $${amount} to sandbox account ${accountId}`);

      // Use Journals API for instant funding (proper way)
      // This requires a firm sweep account ID
      // For now, we'll use a placeholder and show instructions if it fails
      const FIRM_SWEEP_ACCOUNT = import.meta.env.PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX || 'FIRM_ACCOUNT_NEEDED';

      if (FIRM_SWEEP_ACCOUNT === 'FIRM_ACCOUNT_NEEDED') {
        setError('Firm sweep account not configured. Please see instructions below.');
        return;
      }

      // Use journals API for instant funding
      const response = await edgeFunctionClient.post('alpaca-journals', {
        entry_type: 'JNLC',  // Cash journal
        from_account: FIRM_SWEEP_ACCOUNT,  // Your firm's sweep account
        to_account: accountId,  // User's account
        amount: amount.toString(),
        description: `Instant sandbox funding: $${amount}`
      });

      if (response.success) {
        console.log('✅ Funds added successfully:', response.data);
        setSuccess(true);
        
        // Reload after a short delay to show updated balance
        setTimeout(() => {
          onFundingComplete?.();
        }, 1500);
      } else {
        console.error('❌ Failed to add funds:', response.error);
        const errorMsg = response.error?.message || 'Failed to add funds';
        setError(errorMsg);
      }
    } catch (err) {
      console.error('💥 Error adding funds:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Don't show in live mode
  if (checkingMode) {
    return null;
  }

  if (!isSandbox) {
    return null;
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Instant Sandbox Funding
        </CardTitle>
        <CardDescription>
          Add funds instantly to your sandbox account for testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100 rounded-md">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-sm">
            <p className="font-medium">Setup Required: Firm Sweep Account</p>
            <p>
              To enable instant funding, you need to configure your Alpaca Firm Sweep Account ID:
            </p>
            <ol className="list-decimal ml-4 space-y-1 text-xs">
              <li>Log into Alpaca Broker Dashboard</li>
              <li>Go to "Firm Accounts" section</li>
              <li>Find your "Sweep Account" and copy the ID</li>
              <li>Add to .env: <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX=your_id</code></li>
              <li>Restart your dev server</li>
            </ol>
            <p className="text-xs pt-2">
              See <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">ALPACA_FIRM_ACCOUNTS.md</code> for detailed instructions.
            </p>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Funds added successfully! Reloading...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-md">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[1000, 5000, 10000, 25000, 50000, 100000].map((amount) => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              onClick={() => addFunds(amount)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `$${amount.toLocaleString()}`
              )}
            </Button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Uses Journals API to transfer funds from your firm's sweep account to user accounts instantly. 
          This is the proper way to implement instant funding in both sandbox and live environments.
        </p>
      </CardContent>
    </Card>
  );
}
