import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertCircle, Settings, Save } from 'lucide-react';
import {
  getTradingConfiguration,
  updateTradingConfiguration,
  type TradingConfiguration
} from '../../lib/alpaca-trading-config';

interface TradingConfigPanelProps {
  accountId: string;
}

export default function TradingConfigPanel({ accountId }: TradingConfigPanelProps) {
  const [config, setConfig] = useState<TradingConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, [accountId]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getTradingConfiguration(accountId);

      if (result.success && result.config) {
        setConfig(result.config);
      } else {
        setError(result.error || 'Failed to load trading configuration');
      }
    } catch (err) {
      console.error('Error loading configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const result = await updateTradingConfiguration(accountId, config);

      if (result.success && result.config) {
        setConfig(result.config);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to update configuration');
      }
    } catch (err) {
      console.error('Error updating configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<TradingConfiguration>) => {
    if (config) {
      setConfig({ ...config, ...updates });
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

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
          <Button onClick={loadConfiguration} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Trading Configuration
        </CardTitle>
        <CardDescription>
          Manage your trading settings and risk controls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <Save className="h-4 w-4" />
              <span className="text-sm">Configuration saved successfully</span>
            </div>
          </div>
        )}

        {/* Trading Controls */}
        <div className="space-y-4">
          <h3 className="font-medium">Trading Controls</h3>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="suspend_trade">Suspend Trading</Label>
              <p className="text-sm text-muted-foreground">
                Temporarily disable new order submissions
              </p>
            </div>
            <Switch
              id="suspend_trade"
              checked={config.suspend_trade}
              onCheckedChange={(value) => updateConfig({ suspend_trade: value })}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="no_shorting">Disable Short Selling</Label>
              <p className="text-sm text-muted-foreground">
                Prevent short positions from being opened
              </p>
            </div>
            <Switch
              id="no_shorting"
              checked={config.no_shorting}
              onCheckedChange={(value) => updateConfig({ no_shorting: value })}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="fractional_trading">Fractional Trading</Label>
              <p className="text-sm text-muted-foreground">
                Enable trading fractional shares
              </p>
            </div>
            <Switch
              id="fractional_trading"
              checked={config.fractional_trading}
              onCheckedChange={(value) => updateConfig({ fractional_trading: value })}
              disabled={saving}
            />
          </div>
        </div>

        {/* Risk Management */}
        <div className="space-y-4">
          <h3 className="font-medium">Risk Management</h3>

          <div className="space-y-2">
            <Label htmlFor="dtbp_check">Day Trade Buying Power Check</Label>
            <Select
              value={config.dtbp_check}
              onValueChange={(value: 'entry' | 'exit' | 'both') => 
                updateConfig({ dtbp_check: value })
              }
              disabled={saving}
            >
              <SelectTrigger id="dtbp_check">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry Only</SelectItem>
                <SelectItem value="exit">Exit Only</SelectItem>
                <SelectItem value="both">Both Entry and Exit</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              When to check day trading buying power limits
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdt_check">Pattern Day Trader Check</Label>
            <Select
              value={config.pdt_check}
              onValueChange={(value: 'entry' | 'exit' | 'both') => 
                updateConfig({ pdt_check: value })
              }
              disabled={saving}
            >
              <SelectTrigger id="pdt_check">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry Only</SelectItem>
                <SelectItem value="exit">Exit Only</SelectItem>
                <SelectItem value="both">Both Entry and Exit</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              When to enforce PDT restrictions
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_margin_multiplier">Maximum Margin Multiplier</Label>
            <Select
              value={config.max_margin_multiplier}
              onValueChange={(value) => updateConfig({ max_margin_multiplier: value })}
              disabled={saving}
            >
              <SelectTrigger id="max_margin_multiplier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1x (No Margin)</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="3">3x</SelectItem>
                <SelectItem value="4">4x</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Maximum leverage allowed for margin trading
            </p>
          </div>
        </div>

        {/* Options Trading */}
        <div className="space-y-4">
          <h3 className="font-medium">Options Trading</h3>

          <div className="space-y-2">
            <Label htmlFor="max_options_trading_level">Options Trading Level</Label>
            <Select
              value={config.max_options_trading_level.toString()}
              onValueChange={(value) => 
                updateConfig({ max_options_trading_level: parseInt(value) })
              }
              disabled={saving}
            >
              <SelectTrigger id="max_options_trading_level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Level 0 - No Options</SelectItem>
                <SelectItem value="1">Level 1 - Covered Calls/Puts</SelectItem>
                <SelectItem value="2">Level 2 - Long Options</SelectItem>
                <SelectItem value="3">Level 3 - Spreads</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Maximum options trading complexity allowed
            </p>
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-4">
          <h3 className="font-medium">Notifications</h3>

          <div className="space-y-2">
            <Label htmlFor="trade_confirm_email">Trade Confirmation Emails</Label>
            <Select
              value={config.trade_confirm_email}
              onValueChange={(value: 'all' | 'none') => 
                updateConfig({ trade_confirm_email: value })
              }
              disabled={saving}
            >
              <SelectTrigger id="trade_confirm_email">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Receive email confirmations for trades
            </p>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4">
          <h3 className="font-medium">Advanced Settings</h3>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="ptp_no_exception_entry">Prevent Pattern Day Trading</Label>
              <p className="text-sm text-muted-foreground">
                Block trades that would trigger PDT status
              </p>
            </div>
            <Switch
              id="ptp_no_exception_entry"
              checked={config.ptp_no_exception_entry}
              onCheckedChange={(value) => updateConfig({ ptp_no_exception_entry: value })}
              disabled={saving}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
