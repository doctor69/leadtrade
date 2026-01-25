import { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import ACHTransferForm from './ACHTransferForm';
import TransferHistory from './TransferHistory';
import BankLinking from './BankLinking';
import QuickSandboxFunding from './QuickSandboxFunding';
import { apiService } from '../../lib/apiService';

export default function FundingPageContent() {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccountId();
  }, []);

  const loadAccountId = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Loading account ID...');
      const result = await apiService.getAccount();
      console.log('📊 Account result:', result);

      if (result.success && result.data?.id) {
        console.log('✅ Account ID found:', result.data.id);
        setAccountId(result.data.id);
      } else {
        console.log('❌ No account found:', result.error);
        // User doesn't have an Alpaca account linked
        setError('no_account');
      }
    } catch (err) {
      console.error('💥 Error loading account:', err);
      setError(err instanceof Error ? err.message : 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Loading account information...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error === 'no_account') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Account Funding</h1>
            <p className="text-muted-foreground">Deposit and withdraw funds using ACH, wire transfers, or multi-currency wallets</p>
          </div>

          <Card>
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-4">
                    <AlertCircle className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">Alpaca Account Required</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    To manage funding and transfers, you need to link your Alpaca brokerage account first.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button 
                    size="lg"
                    onClick={() => window.location.href = '/settings'}
                  >
                    Go to Settings to Link Account
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    You can create a new Alpaca account or link an existing one from the settings page.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Account Funding</h1>
            <p className="text-muted-foreground">Deposit and withdraw funds using ACH, wire transfers, or multi-currency wallets</p>
          </div>

          <Card>
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="rounded-full bg-red-100 dark:bg-red-900 p-4">
                    <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">Error Loading Account</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {error}
                  </p>
                </div>

                <Button 
                  variant="outline"
                  onClick={loadAccountId}
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!accountId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <p className="text-muted-foreground">Unable to load account information</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Funding</h1>
          <p className="text-muted-foreground">Manage your trading account funds</p>
        </div>
        
        <div className="space-y-8">
          {/* Quick Sandbox Funding - Instant test funds */}
          <div id="quick-funding">
            <QuickSandboxFunding 
              accountId={accountId} 
              onFundingComplete={() => {
                // Reload the page to show updated balance
                window.location.reload();
              }}
            />
          </div>
          
          {/* Bank Linking - Add bank accounts */}
          <div id="bank-linking">
            <BankLinking accountId={accountId} />
          </div>
          
          {/* ACH Transfer - Deposit/Withdraw funds */}
          <div id="ach-transfer">
            <ACHTransferForm accountId={accountId} />
          </div>
          
          {/* Transfer History */}
          <div id="transfer-history">
            <TransferHistory accountId={accountId} />
          </div>
        </div>
      </div>
    </div>
  );
}
