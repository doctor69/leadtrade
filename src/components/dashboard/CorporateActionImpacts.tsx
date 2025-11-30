/**
 * Corporate Action Impacts Component
 * 
 * Shows how corporate actions affect current portfolio positions
 * 
 * Requirements: 21.3
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  AlertCircle, 
  Calendar, 
  DollarSign,
  RefreshCw,
  Info
} from 'lucide-react';
import { listCorporateActions, type CorporateAction } from '@/lib/alpaca-corporate-actions';
import { apiService, type Position } from '@/lib/apiService';

interface CorporateActionImpact {
  action: CorporateAction;
  position?: Position;
  estimatedImpact?: number;
  impactType: 'dividend' | 'split' | 'merger' | 'spinoff';
}

export default function CorporateActionImpacts() {
  const [impacts, setImpacts] = useState<CorporateActionImpact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCorporateActionImpacts();
  }, []);

  const fetchCorporateActionImpacts = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch current positions
      const positionsResult = await apiService.getPositions();
      if (!positionsResult.success || !positionsResult.data) {
        setError('Failed to fetch positions');
        return;
      }

      const positions = positionsResult.data;
      const symbols = positions.map((p: Position) => p.symbol);

      // Fetch corporate actions for held symbols
      const actionsResult = await listCorporateActions({
        // Get recent actions (last 30 days forward)
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      if (!actionsResult.success || !actionsResult.data) {
        setError('Failed to fetch corporate actions');
        return;
      }

      // Match actions with positions
      const relevantImpacts: CorporateActionImpact[] = actionsResult.data
        .filter(action => symbols.includes(action.initiating_symbol))
        .map(action => {
          const position = positions.find((p: Position) => p.symbol === action.initiating_symbol);
          let estimatedImpact = 0;

          // Calculate estimated impact based on action type
          if (action.ca_type === 'dividend' && action.cash && position) {
            estimatedImpact = parseFloat(action.cash) * parseFloat(position.qty as any);
          }

          return {
            action,
            position,
            estimatedImpact,
            impactType: action.ca_type as any,
          };
        });

      setImpacts(relevantImpacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getActionTypeColor = (type: string) => {
    switch (type) {
      case 'dividend':
        return 'default';
      case 'split':
        return 'secondary';
      case 'merger':
        return 'outline';
      case 'spinoff':
        return 'destructive';
      default:
        return 'outline';
    }
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

  if (impacts.length === 0) {
    return null; // Don't show the card if there are no relevant corporate actions
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Corporate Action Impacts
            </CardTitle>
            <CardDescription>
              How corporate actions affect your positions
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCorporateActionImpacts}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {impacts.map((impact, index) => (
            <Card key={`${impact.action.id}-${index}`} className="border-l-4" style={{
              borderLeftColor: impact.impactType === 'dividend' ? 'hsl(var(--primary))' : 
                               impact.impactType === 'split' ? 'hsl(var(--secondary))' : 
                               'hsl(var(--muted))'
            }}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getActionTypeColor(impact.impactType)} className="flex items-center gap-1">
                        {impact.impactType === 'dividend' && <DollarSign className="h-3 w-3" />}
                        {impact.impactType === 'split' && <TrendingUp className="h-3 w-3" />}
                        {impact.impactType.toUpperCase()}
                      </Badge>
                      <span className="font-semibold text-lg">
                        {impact.action.initiating_symbol}
                      </span>
                      {impact.position && (
                        <span className="text-sm text-muted-foreground">
                          ({impact.position.qty} shares)
                        </span>
                      )}
                    </div>

                    {impact.action.ca_sub_type && (
                      <p className="text-sm text-muted-foreground">
                        {impact.action.ca_sub_type}
                      </p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                      {impact.action.ex_date && (
                        <div>
                          <span className="text-muted-foreground">Ex-Date:</span>
                          <span className="ml-1 font-medium">{formatDate(impact.action.ex_date)}</span>
                        </div>
                      )}
                      {impact.action.payable_date && (
                        <div>
                          <span className="text-muted-foreground">Payable:</span>
                          <span className="ml-1 font-medium">{formatDate(impact.action.payable_date)}</span>
                        </div>
                      )}
                      {impact.estimatedImpact > 0 && (
                        <div>
                          <span className="text-muted-foreground">Est. Impact:</span>
                          <span className="ml-1 font-medium text-green-600">
                            {formatCurrency(impact.estimatedImpact)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action-specific details */}
                    {impact.action.cash && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-600">
                          ${parseFloat(impact.action.cash).toFixed(4)} per share
                        </span>
                      </div>
                    )}

                    {(impact.action.old_rate || impact.action.new_rate) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Ratio:</span>
                        <span className="ml-1 font-medium">
                          {impact.action.old_rate || '1'} → {impact.action.new_rate || '1'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Corporate actions are automatically applied to your positions on the payable date. 
            Estimated impacts are calculated based on your current holdings.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
