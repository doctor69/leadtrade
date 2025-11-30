// Integration tests for comprehensive error handling and logging system
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, LogCategory, LogLevel } from '../logger';
import { ErrorHandler, AppError, ErrorCode } from '../error-handler';
import { systemMonitor } from '../monitoring';
import { ValidationService } from '../validation';

// Mock console methods
const mockConsole = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(console, mockConsole);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Logger', () => {
  it('should log messages with correct format', () => {
    logger.info(LogCategory.TRADING, 'Test message', {
      userId: 'user123',
      metadata: { symbol: 'AAPL' }
    });

    expect(mockConsole.info).toHaveBeenCalledWith(
      expect.stringContaining('[User: user123]')
    );
    expect(mockConsole.info).toHaveBeenCalledWith(
      expect.stringContaining('Test message')
    );
  });

  it('should log errors with stack traces', () => {
    const testError = new Error('Test error');
    logger.error(LogCategory.API, 'API failed', {
      error: testError,
      userId: 'user123'
    });

    expect(mockConsole.error).toHaveBeenCalledWith(
      expect.stringContaining('Test error')
    );
  });

  it('should log trade executions with proper metadata', () => {
    logger.logTradeExecution(
      {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        trade_type: 'stock'
      },
      {
        success: true,
        alpacaOrderId: 'order123'
      },
      {
        userId: 'user123'
      }
    );

    expect(mockConsole.info).toHaveBeenCalledWith(
      expect.stringContaining('Trade executed successfully: AAPL buy 100')
    );
  });

  it('should log copy trade executions', () => {
    logger.logCopyTradeExecution(
      {
        id: 'original123',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100
      },
      {
        id: 'copied123',
        allocation_percentage: 25,
        allocated_amount: 1000
      },
      {
        success: true,
        alpacaOrderId: 'order456'
      },
      {
        leaderId: 'leader123',
        followerId: 'follower456'
      }
    );

    expect(mockConsole.info).toHaveBeenCalledWith(
      expect.stringContaining('Copy trade executed: Follower follower456 copied AAPL from Leader leader123')
    );
  });
});

describe('Error Handler', () => {
  it('should create AppError with proper structure', () => {
    const errorHandler = new ErrorHandler();
    const error = errorHandler.createAuthError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(ErrorCode.AUTH_REQUIRED);
    expect(error.userMessage).toBe('Please sign in to continue.');
    expect(error.recoveryOptions).toHaveLength(1);
    expect(error.recoveryOptions[0].action).toBe('signin');
  });

  it('should handle Alpaca API errors correctly', () => {
    const alpacaError = {
      response: {
        status: 401
      }
    };

    const errorHandler = new ErrorHandler();
    const appError = errorHandler.handleError(alpacaError, {
      category: LogCategory.API,
      operation: 'test-operation'
    });

    expect(appError.code).toBe(ErrorCode.AUTH_INVALID);
    expect(appError.userMessage).toContain('trading account credentials are invalid');
    expect(appError.recoveryOptions).toHaveLength(1);
    expect(appError.recoveryOptions[0].url).toBe('/settings');
  });

  it('should handle insufficient funds errors', () => {
    const insufficientFundsError = {
      response: {
        status: 403
      }
    };

    const errorHandler = new ErrorHandler();
    const appError = errorHandler.handleError(insufficientFundsError);

    expect(appError.code).toBe(ErrorCode.INSUFFICIENT_FUNDS);
    expect(appError.userMessage).toContain('buying power');
    expect(appError.recoveryOptions).toHaveLength(2);
    expect(appError.recoveryOptions[0].action).toBe('deposit');
    expect(appError.recoveryOptions[1].action).toBe('reduce_quantity');
  });

  it('should handle rate limit errors', () => {
    const rateLimitError = {
      response: {
        status: 429
      }
    };

    const errorHandler = new ErrorHandler();
    const appError = errorHandler.handleError(rateLimitError);

    expect(appError.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
    expect(appError.retryable).toBe(true);
    expect(appError.userMessage).toContain('Too many requests');
  });

  it('should handle network errors', () => {
    const networkError = {
      code: 'ECONNREFUSED'
    };

    const errorHandler = new ErrorHandler();
    const appError = errorHandler.handleError(networkError);

    expect(appError.code).toBe(ErrorCode.NETWORK_ERROR);
    expect(appError.retryable).toBe(true);
    expect(appError.recoveryOptions).toHaveLength(2);
  });

  it('should handle validation errors', () => {
    const validationError = {
      name: 'ValidationError',
      issues: ['Field is required', 'Invalid format']
    };

    const errorHandler = new ErrorHandler();
    const appError = errorHandler.handleError(validationError);

    expect(appError.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(appError.metadata.validationErrors).toEqual(['Field is required', 'Invalid format']);
  });

  it('should create trading errors with recovery options', () => {
    const tradingError = ErrorHandler.createTradingError(
      ErrorCode.MARKET_CLOSED,
      'Market is closed',
      'Cannot trade while market is closed',
      {
        recoveryOptions: [
          {
            action: 'schedule',
            label: 'Schedule Order',
            description: 'Place order for market open'
          }
        ]
      }
    );

    expect(tradingError.code).toBe(ErrorCode.MARKET_CLOSED);
    expect(tradingError.recoveryOptions).toHaveLength(1);
    expect(tradingError.recoveryOptions[0].action).toBe('schedule');
  });

  it('should create API responses with proper format', () => {
    const errorHandler = new ErrorHandler();
    const error = errorHandler.createAuthError();
    const response = errorHandler.createApiResponse(error);

    expect(response.status).toBe(401);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should wrap async operations with error handling', async () => {
    const failingOperation = async () => {
      throw new Error('Operation failed');
    };

    const errorHandler = new ErrorHandler();
    await expect(
      errorHandler.withErrorHandling(failingOperation, {
        category: LogCategory.TRADING,
        operation: 'test-operation'
      })
    ).rejects.toThrow(AppError);
  });
});

describe('System Monitor', () => {
  it('should record API request metrics', () => {
    systemMonitor.recordApiRequest(true, 150);
    systemMonitor.recordApiRequest(false, 300);

    const dashboardData = systemMonitor.getDashboardData();
    
    expect(dashboardData.performance.metrics.requestCount).toBeGreaterThan(0);
    expect(dashboardData.system.errorRate).toBeGreaterThan(0);
  });

  it('should calculate performance recommendations', () => {
    // Record some slow requests to trigger recommendations
    for (let i = 0; i < 10; i++) {
      systemMonitor.recordApiRequest(false, 3000); // Slow failed requests
    }

    const dashboardData = systemMonitor.getDashboardData();
    
    expect(dashboardData.performance.recommendations.length).toBeGreaterThan(0);
    expect(dashboardData.performance.recommendations.some(rec => 
      rec.includes('High error rate detected')
    )).toBe(true);
  });

  it('should update alert configuration', () => {
    const newConfig = {
      errorRateThreshold: 0.1,
      responseTimeThreshold: 1000
    };

    systemMonitor.updateAlertConfig(newConfig);
    const dashboardData = systemMonitor.getDashboardData();

    expect(dashboardData.alerts.config.errorRateThreshold).toBe(0.1);
    expect(dashboardData.alerts.config.responseTimeThreshold).toBe(1000);
  });
});

describe('Validation Service Integration', () => {
  it('should validate trade execution data', () => {
    const validTrade = {
      symbol: 'AAPL',
      side: 'buy' as const,
      quantity: 100,
      trade_type: 'stock' as const,
      portfolio_percentage: 25
    };

    const result = ValidationService.validateTradeExecution(validTrade);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate trade execution request', () => {
    const validRequest = {
      symbol: 'AAPL',
      side: 'buy' as const,
      quantity: 100,
      type: 'market' as const,
      time_in_force: 'day' as const,
      trade_type: 'stock' as const
    };

    const result = ValidationService.validateTradeExecutionRequest(validRequest);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate option details', () => {
    const validOption = {
      symbol: 'AAPL',
      strike: 150,
      expiration: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      optionType: 'call',
      contractSize: 100,
      premium: 5.50,
      chain: { id: 'chain123' },
      multiplier: 100,
      style: 'american',
      underlyingPrice: 149.50,
      delta: 0.65,
      gamma: 0.03,
      theta: -0.45,
      vega: 0.30,
      impliedVolatility: 0.25,
      openInterest: 1000,
      volume: 500,
      bid: 5.45,
      ask: 5.55
    };

    const result = ValidationService.validateOptionDetails(validOption);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate allocation percentages', () => {
    const result = ValidationService.validateAllocationPercentage(25.5);
    expect(result.isValid).toBe(true);

    const invalidResult = ValidationService.validateAllocationPercentage(150);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.error).toContain('cannot exceed 100%');
  });

  it('should validate total allocation', () => {
    const subscriptions = [
      { allocation_percentage: 30 },
      { allocation_percentage: 40 }
    ] as any[];

    const result = ValidationService.validateTotalAllocation(subscriptions, 20);
    expect(result.isValid).toBe(true);

    const invalidResult = ValidationService.validateTotalAllocation(subscriptions, 40);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.error).toContain('cannot exceed 100%');
  });

  it('should validate proportional trades', () => {
    const result = ValidationService.validateProportionalTrade(
      100, // quantity
      50,  // price
      10000, // follower cash
      50   // allocation percentage
    );

    expect(result.isValid).toBe(true);

    const insufficientResult = ValidationService.validateProportionalTrade(
      100, // quantity
      100, // price
      5000, // follower cash
      50   // allocation percentage
    );

    expect(insufficientResult.isValid).toBe(false);
    expect(insufficientResult.maxQuantity).toBe(25);
    expect(insufficientResult.error).toContain('Insufficient allocated funds');
  });
});

describe('Error Recovery Options', () => {
  it('should provide appropriate recovery options for auth errors', () => {
    const errorHandler = new ErrorHandler();
    const authError = errorHandler.createAuthError();
    
    expect(authError.recoveryOptions).toHaveLength(1);
    expect(authError.recoveryOptions[0]).toEqual({
      action: 'signin',
      label: 'Sign In',
      description: 'Sign in to your account',
      url: '/signin'
    });
  });

  it('should provide recovery options for trading errors', () => {
    const tradingError = ErrorHandler.createTradingError(
      ErrorCode.INSUFFICIENT_FUNDS,
      'Not enough funds',
      'Insufficient buying power',
      {
        recoveryOptions: [
          {
            action: 'deposit',
            label: 'Add Funds',
            description: 'Deposit money to your account'
          }
        ]
      }
    );

    expect(tradingError.recoveryOptions).toHaveLength(1);
    expect(tradingError.recoveryOptions[0].action).toBe('deposit');
  });
});

describe('Logging Categories and Levels', () => {
  it('should support all log categories', () => {
    const categories = [
      LogCategory.AUTH,
      LogCategory.TRADING,
      LogCategory.COPY_TRADING,
      LogCategory.API,
      LogCategory.WEBSOCKET,
      LogCategory.DATABASE,
      LogCategory.SYSTEM
    ];

    categories.forEach(category => {
      logger.info(category, `Test message for ${category}`);
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining(category)
      );
    });
  });

  it('should support all log levels', () => {
    logger.debug(LogCategory.SYSTEM, 'Debug message');
    logger.info(LogCategory.SYSTEM, 'Info message');
    logger.warn(LogCategory.SYSTEM, 'Warning message');
    logger.error(LogCategory.SYSTEM, 'Error message');
    logger.critical(LogCategory.SYSTEM, 'Critical message');

    // Debug might not be called depending on log level, but info and above should be
    expect(mockConsole.info).toHaveBeenCalled();
    expect(mockConsole.warn).toHaveBeenCalled();
    expect(mockConsole.error).toHaveBeenCalled();
  });
});