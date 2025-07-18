import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, TrendingUp, AlertCircle, Settings } from 'lucide-react';
import { CopyTradingService, type SubscriptionSummary } from '@/lib/copy-trading-service';
import type { LeaderboardData } from '@/types/trading';
import TraderSelection from './TraderSelection';
import SubscriptionManagerNew from './SubscriptionManagerNew';

interface CopyTradingDashboardProps {
  currentUserId: string;
  availableTraders: LeaderboardData[];
}

export default function CopyTradingDashboard({ 
  currentUserId, 
  availableTraders 
}: CopyTradingDashboardProps) {
  const [subscriptionSummary, setSubscriptionSummary] = useState<SubscriptionSummary>({
    subscriptions: [],
    totalAllocation: 0,
    remainingAllocation: 100,
    activeSubscriptions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'manage'>('browse');

  // Fetch subscription data
  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const summary = await CopyTradingService.getUserSubscriptions(currentUserId);
      setSubscriptionSummary(summary);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      fetchSubscriptionData();
    }
  }, [currentUserId]);

  const handleSubscriptionChange = () => {
    fetchSubscriptionData();
  };

  const handleSubscriptionCreated = () => {
    fetchSubscriptionData();
    setActiveTab('manage'); // Switch to manage tab after creating subscription
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <span>Copy Trading</span>
          </CardTitle>
          <CardDescription>
            Follow successful traders and automatically copy their trades with customizable allocation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {subscriptionSummary.activeSubscriptions}
              </div>
              <div className="text-sm text-muted-foreground">Active Follows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {subscriptionSummary.totalAllocation.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Allocated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {subscriptionSummary.remainingAllocation.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {availableTraders.length}
              </div>
              <div className="text-sm text-muted-foreground">Available Traders</div>
            </div>
          </div>

          {/* Allocation Status */}
          {subscriptionSummary.totalAllocation > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Portfolio Allocation</span>
                <Badge variant={subscriptionSummary.totalAllocation > 90 ? "destructive" : "default"}>
                  {subscriptionSummary.totalAllocation.toFixed(1)}% / 100%
                </Badge>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    subscriptionSummary.totalAllocation > 90 
                      ? 'bg-red-500' 
                      : subscriptionSummary.totalAllocation > 70 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(subscriptionSummary.totalAllocation, 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'browse' | 'manage')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Browse Traders</span>
            {subscriptionSummary.remainingAllocation > 0 && (
              <Badge variant="secondary" className="ml-2">
                {subscriptionSummary.remainingAllocation.toFixed(0)}% available
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Manage Subscriptions</span>
            {subscriptionSummary.activeSubscriptions > 0 && (
              <Badge variant="default" className="ml-2">
                {subscriptionSummary.activeSubscriptions}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <TraderSelection
            availableTraders={availableTraders}
            currentUserId={currentUserId}
            onSubscriptionCreated={handleSubscriptionCreated}
            remainingAllocation={subscriptionSummary.remainingAllocation}
          />
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <SubscriptionManagerNew
            userId={currentUserId}
            onSubscriptionChange={handleSubscriptionChange}
          />
        </TabsContent>
      </Tabs>

      {/* Getting Started Guide */}
      {subscriptionSummary.activeSubscriptions === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Getting Started with Copy Trading</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
                  1
                </div>
                <h4 className="font-semibold mb-1">Browse Traders</h4>
                <p className="text-sm text-muted-foreground">
                  Explore successful traders and their performance metrics
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
                  2
                </div>
                <h4 className="font-semibold mb-1">Set Allocation</h4>
                <p className="text-sm text-muted-foreground">
                  Choose what percentage of your portfolio to allocate
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
                  3
                </div>
                <h4 className="font-semibold mb-1">Auto-Copy Trades</h4>
                <p className="text-sm text-muted-foreground">
                  Your trades will automatically mirror theirs proportionally
                </p>
              </div>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Risk Management:</strong> Never allocate more than you can afford to lose. 
                Diversify across multiple traders and monitor performance regularly.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}