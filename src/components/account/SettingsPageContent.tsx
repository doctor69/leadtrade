import { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import UserSettings from '../ui/UserSettings';
import PDTStatusPanel from './PDTStatusPanel';
import KYCStatus from './KYCStatus';
import DocumentsPanel from './DocumentsPanel';
import KYCVerificationPanel from './KYCVerificationPanel';
import EditProfilePanel from './EditProfilePanel';
import { apiService } from '../../lib/apiService';

export default function SettingsPageContent() {
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

      const result = await apiService.getAccount();

      if (result.success && result.data?.id) {
        setAccountId(result.data.id);
      } else {
        // User doesn't have an Alpaca account linked yet
        setError('no_account');
      }
    } catch (err) {
      console.error('Error loading account:', err);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">Manage your trading preferences and account settings</p>
        </div>
        
        <div className="space-y-8">
          {/* User Profile & Privacy Settings */}
          <UserSettings />
          
          {/* Show Alpaca-related settings only if account is linked */}
          {error === 'no_account' ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-4">
                      <AlertCircle className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">Alpaca Account Not Linked</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      To access trading configuration, KYC status, and PDT management, you need to link your Alpaca brokerage account.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Create a new Alpaca account or link an existing one to enable full trading features.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : error ? (
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
          ) : accountId ? (
            <>
              {/* Edit Profile Information */}
              <div id="edit-profile">
                <EditProfilePanel accountId={accountId} />
              </div>

              {/* KYC Verification Status */}
              <div id="kyc-status">
                <KYCStatus accountId={accountId} />
              </div>

              {/* KYC Verification & Document Upload */}
              <div id="kyc-verification">
                <KYCVerificationPanel accountId={accountId} />
              </div>
              
              {/* PDT Status */}
              <div id="pdt-status">
                <PDTStatusPanel accountId={accountId} />
              </div>

              {/* Documents & Statements */}
              <div id="documents">
                <DocumentsPanel accountId={accountId} />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
