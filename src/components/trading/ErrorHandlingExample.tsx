// Example component demonstrating comprehensive error handling in trading operations
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ErrorDisplay, useErrorHandler, ErrorBoundary } from '../ui/ErrorDisplay';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { logger, LogCategory } from '../../lib/logger';
import { errorHandler, ErrorCode } from '../../lib/error-handler';
import { ValidationService } from '../../lib/validation';

interface TradeFormData {
  symbol: string;
  quantity: number;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  limitPrice?: number;
}

const ErrorHandlingExample: React.FC = () => {
  const [formData, setFormData] = useState<TradeFormData>({
    symbol: '',
    quantity: 0,
    side: 'buy',
    orderType: 'market'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { error, handleError, clearError, retry } = useErrorHandler();

  // Simulate different types of errors for demonstration
  const simulateError = (errorType: string) => {
    switch (errorType) {
      case 'validation':
        const validationError = errorHandler.createTradingError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid trade parameters',
          'Please check your trade details and try again.',
          {
            metadata: { 
              validationErrors: ['Symbol is required', 'Quantity must be greater than 0'] 
            },
            recoveryOptions: [
              {
                action: 'fix_form',
                label: 'Fix Form',
                description: 'Correct the highlighted fields'
              }
            ]
          }
        );
        handleError(validationError);
        break;

      case 'insufficient_funds':
        const fundsError = errorHandler.createTradingError(
          ErrorCode.INSUFFICIENT_FUNDS,
          'Insufficient buying power',
          'You don\'t have enough buying power to execute this trade.',
          {
            recoveryOptions: [
              {
                action: 'deposit',
                label: 'Add Funds',
                description: 'Deposit money to your trading account',
                url: '/account/deposit'
              },
              {
                action: 'reduce_quantity',
                label: 'Reduce Quantity',
                description: 'Try trading with a smaller quantity'
              }
            ]
          }
        );
        handleError(fundsError);
        break;

      case 'market_closed':
        const marketError = errorHandler.createTradingError(
          ErrorCode.MARKET_CLOSED,
          'Market is closed',
          'The market is currently closed. You can place orders that will execute when the market opens.',
          {
            recoveryOptions: [
              {
                action: 'schedule',
                label: 'Schedule Order',
                description: 'Place an order to execute when the market opens'
              }
            ]
          }
        );
        handleError(marketError);
        break;

      case 'network':
        const networkError = errorHandler.createTradingError(
          ErrorCode.NETWORK_ERROR,
          'Network connection failed',
          'Unable to connect to trading services. Please check your internet connection.',
          {
            retryable: true,
            recoveryOptions: [
              {
                action: 'retry',
                label: 'Retry',
                description: 'Check your connection and try again'
              },
              {
                action: 'refresh',
                label: 'Refresh Page',
                description: 'Reload the page to reset the connection'
              }
            ]
          }
        );
        handleError(networkError);
        break;

      case 'rate_limit':
        const rateLimitError = errorHandler.createTradingError(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Too many requests',
          'You\'ve made too many requests. Please wait a moment before trying again.',
          {
            retryable: true,
            recoveryOptions: [
              {
                action: 'wait',
                label: 'Wait and Retry',
                description: 'Wait 30 seconds and try again'
              }
            ]
          }
        );
        handleError(rateLimitError);
        break;

      case 'auth':
        const authError = errorHandler.createAuthError();
        handleError(authError);
        break;

      default:
        const genericError = new Error('Something went wrong');
        handleError(genericError);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);
    clearError();

    try {
      // Log the trade attempt
      logger.info(
        LogCategory.TRADING,
        `Attempting to place ${formData.side} order for ${formData.quantity} ${formData.symbol}`,
        {
          metadata: {
            orderType: formData.orderType,
            limitPrice: formData.limitPrice
          }
        }
      );

      // Validate the form data
      const validation = ValidationService.validateTradeExecution({
        symbol: formData.symbol,
        side: formData.side,
        quantity: formData.quantity,
        trade_type: 'stock'
      });

      if (!validation.isValid) {
        throw errorHandler.createTradingError(
          ErrorCode.VALIDATION_ERROR,
          'Trade validation failed',
          'Please check your trade parameters and try again.',
          {
            metadata: { validationErrors: validation.errors }
          }
        );
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate successful trade
      setSuccessMessage(`Successfully placed ${formData.side} order for ${formData.quantity} shares of ${formData.symbol}`);
      
      logger.info(
        LogCategory.TRADING,
        `Trade order placed successfully: ${formData.side} ${formData.quantity} ${formData.symbol}`,
        {
          metadata: {
            orderType: formData.orderType,
            success: true
          }
        }
      );

    } catch (err) {
      handleError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const retrySubmit = retry(() => handleSubmit(new Event('submit') as any));

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Handling Demo</CardTitle>
            <CardDescription>
              This component demonstrates comprehensive error handling with user-friendly messages and recovery options.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error simulation buttons */}
            <div>
              <Label className="text-sm font-medium">Simulate Different Error Types:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simulateError('validation')}
                >
                  Validation Error
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simulateError('insufficient_funds')}
                >
                  Insufficient Funds
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simulateError('market_closed')}
                >
                  Market Closed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simulateError('network')}
                >
                  Network Error
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simulateError('rate_limit')}
                >
                  Rate Limit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simulateError('auth')}
                >
                  Auth Error
                </Button>
              </div>
            </div>

            <Separator />

            {/* Trade form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    value={formData.symbol}
                    onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    placeholder="AAPL"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="side">Side</Label>
                  <select
                    id="side"
                    value={formData.side}
                    onChange={(e) => setFormData(prev => ({ ...prev, side: e.target.value as 'buy' | 'sell' }))}
                    className="w-full p-2 border rounded"
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="orderType">Order Type</Label>
                  <select
                    id="orderType"
                    value={formData.orderType}
                    onChange={(e) => setFormData(prev => ({ ...prev, orderType: e.target.value as 'market' | 'limit' }))}
                    className="w-full p-2 border rounded"
                  >
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                  </select>
                </div>
              </div>

              {formData.orderType === 'limit' && (
                <div>
                  <Label htmlFor="limitPrice">Limit Price</Label>
                  <Input
                    id="limitPrice"
                    type="number"
                    step="0.01"
                    value={formData.limitPrice || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, limitPrice: parseFloat(e.target.value) || undefined }))}
                    placeholder="150.00"
                  />
                </div>
              )}

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Placing Order...' : 'Place Order'}
              </Button>
            </form>

            {/* Success message */}
            {successMessage && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800">{successMessage}</p>
              </div>
            )}

            {/* Error display */}
            <ErrorDisplay
              error={error}
              onRetry={retrySubmit}
              onDismiss={clearError}
            />
          </CardContent>
        </Card>

        {/* Error handling features */}
        <Card>
          <CardHeader>
            <CardTitle>Error Handling Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">User-Friendly Messages</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Clear, non-technical error descriptions</li>
                  <li>• Contextual help based on error type</li>
                  <li>• Actionable guidance for resolution</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Recovery Options</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Automatic retry for transient errors</li>
                  <li>• Direct links to relevant pages</li>
                  <li>• Suggested alternative actions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Comprehensive Logging</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Structured logging with categories</li>
                  <li>• Trade execution tracking</li>
                  <li>• Performance monitoring</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">System Monitoring</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Real-time health checks</li>
                  <li>• Automatic alerting</li>
                  <li>• Performance metrics</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default ErrorHandlingExample;