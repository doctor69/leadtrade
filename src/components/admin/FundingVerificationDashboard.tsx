/**
 * Funding Verification Dashboard
 * 
 * Admin dashboard for verifying funding system functionality
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  DollarSign,
  Activity
} from 'lucide-react';
import { listTransfers, type Transfer } from '../../lib/alpaca-transfers';
import { listACHRelationships, type ACHRelationship } from '../../lib/alpaca-ach-relationships';
import { listBankRelationships, type BankRelationship } from '../../lib/alpaca-bank-relationships';

interface FundingStats {
  totalTransfers: number;
  pendingTransfers: number;
  approvedTransfers: number;
  rejectedTransfers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  successRate: number;
  achRelationships: number;
  bankRelationships: number;
}

interface FundingVerificationDashboardProps {
  accountId: string;
  tradingMode?: 'paper' | 'live';
}

export default function FundingVerificationDashboard({ 
  accountId, 
  tradingMode = 'paper' 
}: FundingVerificationDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FundingStats | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [achRelationships, setAchRelationships] = useState<ACHRelationship[]>([]);
  const [bankRelationships, setBankRelationships] = useState<BankRelationship[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadFundingData();
  }, [accountId, tradingMode]);

  const loadFundingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all funding-related data in parallel
      const [transfersResult, achResult, bankResult] = await Promise.all([
        listTransfers(accountId),
        listACHRelationships(accountId, undefined, tradingMode),
        listBankRelationships(accountId)
      ]);

      if (!transfersResult.success) {
        throw new Error(transfersResult.error || 'Failed to load transfers');
      }

      const transfersData = transfersResult.transfers || [];
      const achData = achResult.success ? (achResult.relationships || []) : [];
      const bankData = bankResult.success ? (bankResult.banks || []) : [];

      setTransfers(transfersData);
      setAchRelationships(achData);
      setBankRelationships(bankData);

      // Calculate statistics
      const pendingCount = transfersData.filter(t => t.status === 'pending').length;
      const approvedCount = transfersData.filter(t => t.status === 'approved').length;
      const rejectedCount = transfersData.filter(t => t.status === 'rejected').length;
      
      const deposits = transfersData
        .filter(t => t.direction === 'INCOMING' && t.status === 'approved')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const withdrawals = transfersData
        .filter(t => t.direction === 'OUTGOING' && t.status === 'approved')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const completedCount = approvedCount + rejectedCount;
      const successRate = completedCount > 0 ? (approvedCount / completedCount) * 100 : 0;

      setStats({
        totalTransfers: transfersData.length,
        pendingTransfers: pendingCount,
        approvedTransfers: approvedCount,
        rejectedTransfers: rejectedCount,
        totalDeposits: deposits,
        totalWithdrawals: withdrawals,
        successRate,
        achRelationships: achData.length,
        bankRelationships: bankData.length
      });

      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading funding data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load funding data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: any }> = {
      approved: { variant: 'default', icon: CheckCircle },
      pending: { variant: 'secondary', icon: Clock },
      rejected: { variant: 'destructive', icon: AlertCircle },
      queued: { variant: 'outline', icon: Clock },
      sent_to_clearing: { variant: 'secondary', icon: Activity },
      canceled: { variant: 'outline', icon: AlertCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Funding Verification Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={loadFundingData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transfers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransfers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pendingTransfers} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.approvedTransfers} approved, {stats.rejectedTransfers} rejected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Total Deposits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalDeposits)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-blue-600" />
                Total Withdrawals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.totalWithdrawals)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Relationships Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ACH Relationships</CardTitle>
            <CardDescription>
              Linked bank accounts for ACH transfers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{achRelationships.length}</div>
            {achRelationships.length > 0 ? (
              <div className="space-y-2">
                {achRelationships.slice(0, 3).map((ach) => (
                  <div key={ach.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      {ach.nickname || ach.account_owner_name}
                    </span>
                    {getStatusBadge(ach.status)}
                  </div>
                ))}
                {achRelationships.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{achRelationships.length - 3} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No ACH relationships</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bank Relationships</CardTitle>
            <CardDescription>
              Linked banks for wire transfers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{bankRelationships.length}</div>
            {bankRelationships.length > 0 ? (
              <div className="space-y-2">
                {bankRelationships.slice(0, 3).map((bank) => (
                  <div key={bank.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{bank.name}</span>
                    <Badge variant="outline">{bank.bank_code_type.toUpperCase()}</Badge>
                  </div>
                ))}
                {bankRelationships.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{bankRelationships.length - 3} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No bank relationships</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transfers */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transfers</CardTitle>
          <CardDescription>
            Latest transfer activity and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transfers found
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.slice(0, 10).map((transfer) => (
                <div 
                  key={transfer.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      transfer.direction === 'INCOMING' 
                        ? 'bg-green-100 dark:bg-green-900' 
                        : 'bg-blue-100 dark:bg-blue-900'
                    }`}>
                      {transfer.direction === 'INCOMING' ? (
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {transfer.direction === 'INCOMING' ? 'Deposit' : 'Withdrawal'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {transfer.type.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transfer.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold">
                        {formatCurrency(parseFloat(transfer.amount))}
                      </div>
                    </div>
                    {getStatusBadge(transfer.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Timeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Timeline</CardTitle>
          <CardDescription>
            Visual representation of transfer flow
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transfer data to visualize
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Distribution */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <div className="text-2xl font-bold">{stats?.pendingTransfers || 0}</div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold">{stats?.approvedTransfers || 0}</div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                  <div className="text-2xl font-bold">{stats?.rejectedTransfers || 0}</div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </div>

              {/* Transfer Type Distribution */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">Transfer Types</h4>
                <div className="grid grid-cols-3 gap-4">
                  {['ach', 'wire', 'sandbox'].map(type => {
                    const count = transfers.filter(t => t.type === type).length;
                    const percentage = transfers.length > 0 
                      ? ((count / transfers.length) * 100).toFixed(1) 
                      : '0';
                    
                    return (
                      <div key={type} className="text-center p-3 border rounded-lg">
                        <div className="text-xl font-bold">{count}</div>
                        <p className="text-sm text-muted-foreground capitalize">{type}</p>
                        <p className="text-xs text-muted-foreground mt-1">{percentage}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
