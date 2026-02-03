/**
 * All Corporate Actions Component
 * 
 * Displays all corporate action announcements across all securities
 * without filtering - comprehensive view for trading page.
 * 
 * Requirements: 21.2
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  AlertCircle, 
  Calendar, 
  DollarSign,
  RefreshCw,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter
} from 'lucide-react';
import { listCorporateActions, type CorporateAction } from '@/lib/alpaca-corporate-actions';

export default function AllCorporateActions() {
  const [actions, setActions] = useState<CorporateAction[]>([]);
  const [filteredActions, setFilteredActions] = useState<CorporateAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Show 50 items per page
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchAllCorporateActions();
  }, []);

  // Apply filters whenever actions, searchQuery, or filterType changes
  useEffect(() => {
    applyFilters();
  }, [actions, searchQuery, filterType]);

  const applyFilters = () => {
    let filtered = [...actions];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(action => action.ca_type === filterType);
    }

    // Filter by search query (symbol)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      filtered = filtered.filter(action => 
        (action.initiating_symbol && action.initiating_symbol.toUpperCase().includes(query)) ||
        (action.target_symbol && action.target_symbol.toUpperCase().includes(query))
      );
    }

    setFilteredActions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Calculate pagination based on filtered actions
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredActions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredActions.length / itemsPerPage);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of the list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const fetchAllCorporateActions = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching corporate actions...');
      
      // Fetch all types without filtering
      const result = await listCorporateActions({
        ca_types: 'dividend,merger,spinoff,split',
        // Get 90 days range (30 days back, 60 days forward)
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      
      console.log('📊 Corporate actions result:', result);
      
      if (result.success && result.data) {
        console.log('✅ Raw data received:', result.data);
        
        // Handle nested data structure - result.data might have a data property
        let dataArray = Array.isArray(result.data) ? result.data : [];
        
        // Check if data is nested in result.data.data
        if (!Array.isArray(result.data) && (result.data as any).data && Array.isArray((result.data as any).data)) {
          dataArray = (result.data as any).data;
        }
        
        console.log('📋 Data array length:', dataArray.length);
        
        const validActions = dataArray.filter(action => 
          (action.initiating_symbol && action.initiating_symbol.trim()) || 
          (action.target_symbol && action.target_symbol.trim())
        );
        
        console.log('✅ Valid actions count:', validActions.length);
        
        // Sort by ex_date (most recent first)
        validActions.sort((a, b) => {
          const dateA = a.ex_date ? new Date(a.ex_date).getTime() : 0;
          const dateB = b.ex_date ? new Date(b.ex_date).getTime() : 0;
          return dateB - dateA;
        });
        
        setActions(validActions);
      } else {
        console.error('❌ Error from API:', result.error);
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || 'Failed to fetch corporate actions';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('❌ Exception caught:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAllCorporateActions();
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

  const getActionBorderColor = (type: string) => {
    switch (type) {
      case 'dividend':
        return 'hsl(var(--primary))';
      case 'split':
        return 'hsl(var(--secondary))';
      case 'merger':
        return 'hsl(142.1 76.2% 36.3%)'; // green
      case 'spinoff':
        return 'hsl(var(--destructive))';
      default:
        return 'hsl(var(--muted))';
    }
  };

  // Group actions by type for statistics
  const actionStats = filteredActions.reduce((acc, action) => {
    acc[action.ca_type] = (acc[action.ca_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              All Corporate Actions
            </CardTitle>
            <CardDescription>
              Complete view of all corporate actions across all securities
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
        
        {/* Statistics */}
        {!loading && filteredActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline" className="text-xs">
              Total: {actions.length} {filteredActions.length !== actions.length && `(${filteredActions.length} filtered)`}
            </Badge>
            {totalPages > 0 && (
              <Badge variant="outline" className="text-xs">
                Page {currentPage} of {totalPages}
              </Badge>
            )}
            {Object.entries(actionStats).map(([type, count]) => (
              <Badge key={type} variant={getActionTypeColor(type)} className="text-xs">
                {type}: {count}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by symbol (e.g., AAPL)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
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
          {(searchQuery || filterType !== 'all') && (
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
              }}
            >
              Clear
            </Button>
          )}
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

        {/* Empty State */}
        {!loading && filteredActions.length === 0 && !error && (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery || filterType !== 'all' 
              ? 'No corporate actions found matching your filters'
              : 'No corporate actions found in the selected date range'
            }
          </div>
        )}

        {/* Corporate Actions List */}
        {!loading && currentItems.length > 0 && (
          <>
            <div className="space-y-3">
              {currentItems.map((action) => (
              <Card 
                key={action.id} 
                className="border-l-4 hover:shadow-md transition-shadow" 
                style={{
                  borderLeftColor: getActionBorderColor(action.ca_type)
                }}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Header with type and symbols */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getActionTypeColor(action.ca_type)} className="flex items-center gap-1">
                          {getActionIcon(action.ca_type)}
                          {action.ca_type.toUpperCase()}
                        </Badge>
                        <span className="font-semibold text-lg">
                          {action.initiating_symbol || action.target_symbol || 'N/A'}
                        </span>
                        {action.target_symbol && action.initiating_symbol !== action.target_symbol && (
                          <>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{action.target_symbol}</span>
                          </>
                        )}
                      </div>

                      {/* Sub-type */}
                      {action.ca_sub_type && (
                        <p className="text-sm text-muted-foreground capitalize">
                          {action.ca_sub_type.replace(/_/g, ' ')}
                        </p>
                      )}

                      {/* Dates Grid */}
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
                      <div className="flex flex-wrap gap-4 text-sm">
                        {action.cash && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-600">
                              ${parseFloat(action.cash).toFixed(4)} per share
                            </span>
                          </div>
                        )}

                        {(action.old_rate || action.new_rate) && (
                          <div>
                            <span className="text-muted-foreground">Ratio:</span>
                            <span className="ml-1 font-medium">
                              {action.old_rate || '1'} → {action.new_rate || '1'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredActions.length)} of {filteredActions.length} corporate actions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
