import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { AlertCircle, TrendingUp, Users, Percent, Edit2, Trash2, Save, X } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { CopyTradingService, type SubscriptionWithLeader, type SubscriptionSummary } from '../../lib/copy-trading-service';

interface SubscriptionManagerProps {
  userId: string;
  onSubscriptionChange?: () => void;
}

export default function SubscriptionManager({ userId, onSubscriptionChange }: SubscriptionManagerProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary>({
    subscriptions: [],
    totalAllocation: 0,
    remainingAllocation: 100,
    activeSubscriptions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAllocation, setEditAllocation] = useState<number>(0);
  const [updating, setUpdating] = useState<string | null>(null);

  // Fetch user's subscriptions
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const summary = await CopyTradingService.getUserSubscriptions(userId);
      setSubscriptions(summary);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchSubscriptions();
    }
  }, [userId]);

  // Update subscription allocation
  const updateAllocation = async (subscriptionId: string, newAllocation: number) => {
    try {
      setUpdating(subscriptionId);
      const result = await CopyTradingService.updateSubscription(
        subscriptionId,
        userId,
        { allocation_percentage: newAllocation }
      );

      if (result.success) {
        await fetchSubscriptions();
        setEditingId(null);
        onSubscriptionChange?.();
      } else {
        setError(result.error || 'Failed to update allocation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update allocation');
    } finally {
      setUpdating(null);
    }
  };

  // Toggle subscription active status
  const toggleSubscription = async (subscriptionId: string, isActive: boolean) => {
    try {
      setUpdating(subscriptionId);
      const result = await CopyTradingService.updateSubscription(
        subscriptionId,
        userId,
        { is_active: isActive }
      );

      if (result.success) {
        await fetchSubscriptions();
        onSubscriptionChange?.();
      } else {
        setError(result.error || 'Failed to update subscription');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      setUpdating(null);
    }
  };

  // Delete subscription
  const deleteSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to unsubscribe from this trader?')) {
      return;
    }

    try {
      setUpdating(subscriptionId);
      const result = await CopyTradingService.deleteSubscription(subscriptionId, userId);

      if (result.success) {
        await fetchSubscriptions();
        onSubscriptionChange?.();
      } else {
        setError(result.error || 'Failed to delete subscription');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete subscription');
    } finally {
      setUpdating(null);
    }
  };

  const startEditing = (subscription: SubscriptionWithLeader) => {
    setEditingId(subscription.id);
    setEditAllocation(parseFloat(subscription.allocation_percentage.toString()));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditAllocation(0);
  };

  const saveAllocation = () => {
    if (editingId && editAllocation > 0 && editAllocation <= 100) {
      updateAllocation(editingId, editAllocation);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Copy Trading Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Copy Trading Overview
          </CardTitle>
          <CardDescription>
            Manage your copy trading subscriptions and portfolio allocation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{subscriptions.activeSubscriptions}</div>
              <div className="text-sm text-gray-600">Active Subscriptions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{subscriptions.totalAllocation.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Total Allocated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{subscriptions.remainingAllocation.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
          </div>

          {/* Allocation Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Portfolio Allocation</span>
              <span>{subscriptions.totalAllocation.toFixed(1)}% of 100%</span>
            </div>
            <Progress 
              value={subscriptions.totalAllocation} 
              className="h-2"
            />
          </div>

          {subscriptions.totalAllocation > 90 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You're using {subscriptions.totalAllocation.toFixed(1)}% of your portfolio allocation. 
                Consider your risk management strategy.
              </AlertDescription>
            </Alert>
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

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Subscriptions</CardTitle>
          <CardDescription>
            {subscriptions.subscriptions.length === 0 
              ? "You haven't subscribed to any traders yet"
              : `Managing ${subscriptions.subscriptions.length} subscription${subscriptions.subscriptions.length !== 1 ? 's' : ''}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.subscriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No subscriptions yet</p>
              <p className="text-sm">Visit the leaderboard to start following traders</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.subscriptions.map((subscription) => (
                <div key={subscription.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">
                          {subscription.leader.full_name || subscription.leader.username}
                        </h3>
                        <Badge variant={subscription.is_active ? "default" : "secondary"}>
                          {subscription.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1">
                          <Percent className="h-4 w-4" />
                          {editingId === subscription.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editAllocation}
                                onChange={(e) => setEditAllocation(parseFloat(e.target.value) || 0)}
                                min="0.1"
                                max="100"
                                step="0.1"
                                className="w-20 h-8"
                              />
                              <span>%</span>
                            </div>
                          ) : (
                            `${parseFloat(subscription.allocation_percentage.toString()).toFixed(1)}% allocation`
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          Shares {subscription.leader.show_asset_amounts ? 'amounts' : 'trades only'}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500">
                        Subscribed {new Date(subscription.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingId === subscription.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={saveAllocation}
                            disabled={updating === subscription.id}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            disabled={updating === subscription.id}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing(subscription)}
                            disabled={updating === subscription.id}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Switch
                            checked={subscription.is_active}
                            onCheckedChange={(checked) => toggleSubscription(subscription.id, checked)}
                            disabled={updating === subscription.id}
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteSubscription(subscription.id)}
                            disabled={updating === subscription.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}