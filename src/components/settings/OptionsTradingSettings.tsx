import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, TrendingUp, Info } from 'lucide-react';
import { apiService } from '@/lib/apiService';
import { edgeFunctionClient } from '@/lib/edgeFunctionClient';

interface OptionsApprovalStatus {
  enabled: boolean;
  approvalLevel: number;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_REQUESTED' | null;
}

export default function OptionsTradingSettings() {
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [status, setStatus] = useState<OptionsApprovalStatus>({
    enabled: false,
    approvalLevel: 0,
    status: null
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    fetchOptionsStatus();
  }, []);

  const fetchOptionsStatus = async () => {
    try {
      setLoading(true);
      const result = await apiService.getAccount();
      
      if (result.success && result.data) {
        // Check if options are enabled by looking at admin_configurations
        const maxLevel = (result.data as any).admin_configurations?.max_options_trading_level || 0;
        
        setStatus({
          enabled: maxLevel > 0,
          approvalLevel: maxLevel,
          status: maxLevel > 0 ? 'APPROVED' : 'NOT_REQUESTED'
        });
      }
    } catch (err) {
      console.error('Failed to fetch options status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableOptions = async () => {
    setEnabling(true);
    setError('');
    setSuccess('');

    try {
      // Step 1: PATCH account with required options fields
      setSuccess('Step 1/2: Updating account information...');
      
      // Get account ID from current account data (use cached data to avoid delays)
      const accountResult = await apiService.getAccount(false); // Don't force refresh
      if (!accountResult.success || !accountResult.data) {
        throw new Error('Failed to get account information');
      }

      const accountId = accountResult.data.id;
      
      const updatePayload = {
        identity: {
          annual_income_min: "50000",
          annual_income_max: "100000",
          total_net_worth_min: "50000",
          total_net_worth_max: "100000",
          liquid_net_worth_min: "25000",
          liquid_net_worth_max: "50000",
          liquidity_needs: "somewhat_important",
          investment_experience_with_stocks: "over_5_years",
          investment_experience_with_options: "over_5_years",
          risk_tolerance: "moderate",
          investment_objective: "growth",
          investment_time_horizon: "6_to_10_years",
          marital_status: "SINGLE",
          number_of_dependents: 0
        }
      };

      const patchResponse = await edgeFunctionClient.patch(
        `alpaca-account/${accountId}`,
        updatePayload
      );

      if (!patchResponse.success) {
        throw new Error(patchResponse.error?.message || 'Failed to update account information');
      }

      // Step 2: Request options approval
      setSuccess('Step 2/2: Requesting options approval...');
      
      const approvalResult = await apiService.requestOptionsApproval(2);
      
      if (!approvalResult.success) {
        throw new Error(approvalResult.error || 'Failed to request options approval');
      }

      setSuccess('✓ Options trading has been enabled! You can now trade options.');
      
      // Refresh status
      setTimeout(() => fetchOptionsStatus(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable options trading');
    } finally {
      setEnabling(false);
    }
  };

  const handleDisableOptions = async () => {
    setEnabling(true);
    setError('');
    setSuccess('');

    try {
      // To disable options, we need to set max_options_trading_level to 0
      // This is done via the trading account configuration endpoint
      const accountResult = await apiService.getAccount();
      if (!accountResult.success || !accountResult.data) {
        throw new Error('Failed to get account information');
      }

      const accountId = accountResult.data.id;

      // Update trading account configuration to set max_options_trading_level to 0
      const configResponse = await edgeFunctionClient.patch(
        `alpaca-account/${accountId}/account_configurations`,
        { max_options_trading_level: 0 }
      );
      
      if (!configResponse.success) {
        throw new Error(configResponse.error?.message || 'Failed to disable options trading');
      }

      setSuccess('Options trading has been disabled.');
      
      // Refresh status
      await fetchOptionsStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable options trading');
    } finally {
      setEnabling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Options Trading
          </CardTitle>
          <CardDescription>Loading options trading status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Options Trading
        </CardTitle>
        <CardDescription>
          Enable or disable options trading on your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label className="text-base font-medium">Options Trading Status</Label>
            <p className="text-sm text-muted-foreground">
              {status.enabled 
                ? `Enabled - Level ${status.approvalLevel}` 
                : 'Not enabled'}
            </p>
          </div>
          <Badge variant={status.enabled ? 'default' : 'secondary'}>
            {status.enabled ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Enabled</>
            ) : (
              'Disabled'
            )}
          </Badge>
        </div>

        {/* Information Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>About Options Trading:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>Level 1:</strong> Covered calls and cash-secured puts</li>
              <li>• <strong>Level 2:</strong> Level 1 + Buy calls and puts</li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              <strong>Note:</strong> Options trading must be enabled when the account is created. 
              Existing accounts cannot enable options through the API. If you need options trading, 
              please create a new account or contact Alpaca support.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Options trading involves significant risk. Please read the{' '}
              <a 
                href="https://www.theocc.com/company-information/documents-and-archives/options-disclosure-document" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline"
              >
                Options Disclosure Document
              </a>
              {' '}before trading.
            </p>
          </AlertDescription>
        </Alert>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600 dark:text-green-400">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Enable/Disable Button */}
        <div className="flex items-center justify-between">
          {!status.enabled ? (
            <Button 
              onClick={handleEnableOptions} 
              disabled={enabling}
              className="w-full"
            >
              {enabling ? 'Enabling...' : 'Enable Options Trading (Level 2)'}
            </Button>
          ) : (
            <Button 
              onClick={handleDisableOptions} 
              disabled={enabling}
              variant="outline"
              className="w-full"
            >
              {enabling ? 'Disabling...' : 'Disable Options Trading'}
            </Button>
          )}
        </div>

        {/* Additional Info */}
        {status.enabled && (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>✓ You can now trade options contracts</p>
            <p>✓ Options tab is available in the trading interface</p>
            <p>✓ You can buy calls and puts (Level 2)</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
