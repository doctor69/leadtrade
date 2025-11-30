import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertCircle, ArrowDownToLine, ArrowUpFromLine, History, X } from 'lucide-react';
import { listTransfers, cancelTransfer, type Transfer } from '../../lib/alpaca-transfers';

interface TransferHistoryProps {
  accountId: string;
  onRefresh?: () => void;
}

export default function TransferHistory({ accountId, onRefresh }: TransferHistoryProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDirection, setFilterDirection] = useState<'all' | 'INCOMING' | 'OUTGOING'>('all');
  const [canceling, setCanceling] = useState<string | null>(null);

  useEffect(() => {
    loadTransfers();
  }, [accountId, filterDirection]);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = filterDirection !== 'all' ? { direction: filterDirection as 'INCOMING' | 'OUTGOING' } : undefined;
      const result = await listTransfers(accountId, params);

      if (result.success && result.transfers) {
        setTransfers(result.transfers);
      } else {
        // Check if error is 401 (unauthorized) - user doesn't have Alpaca account linked
        if (result.error?.includes('401') || result.error?.toLowerCase().includes('unauthorized')) {
          setError('alpaca_not_linked');
        } else {
          setError(result.error || 'Failed to load transfers');
        }
      }
    } catch (err) {
      console.error('Error loading transfers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTransfer = async (transferId: string) => {
    if (!confirm('Are you sure you want to cancel this transfer?')) return;

    try {
      setCanceling(transferId);
      setError(null);

      const result = await cancelTransfer(accountId, transferId);

      if (result.success) {
        await loadTransfers();
        onRefresh?.();
      } else {
        setError(result.error || 'Failed to cancel transfer');
      }
    } catch (err) {
      console.error('Error canceling transfer:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel transfer');
    } finally {
      setCanceling(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      queued: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      sent_to_clearing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      canceled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.pending}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(amount));
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Transfer History
            </CardTitle>
            <CardDescription>
              View and manage your transfer history
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={filterDirection}
              onValueChange={(value: 'all' | 'INCOMING' | 'OUTGOING') => setFilterDirection(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transfers</SelectItem>
                <SelectItem value="INCOMING">Deposits Only</SelectItem>
                <SelectItem value="OUTGOING">Withdrawals Only</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadTransfers} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className={`${
            error === 'alpaca_not_linked' 
              ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' 
              : 'bg-destructive/10 border-destructive'
          } border rounded-lg p-4`}>
            <div className={`flex items-center gap-2 ${
              error === 'alpaca_not_linked' 
                ? 'text-blue-700 dark:text-blue-300' 
                : 'text-destructive'
            }`}>
              <AlertCircle className="h-4 w-4" />
              <div className="flex-1">
                {error === 'alpaca_not_linked' ? (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Alpaca Account Not Linked</span>
                    <p className="text-xs opacity-90">
                      Link your Alpaca brokerage account to view transfer history and manage deposits/withdrawals.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => window.location.href = '/settings'}
                    >
                      Go to Settings
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm">{error}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {!error && transfers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transfers found. Initiate a transfer to see it here.
          </div>
        ) : !error && (
          <div className="space-y-2">
            {transfers.map((transfer) => (
              <div key={transfer.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      transfer.direction === 'INCOMING' 
                        ? 'bg-green-100 dark:bg-green-900' 
                        : 'bg-blue-100 dark:bg-blue-900'
                    }`}>
                      {transfer.direction === 'INCOMING' ? (
                        <ArrowDownToLine className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowUpFromLine className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {transfer.direction === 'INCOMING' ? 'Deposit' : 'Withdrawal'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {transfer.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-2xl font-bold mb-2">
                        {formatAmount(transfer.amount)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Created: {formatDate(transfer.created_at)}</div>
                        {transfer.updated_at && transfer.updated_at !== transfer.created_at && (
                          <div>Updated: {formatDate(transfer.updated_at)}</div>
                        )}
                        {transfer.expires_at && (
                          <div>Expires: {formatDate(transfer.expires_at)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(transfer.status)}
                    {transfer.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelTransfer(transfer.id)}
                        disabled={canceling === transfer.id}
                      >
                        {canceling === transfer.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
