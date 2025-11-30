// Comprehensive error handling system for copy trading platform
import { logger, LogCategory } from './logger';

export enum ErrorCode {
  // Authentication errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_ERROR = 'AUTH_ERROR',
  
  // Trading errors
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_SYMBOL = 'INVALID_SYMBOL',
  MARKET_CLOSED = 'MARKET_CLOSED',
  ORDER_REJECTED = 'ORDER_REJECTED',
  POSITION_NOT_FOUND = 'POSITION_NOT_FOUND',
  
  // Copy trading errors
  ALLOCATION_EXCEEDED = 'ALLOCATION_EXCEEDED',
  LEADER_NOT_FOUND = 'LEADER_NOT_FOUND',
  SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
  SELF_FOLLOW_ATTEMPT = 'SELF_FOLLOW_ATTEMPT',
  
  // API errors
  ALPACA_API_ERROR = 'ALPACA_API_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

export interface RecoveryOption {
  action: string;
  label: string;
  description: string;
  url?: string;
  callback?: () => void;
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly statusCode: number = 500,
    public readonly userMessage?: string,
    public readonly recoveryOptions: RecoveryOption[] = [],
    public readonly metadata: Record<string, any> = {},
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ErrorHandler {
  /**
   * Create a copy trading-specific error
   */
  static createCopyTradingError(
    code: ErrorCode,
    message: string,
    userMessage: string,
    options?: {
      recoveryOptions?: RecoveryOption[];
      metadata?: Record<string, any>;
      retryable?: boolean;
    }
  ): AppError {
    return new AppError(
      message,
      code,
      400,
      userMessage,
      options?.recoveryOptions || [],
      options?.metadata || {},
      options?.retryable || false
    );
  }

  /**
   * Create a trading-specific error
   */
  static createTradingError(
    code: ErrorCode,
    message: string,
    userMessage: string,
    options?: {
      recoveryOptions?: RecoveryOption[];
      metadata?: Record<string, any>;
      retryable?: boolean;
    }
  ): AppError {
    return new AppError(
      message,
      code,
      400,
      userMessage,
      options?.recoveryOptions || [],
      options?.metadata || {},
      options?.retryable || false
    );
  }

  /**
   * Create a standardized error response
   */
  handleError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Handle Alpaca API errors
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 401) {
        return new AppError(
          'Alpaca API authentication failed',
          ErrorCode.AUTH_INVALID,
          401,
          'Your trading account credentials are invalid. Please reconnect your account.',
          [
            {
              action: 'reconnect',
              label: 'Reconnect Account',
              description: 'Update your trading account credentials',
              url: '/settings'
            }
          ]
        );
      }

      if (apiError.response?.status === 403) {
        return new AppError(
          'Insufficient buying power',
          ErrorCode.INSUFFICIENT_FUNDS,
          403,
          'You don\'t have enough buying power to execute this trade.',
          [
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
        );
      }

      if (apiError.response?.status === 429) {
        return new AppError(
          'API rate limit exceeded',
          ErrorCode.RATE_LIMIT_EXCEEDED,
          429,
          'Too many requests. Please wait a moment before trying again.',
          [
            {
              action: 'retry',
              label: 'Try Again',
              description: 'Wait a few seconds and retry your request'
            }
          ],
          {},
          true
        );
      }
    }

    // Handle network errors
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const networkError = error as { code?: string };
      if (networkError.code === 'ECONNREFUSED' || networkError.code === 'ENOTFOUND') {
        return new AppError(
          'Network connection failed',
          ErrorCode.NETWORK_ERROR,
          503,
          'Unable to connect to trading services. Please check your internet connection.',
          [
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
          ],
          {},
          true
        );
      }
    }

    // Handle validation errors
    if (typeof error === 'object' && error !== null && ('name' in error || 'issues' in error)) {
      const validationError = error as { name?: string; issues?: any; errors?: any };
      if (validationError.name === 'ValidationError' || validationError.issues) {
        return new AppError(
          'Input validation failed',
          ErrorCode.VALIDATION_ERROR,
          400,
          'Please check your input and try again.',
          [],
          { validationErrors: validationError.issues || validationError.errors }
        );
      }
    }

    // Handle database errors
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const dbError = error as { code?: string; message?: string };
      if (dbError.code?.startsWith('23') || dbError.message?.includes('duplicate key')) {
        return new AppError(
          'Database constraint violation',
          ErrorCode.DATABASE_ERROR,
          409,
          'This operation conflicts with existing data. Please try a different approach.'
        );
      }
    }

    // Handle market closed errors
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const marketError = error as { message?: string };
      if (marketError.message?.toLowerCase().includes('market') && marketError.message?.toLowerCase().includes('closed')) {
        return new AppError(
          'Market is closed',
          ErrorCode.MARKET_CLOSED,
          400,
          'The market is currently closed. You can place orders that will execute when the market opens.',
          [
            {
              action: 'schedule',
              label: 'Schedule Order',
              description: 'Place an order to execute when the market opens'
            }
          ]
        );
      }
    }

    logger.error(LogCategory.ERROR, 'Unhandled error', {
      error: error instanceof Error ? error : new Error('Unknown error')
    });

    return new AppError(
      error instanceof Error ? error.message : 'Internal server error',
      ErrorCode.INTERNAL_ERROR,
      500,
      'Something went wrong. Our team has been notified and is working on a fix.',
      [
        {
          action: 'retry',
          label: 'Try Again',
          description: 'Retry your last action'
        },
        {
          action: 'refresh',
          label: 'Refresh Page',
          description: 'Reload the page to start fresh'
        }
      ],
      {},
      true
    );
  }

  /**
   * Create authentication error
   */
  createAuthError(message?: string): AppError {
    return new AppError(
      message || 'Authentication required',
      ErrorCode.AUTH_REQUIRED,
      401,
      'Please sign in to continue.',
      [
        {
          action: 'signin',
          label: 'Sign In',
          description: 'Sign in to your account',
          url: '/signin'
        }
      ]
    );
  }

  /**
   * Create API response
   */
  createApiResponse(error: AppError): Response {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: error.code,
          message: error.userMessage,
          recoveryOptions: error.recoveryOptions,
          retryable: error.retryable
        }
      }),
      {
        status: error.statusCode,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  /**
   * Wrap async operation with error handling
   */
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: {
      category?: LogCategory;
      userId?: string;
      tradeId?: string;
      requestId?: string;
      operation?: string;
    }
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export const errorHandler = new ErrorHandler();