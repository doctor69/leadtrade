import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import {
  TrendingUp,
  TrendingDown,
  Users,
  AlertCircle,
  CheckCircle,
  Percent
} from 'lucide-react';
import { CopyTradingService } from '@/lib/copy-trading-service';
import type { LeaderboardData } from '@/types/trading';

interface TraderSelectionProps {
  availableTraders: LeaderboardData[];
  currentUserId: string;
  onSubscriptionCreated: () => void;
  remainingAllocation: number;
}

interface FollowDialogState {
  isOpen: boolean;
  trader: LeaderboardData | null;
  allocationPercentage: number;
  isLoading: boolean;
  error: string | null;
}

export default function TraderSelection({
  availableTraders,
  currentUserId,
  onSubscriptionCreated,
  remainingAllocation
}: TraderSelectionProps) {
  const [followDialog, setFollowDialog] = useState<FollowDialogState>({
    isOpen: false,
    trader: null,
    allocationPercentage: 10,
    isLoading: false,
    error: null
  });

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const handleFollowClick = (trader: LeaderboardData) => {
    const maxAllocation = Math.min(remainingAllocation, 50);
    setFollowDialog({
      isOpen: true,
      trader,
      allocationPercentage: Math.min(10, maxAllocation),
      isLoading: false,
      error: null
    });
  };

  const handleAllocationChange = (value: number[]) => {
    setFollowDialog(prev => ({
      ...prev,
      allocationPercentage: value[0]
    }));
  };

  const handleConfirmFollow = async () => {
    if (!followDialog.trader) return;

    setFollowDialog(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      const result = await CopyTradingService.createSubscription(
        currentUserId,
        followDialog.trader!.user_id,
        followDialog.allocationPercentage
      );

      if (result.success) {
        setFollowDialog({
          isOpen: false,
          trader: null,
          allocationPercentage: 10,
          isLoading: false,
          error: null
        });
        onSubscriptionCreated();
      } else {
        setFollowDialog(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to follow trader'
        }));
      }
    } catch (error) {
      setFollowDialog(prev => ({
        ...prev,
        isLoading: false,
        error: 'An unexpected error occurred'
      }));
    }
  };

  const handleCloseDialog = () => {
    setFollowDialog({
      isOpen: false,
      trader: null,
      allocationPercentage: 10,
      isLoading: false,
      error: null
    });
  };

  // Filter out current user from available traders
  const filteredTraders = availableTraders.filter(trader => trader.user_id !== currentUserId);

  if (filteredTraders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">No traders available to follow at the moment.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Available Traders</h3>
            <p className="text-sm text-muted-foreground">
              Select traders to follow and allocate your portfolio
            </p>
          </div>
          <Badge variant="secondary">
            <Percent className="h-3 w-3 mr-1" />
            {remainingAllocation.toFixed(1)}% available
          </Badge>
        </div>

        {remainingAllocation <= 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have allocated 100% of your portfolio. Adjust existing subscriptions to follow new traders.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          {filteredTraders.map((trader) => (
            <Card key={trader.user_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(trader.username)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <h4 className="font-medium">{trader.username}</h4>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{trader.total_trades || 0} trades</span>
                        <span>{trader.total_followers || 0} followers</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-1 mb-1">
                        {trader.avg_return >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <Badge variant={trader.avg_return >= 0 ? "default" : "destructive"}>
                          {trader.avg_return >= 0 ? '+' : ''}{trader.avg_return.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg Return
                      </div>
                    </div>

                    <Button
                      onClick={() => handleFollowClick(trader)}
                      disabled={remainingAllocation <= 0}
                      size="sm"
                    >
                      Follow
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Follow Trader Dialog */}
      <Dialog open={followDialog.isOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-sm">
                  {followDialog.trader ? getInitials(followDialog.trader.username) : ''}
                </AvatarFallback>
              </Avatar>
              <span>Follow {followDialog.trader?.username}</span>
            </DialogTitle>
            <DialogDescription>
              Set the percentage of your portfolio to allocate to this trader's trades.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {followDialog.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{followDialog.error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="allocation">Allocation Percentage</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="allocation"
                    type="number"
                    min="0.1"
                    max={remainingAllocation}
                    step="0.1"
                    value={followDialog.allocationPercentage}
                    onChange={(e) => handleAllocationChange([parseFloat(e.target.value)])}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Slider
                  value={[followDialog.allocationPercentage]}
                  onValueChange={handleAllocationChange}
                  max={remainingAllocation}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.1%</span>
                  <span>{remainingAllocation.toFixed(1)}%</span>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <div className="text-sm">
                  <span className="font-medium">Remaining allocation after this: </span>
                  <span className="font-medium">
                    {(remainingAllocation - followDialog.allocationPercentage).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={followDialog.isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmFollow}
              disabled={followDialog.isLoading || followDialog.allocationPercentage <= 0}
            >
              {followDialog.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Following...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Follow Trader
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}