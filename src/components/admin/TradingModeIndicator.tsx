import { useState, useEffect } from 'react';
import { AlertCircle, Database, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { getAppTradingMode, type TradingMode } from '../../lib/appSettings';

export default function TradingModeIndicator() {
  const [tradingMode, setTradingMode] = useState<TradingMode>('paper');
  const [loading, setLoading] = useState(true);

  const loadTradingMode = async () => {
    setLoading(true);
    const mode = await getAppTradingMode();
    setTradingMode(mode);
    setLoading(false);
  };

  useEffect(() => {
    loadTradingMode();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading trading mode...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={tradingMode === 'live' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            App Trading Mode
          </CardTitle>
          <Badge variant={tradingMode === 'live' ? 'destructive' : 'default'} className="text-sm">
            {tradingMode === 'live' ? '🔴 LIVE' : '🟢 SANDBOX'}
          </Badge>
        </div>
        <CardDescription>
          Application-wide trading environment setting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`flex items-start gap-3 p-4 rounded-md ${
          tradingMode === 'live' 
            ? 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100' 
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
        }`}>
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-sm">
            {tradingMode === 'live' ? (
              <>
                <p className="font-medium">⚠️ LIVE TRADING MODE ACTIVE</p>
                <p>
                  All trades are executed with real money on live markets. 
                  All users are trading with real funds.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">Sandbox Mode Active</p>
                <p>
                  All trades are simulated. No real money is involved. 
                  Perfect for testing and development.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t">
          <h4 className="font-medium text-sm">How to Change Trading Mode</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Update the <code className="bg-muted px-1 py-0.5 rounded">app_settings</code> table in your database:</p>
            <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
{`UPDATE app_settings 
SET setting_value = '${tradingMode === 'paper' ? 'live' : 'paper'}' 
WHERE setting_key = 'trading_mode';`}
            </pre>
            <p className="text-xs">
              Current value: <code className="bg-muted px-1 py-0.5 rounded">{tradingMode}</code>
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTradingMode}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>
            <strong>Note:</strong> This setting affects all users and all API calls. 
            Changes take effect immediately for new requests.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
