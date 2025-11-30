import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AlertCircle, Wallet, Plus, DollarSign, Info } from 'lucide-react';
import {
  listFundingWallets,
  createFundingWallet,
  getPaymentInstructions,
  type FundingWallet,
  type PaymentInstructions
} from '../../lib/alpaca-funding-wallets';

interface FundingWalletManagerProps {
  accountId: string;
  tradingMode?: 'paper' | 'live';
}

export default function FundingWalletManager({ accountId, tradingMode = 'paper' }: FundingWalletManagerProps) {
  const [wallets, setWallets] = useState<FundingWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newCurrency, setNewCurrency] = useState('USD');
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [paymentInstructions, setPaymentInstructions] = useState<PaymentInstructions | null>(null);
  const [loadingInstructions, setLoadingInstructions] = useState(false);

  useEffect(() => {
    loadWallets();
  }, [accountId]);

  const loadWallets = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await listFundingWallets(accountId, undefined, tradingMode);
      setWallets(result);
    } catch (err) {
      console.error('Error loading funding wallets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load funding wallets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    try {
      setError(null);
      await createFundingWallet(accountId, { currency: newCurrency }, tradingMode);
      setShowAddWallet(false);
      setNewCurrency('USD');
      await loadWallets();
    } catch (err) {
      console.error('Error creating funding wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to create funding wallet');
    }
  };

  const handleViewInstructions = async (walletId: string) => {
    try {
      setLoadingInstructions(true);
      setError(null);
      setSelectedWallet(walletId);

      const instructions = await getPaymentInstructions(accountId, walletId, tradingMode);
      setPaymentInstructions(instructions);
    } catch (err) {
      console.error('Error loading payment instructions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payment instructions');
      setSelectedWallet(null);
    } finally {
      setLoadingInstructions(false);
    }
  };

  const formatBalance = (balance: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(parseFloat(balance));
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.pending}`}>
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Funding Wallets
              </CardTitle>
              <CardDescription>
                Manage multi-currency funding wallets
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddWallet(!showAddWallet)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Wallet
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddWallet && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                  placeholder="USD"
                  maxLength={3}
                />
                <p className="text-sm text-muted-foreground">
                  Enter 3-letter ISO currency code (e.g., USD, EUR, GBP)
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateWallet}>Create Wallet</Button>
                <Button variant="outline" onClick={() => setShowAddWallet(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {wallets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No funding wallets found. Create one to enable multi-currency funding.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallets.map((wallet) => (
                <div key={wallet.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium text-lg">{wallet.currency}</span>
                    </div>
                    {getStatusBadge(wallet.status)}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance:</span>
                      <span className="font-medium">{formatBalance(wallet.balance, wallet.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Available:</span>
                      <span className="font-medium">{formatBalance(wallet.available_balance, wallet.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pending:</span>
                      <span className="font-medium">{formatBalance(wallet.pending_balance, wallet.currency)}</span>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleViewInstructions(wallet.id)}
                    disabled={loadingInstructions && selectedWallet === wallet.id}
                  >
                    {loadingInstructions && selectedWallet === wallet.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <>
                        <Info className="h-4 w-4 mr-2" />
                        Payment Instructions
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Instructions */}
      {paymentInstructions && selectedWallet && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Instructions - {paymentInstructions.currency}</CardTitle>
            <CardDescription>
              Use these details to deposit funds into your wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Priority Transfer */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                  Priority
                </span>
                Same-Day Transfer
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Bank Name</div>
                  <div className="font-medium">{paymentInstructions.priority.bank_name}</div>
                </div>
                {paymentInstructions.priority.account_number && (
                  <div>
                    <div className="text-muted-foreground">Account Number</div>
                    <div className="font-medium font-mono">{paymentInstructions.priority.account_number}</div>
                  </div>
                )}
                {paymentInstructions.priority.routing_number && (
                  <div>
                    <div className="text-muted-foreground">Routing Number</div>
                    <div className="font-medium font-mono">{paymentInstructions.priority.routing_number}</div>
                  </div>
                )}
                {paymentInstructions.priority.swift_code && (
                  <div>
                    <div className="text-muted-foreground">SWIFT Code</div>
                    <div className="font-medium font-mono">{paymentInstructions.priority.swift_code}</div>
                  </div>
                )}
                {paymentInstructions.priority.iban && (
                  <div>
                    <div className="text-muted-foreground">IBAN</div>
                    <div className="font-medium font-mono">{paymentInstructions.priority.iban}</div>
                  </div>
                )}
                <div className="md:col-span-2">
                  <div className="text-muted-foreground">Reference</div>
                  <div className="font-medium font-mono">{paymentInstructions.priority.reference}</div>
                </div>
              </div>
            </div>

            {/* Regular Transfer */}
            <div className="space-y-3 pt-6 border-t">
              <h3 className="font-medium flex items-center gap-2">
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded text-xs">
                  Regular
                </span>
                Standard Transfer (1-3 Days)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Bank Name</div>
                  <div className="font-medium">{paymentInstructions.regular.bank_name}</div>
                </div>
                {paymentInstructions.regular.account_number && (
                  <div>
                    <div className="text-muted-foreground">Account Number</div>
                    <div className="font-medium font-mono">{paymentInstructions.regular.account_number}</div>
                  </div>
                )}
                {paymentInstructions.regular.routing_number && (
                  <div>
                    <div className="text-muted-foreground">Routing Number</div>
                    <div className="font-medium font-mono">{paymentInstructions.regular.routing_number}</div>
                  </div>
                )}
                {paymentInstructions.regular.swift_code && (
                  <div>
                    <div className="text-muted-foreground">SWIFT Code</div>
                    <div className="font-medium font-mono">{paymentInstructions.regular.swift_code}</div>
                  </div>
                )}
                {paymentInstructions.regular.iban && (
                  <div>
                    <div className="text-muted-foreground">IBAN</div>
                    <div className="font-medium font-mono">{paymentInstructions.regular.iban}</div>
                  </div>
                )}
                <div className="md:col-span-2">
                  <div className="text-muted-foreground">Reference</div>
                  <div className="font-medium font-mono">{paymentInstructions.regular.reference}</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Important:</strong> Always include the reference number in your transfer to ensure 
                funds are credited to the correct wallet.
              </p>
            </div>

            <Button variant="outline" onClick={() => setSelectedWallet(null)}>
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
