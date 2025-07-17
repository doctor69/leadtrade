import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { apiService } from '@/lib/apiService';

interface ApiEndpoint {
  name: string;
  method: string;
  endpoint: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: any;
  error?: string;
  lastTested?: Date;
}

export default function ApiIntegrationDemo() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([
    { name: 'Account Data', method: 'GET', endpoint: '/api/alpaca/account', status: 'idle' },
    { name: 'Positions', method: 'GET', endpoint: '/api/alpaca/positions', status: 'idle' },
    { name: 'Orders', method: 'GET', endpoint: '/api/alpaca/orders', status: 'idle' },
    { name: 'Assets', method: 'GET', endpoint: '/api/alpaca/assets', status: 'idle' },
    { name: 'Portfolio History', method: 'GET', endpoint: '/api/alpaca/portfolio-history', status: 'idle' },
    { name: 'Market Data - Bars', method: 'GET', endpoint: '/api/alpaca/market-data/bars', status: 'idle' },
    { name: 'Market Data - Quotes', method: 'GET', endpoint: '/api/alpaca/market-data/quotes', status: 'idle' },
    { name: 'Leaderboard', method: 'GET', endpoint: '/api/leaderboard', status: 'idle' },
    { name: 'User Profile', method: 'GET', endpoint: '/api/user/profile', status: 'idle' },
  ]);

  const updateEndpointStatus = (name: string, updates: Partial<ApiEndpoint>) => {
    setEndpoints(prev => prev.map(ep => 
      ep.name === name ? { ...ep, ...updates, lastTested: new Date() } : ep
    ));
  };

  const testEndpoint = async (endpoint: ApiEndpoint) => {
    updateEndpointStatus(endpoint.name, { status: 'loading' });

    try {
      let result;
      
      switch (endpoint.name) {
        case 'Account Data':
          result = await apiService.getAccount();
          break;
        case 'Positions':
          result = await apiService.getPositions();
          break;
        case 'Orders':
          result = await apiService.getOrders({ status: 'all', limit: 10 });
          break;
        case 'Assets':
          result = await apiService.getAssets({ status: 'active', asset_class: 'us_equity', search: 'AAPL' });
          break;
        case 'Portfolio History':
          result = await apiService.getPortfolioHistory({ period: '1W', timeframe: '1D' });
          break;
        case 'Market Data - Bars':
          result = await apiService.getBars({ symbols: 'AAPL,TSLA', timeframe: '1Day', limit: 5 });
          break;
        case 'Market Data - Quotes':
          result = await apiService.getQuotes({ symbols: 'AAPL,TSLA', limit: 5 });
          break;
        case 'Leaderboard':
          result = await apiService.getLeaderboard({ timeframe: 'weekly', limit: 10 });
          break;
        case 'User Profile':
          result = await apiService.getUserProfile();
          break;
        default:
          throw new Error('Unknown endpoint');
      }

      if (result.success) {
        updateEndpointStatus(endpoint.name, { 
          status: 'success', 
          data: result.data,
          error: undefined 
        });
      } else {
        updateEndpointStatus(endpoint.name, { 
          status: 'error', 
          error: result.error || 'Unknown error',
          data: undefined 
        });
      }
    } catch (error) {
      updateEndpointStatus(endpoint.name, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Network error',
        data: undefined 
      });
    }
  };

  const testAllEndpoints = async () => {
    for (const endpoint of endpoints) {
      await testEndpoint(endpoint);
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'loading':
        return <Badge variant="secondary">Testing...</Badge>;
      case 'success':
        return <Badge variant="default">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Not Tested</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Integration Status</CardTitle>
              <CardDescription>Test all API endpoints and view their integration status</CardDescription>
            </div>
            <Button onClick={testAllEndpoints} disabled={endpoints.some(ep => ep.status === 'loading')}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Test All APIs
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Endpoint Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {endpoints.map((endpoint) => (
                  <Card key={endpoint.name} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{endpoint.name}</h4>
                      {getStatusIcon(endpoint.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {endpoint.method}
                      </Badge>
                      {getStatusBadge(endpoint.status)}
                    </div>
                    {endpoint.lastTested && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last tested: {endpoint.lastTested.toLocaleTimeString()}
                      </p>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={() => testEndpoint(endpoint)}
                      disabled={endpoint.status === 'loading'}
                    >
                      Test
                    </Button>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Tested</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.map((endpoint) => (
                    <TableRow key={endpoint.name}>
                      <TableCell className="font-medium">{endpoint.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{endpoint.method}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(endpoint.status)}
                          {getStatusBadge(endpoint.status)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {endpoint.lastTested ? endpoint.lastTested.toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell className="text-sm text-red-600 max-w-xs truncate">
                        {endpoint.error || '-'}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => testEndpoint(endpoint)}
                          disabled={endpoint.status === 'loading'}
                        >
                          Test
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses">
          <div className="space-y-4">
            {endpoints.filter(ep => ep.data || ep.error).map((endpoint) => (
              <Card key={endpoint.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{endpoint.name}</CardTitle>
                    {getStatusBadge(endpoint.status)}
                  </div>
                  <CardDescription>{endpoint.endpoint}</CardDescription>
                </CardHeader>
                <CardContent>
                  {endpoint.error ? (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-red-600 dark:text-red-400 font-medium">Error:</p>
                      <p className="text-red-700 dark:text-red-300 text-sm mt-1">{endpoint.error}</p>
                    </div>
                  ) : endpoint.data ? (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-green-600 dark:text-green-400 font-medium mb-2">Response Data:</p>
                      <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded border overflow-auto max-h-64">
                        {JSON.stringify(endpoint.data, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}