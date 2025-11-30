/**
 * Corporate Action Notifications Component
 * 
 * Displays corporate action announcements (dividends, mergers, spinoffs, splits)
 * with filtering and real-time updates.
 * 
 * Requirements: 21.2
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  AlertCircle, 
  Calendar, 
  DollarSign,
  RefreshCw,
  Filter
} from 'lucide-react';
import { listCorporateActions, type CorporateAction, type GetCorporateActionsParams } from '@/lib/alpaca-corporate-actions';

export default function CorporateActionNotifications() {
  const [actions, setActions] = useState<CorporateAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSymbol, setFilterSymbol] = useState<string>('');

  useEffect(() => {
    fetchCorporateActions();
  }, []);

  const fetchCorporateActions = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: GetCorporateActionsParams = {};
      
      if (filterType !== 'all') {
        params.ca_types = filterType;
      }
      
      if (filterSymbol.trim()) {
        params.symbol = filterSymbol.trim().toUpperCase();
      }

      const result = await listCorporateActions(params);
      
      if (result.success && result.data) {
        setActions(result.data);
      } else {
        setError(result.error || 'Failed to fetch corporate actions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchCorporateActions();
  };

  const handleApplyFilters = () => {
    fetchCorporateActions();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'dividend':
        return <DollarSign className="h-4 w-4" />;
      case 'split':
      case 'merger':
      case 'spinoff':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Corporate Actions
            </CardTitle>
            <CardDescription>
              Recent announcements affecting your holdings
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Input
              placeholder="Filter by symbol (e.g., AAPL)"
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Action type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="dividend">Dividends</SelectItem>
              <SelectItem value="split">Splits</SelectItem>
              <SelectItem value="merger">Mergers</SelectItem>
              <SelectItem value="spinoff">Spinoffs</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleApplyFilters} disabled={loading}>
            <Filter className="h-4 w-4 mr-2" />
            Apply
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Corporate Actions List */}
        {!loading && actions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No corporate actions found
          </div>
        )}

        {!loading && actions.length > 0 && (
          <div className="space-y-3">
            {actions.map((action) => (
              <Card key={action.id} className="border-l-4" style={{
                borderLeftColor: action.ca_type === 'dividend' ? 'hsl(var(--primary))' : 
                                 action.ca_type === 'split' ? 'hsl(var(--secondary))' : 
                                 'hsl(var(--muted))'
              }}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getActionTypeColor(action.ca_type)} className="flex items-center gap-1">
                          {getActionIcon(action.ca_type)}
                          {action.ca_type.toUpperCase()}
                        </Badge>
                        <span className="font-semibold text-lg">
                          {action.initiating_symbol}
                        </span>
                        {action.target_symbol && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{action.target_symbol}</span>
                          </>
                        )}
                      </div>

                      {action.ca_sub_type && (
                        <p className="text-sm text-muted-foreground">
                          {action.ca_sub_type}
                        </p>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                        {action.ex_date && (
                          <div>
                            <span className="text-muted-foreground">Ex-Date:</span>
                            <span className="ml-1 font-medium">{formatDate(action.ex_date)}</span>
                          </div>
                        )}
                        {action.record_date && (
                          <div>
                            <span className="text-muted-foreground">Record:</span>
                            <span className="ml-1 font-medium">{formatDate(action.record_date)}</span>
                          </div>
                        )}
                        {action.payable_date && (
                          <div>
                            <span className="text-muted-foreground">Payable:</span>
                            <span className="ml-1 font-medium">{formatDate(action.payable_date)}</span>
                          </div>
                        )}
                        {action.declaration_date && (
                          <div>
                            <span className="text-muted-foreground">Declared:</span>
                            <span className="ml-1 font-medium">{formatDate(action.declaration_date)}</span>
                          </div>
                        )}
                      </div>

                      {/* Action-specific details */}
                      {action.cash && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-600">
                            ${parseFloat(action.cash).toFixed(4)} per share
                          </span>
                        </div>
                      )}

                      {(action.old_rate || action.new_rate) && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Ratio:</span>
                          <span className="ml-1 font-medium">
                            {action.old_rate || '1'} → {action.new_rate || '1'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
