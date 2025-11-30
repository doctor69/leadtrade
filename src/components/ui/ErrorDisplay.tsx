// User-friendly error display component with recovery options
import React from 'react';
import { AlertTriangle, RefreshCw, Settings, CreditCard, Clock, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import type { AppError, RecoveryOption } from '../../lib/error-handler';

interface ErrorDisplayProps {
  error: AppError | Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

interface RecoveryActionProps {
  option: RecoveryOption;
  onAction: (action: string) => void;
}

const RecoveryAction: React.FC<RecoveryActionProps> = ({ option, onAction }) => {
  const getIcon = (action: string) => {
    switch (action) {
      case 'retry':
        return <RefreshCw className="h-4 w-4" />;
      case 'reconnect':
      case 'signin':
        return <Settings className="h-4 w-4" />;
      case 'deposit':
        return <CreditCard className="h-4 w-4" />;
      case 'schedule':
        return <Clock className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const handleClick = () => {
    if (option.url) {
      window.location.href = option.url;
    } else if (option.callback) {
      option.callback();
    } else {
      onAction(option.action);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="flex items-center gap-2"
    >
      {getIcon(option.action)}
      {option.label}
    </Button>
  );
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  className = ''
}) => {
  if (!error) return null;

  const isAppError = error instanceof Error && 'code' in error;
  const appError = isAppError ? (error as AppError) : null;

  const getErrorSeverity = (error: AppError | Error) => {
    if (appError?.code) {
      const criticalCodes = ['INTERNAL_ERROR', 'SERVICE_UNAVAILABLE', 'DATABASE_ERROR'];
      const warningCodes = ['RATE_LIMIT_EXCEEDED', 'MARKET_CLOSED', 'INSUFFICIENT_FUNDS'];
      
      if (criticalCodes.includes(appError.code)) return 'destructive';
      if (warningCodes.includes(appError.code)) return 'default';
    }
    return 'destructive';
  };

  const getErrorIcon = (error: AppError | Error) => {
    return <AlertTriangle className="h-4 w-4" />;
  };

  const handleRecoveryAction = (action: string) => {
    switch (action) {
      case 'retry':
        onRetry?.();
        break;
      case 'refresh':
        window.location.reload();
        break;
      case 'dismiss':
        onDismiss?.();
        break;
      default:
        console.log(`Recovery action: ${action}`);
    }
  };

  const userMessage = appError?.userMessage || error.message || 'An unexpected error occurred';
  const recoveryOptions = appError?.recoveryOptions || [];
  const isRetryable = appError?.retryable || false;

  return (
    <div className={`space-y-4 ${className}`}>
      <Alert variant={getErrorSeverity(error)}>
        {getErrorIcon(error)}
        <AlertTitle>
          {appError?.code ? `Error: ${appError.code.replace(/_/g, ' ')}` : 'Error'}
        </AlertTitle>
        <AlertDescription className="mt-2">
          {userMessage}
        </AlertDescription>
      </Alert>

      {(recoveryOptions.length > 0 || isRetryable) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">What can you do?</CardTitle>
            <CardDescription>
              Here are some actions you can take to resolve this issue:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recoveryOptions.map((option, index) => (
                <RecoveryAction
                  key={index}
                  option={option}
                  onAction={handleRecoveryAction}
                />
              ))}
              
              {isRetryable && onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              )}
              
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="flex items-center gap-2"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {appError?.metadata && Object.keys(appError.metadata).length > 0 && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            Technical Details
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify(appError.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

// Hook for handling errors in React components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<AppError | Error | null>(null);

  const handleError = React.useCallback((error: AppError | Error) => {
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const retry = React.useCallback((operation: () => Promise<void> | void) => {
    return async () => {
      try {
        clearError();
        await operation();
      } catch (err) {
        handleError(err as Error);
      }
    };
  }, [handleError, clearError]);

  return {
    error,
    handleError,
    clearError,
    retry
  };
};

// Error boundary component for catching React errors
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{
    fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  }>,
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.retry} />;
      }

      return (
        <ErrorDisplay
          error={this.state.error}
          onRetry={this.retry}
          className="m-4"
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorDisplay;