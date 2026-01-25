import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SignupStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
}

interface SessionStats {
  activeSessions: number;
  totalUsers: number;
  averageSessionDuration: number;
}

interface TestAccount {
  id: string;
  email: string;
  alpaca_account_id: string;
  alpaca_account_number: string;
  purpose: string;
  created_for: string;
  funded_amount: number;
  created_at: string;
}

interface AuthLog {
  id: string;
  event_type: string;
  user_id: string;
  email: string;
  success: boolean;
  error_message?: string;
  ip_address?: string;
  timestamp: string;
}

export function AuthVerificationDashboard() {
  const [signupStats, setSignupStats] = useState<SignupStats>({
    total: 0,
    successful: 0,
    failed: 0,
    successRate: 0,
  });
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    activeSessions: 0,
    totalUsers: 0,
    averageSessionDuration: 0,
  });
  const [testAccounts, setTestAccounts] = useState<TestAccount[]>([]);
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);

      // Load signup statistics
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, created_at');

      if (!profilesError && profiles) {
        const { data: alpacaAccounts, error: alpacaError } = await supabase
          .from('alpaca_accounts')
          .select('user_id');

        const successful = alpacaAccounts?.length || 0;
        const total = profiles.length;
        const failed = total - successful;

        setSignupStats({
          total,
          successful,
          failed,
          successRate: total > 0 ? (successful / total) * 100 : 0,
        });
      }

      // Load session statistics
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

      if (!usersError && users) {
        // Count active sessions (users with recent activity)
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        const activeSessions = users.users.filter(user => {
          const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
          return lastSignIn && lastSignIn > oneHourAgo;
        }).length;

        setSessionStats({
          activeSessions,
          totalUsers: users.users.length,
          averageSessionDuration: 0, // Would need session tracking to calculate
        });
      }

      // Load test accounts
      const { data: testAccountsData, error: testAccountsError } = await supabase
        .from('test_accounts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!testAccountsError && testAccountsData) {
        setTestAccounts(testAccountsData);
      }

      // Load recent authentication logs (would need to implement logging)
      // For now, we'll show a placeholder
      setAuthLogs([]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    loadDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Authentication Verification</h2>
          <p className="text-muted-foreground">
            Monitor signup success rates, active sessions, and test accounts
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signupStats.total}</div>
            <p className="text-xs text-muted-foreground">
              All user registrations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signupStats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {signupStats.successful} successful / {signupStats.failed} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats.activeSessions}</div>
            <p className="text-xs text-muted-foreground">
              Users active in last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Accounts</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testAccounts.length}</div>
            <p className="text-xs text-muted-foreground">
              Created for testing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="test-accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="test-accounts">Test Accounts</TabsTrigger>
          <TabsTrigger value="auth-logs">Authentication Logs</TabsTrigger>
          <TabsTrigger value="session-details">Session Details</TabsTrigger>
        </TabsList>

        <TabsContent value="test-accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Accounts</CardTitle>
              <CardDescription>
                Accounts created for Alpaca consultants and internal testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No test accounts created yet
                </div>
              ) : (
                <div className="space-y-4">
                  {testAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{account.email}</p>
                          <Badge variant="outline">{account.created_for}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Alpaca Account: {account.alpaca_account_id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Account Number: {account.alpaca_account_number || 'N/A'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Purpose: {account.purpose}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-medium">
                          ${account.funded_amount?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(account.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Logs</CardTitle>
              <CardDescription>
                Recent authentication events and errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Authentication logging will be implemented in the next phase
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="session-details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
              <CardDescription>
                Active user sessions and session management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Total Users</p>
                    <p className="text-sm text-muted-foreground">
                      All registered users
                    </p>
                  </div>
                  <p className="text-2xl font-bold">{sessionStats.totalUsers}</p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Active Sessions</p>
                    <p className="text-sm text-muted-foreground">
                      Users active in last hour
                    </p>
                  </div>
                  <p className="text-2xl font-bold">{sessionStats.activeSessions}</p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Session Activity Rate</p>
                    <p className="text-sm text-muted-foreground">
                      Percentage of users with active sessions
                    </p>
                  </div>
                  <p className="text-2xl font-bold">
                    {sessionStats.totalUsers > 0
                      ? ((sessionStats.activeSessions / sessionStats.totalUsers) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
