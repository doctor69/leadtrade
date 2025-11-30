// @ts-ignore - Next.js types
import type { NextApiRequest, NextApiResponse } from 'next';
import { logger, LogCategory } from './logger';
import { ValidationService } from './validation';
import { getUserTradingMode } from './trading-config';
import { AppError, ErrorCode } from './error-handler';
import type { CopyTradingSubscription } from '../types/trading';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    recoveryOptions?: Array<{
      action: string;
      label: string;
      description: string;
      url?: string;
    }>;
    retryable?: boolean;
  };
}

/**
 * Create a standardized API response
 */
export function createApiResponse<T>(
  data?: T,
  error?: AppError,
  status = 200
): { response: ApiResponse<T>; status: number } {
  if (error) {
    return {
      response: {
        success: false,
        error: {
          code: error.code,
          message: error.userMessage || error.message,
          recoveryOptions: error.recoveryOptions,
          retryable: error.retryable
        }
      },
      status: error.statusCode || 500
    };
  }

  return {
    response: {
      success: true,
      data
    },
    status
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: any, status = 500): Response {
  const appError = error instanceof AppError ? error : new AppError(
    error instanceof Error ? error.message : 'Internal server error',
    ErrorCode.INTERNAL_ERROR,
    status,
    'Something went wrong. Our team has been notified and is working on a fix.'
  );

  const { response } = createApiResponse(null, appError);
  
  return new Response(JSON.stringify(response), {
    status: appError.statusCode || status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Base API middleware
 */
export function withApiMiddleware(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Log request
      logger.info(LogCategory.SYSTEM, `API Request: ${req.method} ${req.url}`, {
        metadata: {
          method: req.method,
          url: req.url,
          query: req.query,
          body: req.body
        }
      });

      // Execute handler and get result
      const result = await handler(req, res);
      
      // If response hasn't been sent yet and result exists, send it
      if (!res.headersSent && result !== undefined) {
        const { response, status } = createApiResponse(result);
        res.status(status).json(response);
      }

    } catch (error) {
      logger.error(LogCategory.SYSTEM, `API Error`, {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: {
          method: req.method,
          url: req.url
        }
      });

      const appError = error instanceof AppError ? error : new AppError(
        error instanceof Error ? error.message : 'Internal server error',
        ErrorCode.INTERNAL_ERROR,
        500,
        'Something went wrong. Our team has been notified and is working on a fix.'
      );

      // Only send error response if response hasn't been sent yet
      if (!res.headersSent) {
        const { response, status } = createApiResponse(null, appError);
        res.status(status).json(response);
      }
    }
  };
}

/**
 * Trading-specific middleware
 */
export function withTradingMiddleware(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return withApiMiddleware(async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Validate auth token
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new AppError(
          'Missing authentication token',
          ErrorCode.AUTH_REQUIRED,
          401,
          'Please sign in to continue.'
        );
      }

      // Validate trading mode
      const tradingMode = await getUserTradingMode(token);
      if (!tradingMode) {
        throw new AppError(
          'Invalid trading mode',
          ErrorCode.VALIDATION_ERROR,
          400,
          'Trading mode is not properly configured.'
        );
      }

      // Add trading mode to request
      (req as any).tradingMode = tradingMode;

      await handler(req, res);

    } catch (error) {
      throw error; // Let base middleware handle error
    }
  });
}

/**
 * Copy trading specific middleware
 */
export function withCopyTradingMiddleware(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return withTradingMiddleware(async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Validate subscription
      const { follower_id, leader_id } = req.body;
      if (!follower_id || !leader_id) {
        throw new AppError(
          'Missing required fields',
          ErrorCode.VALIDATION_ERROR,
          400,
          'Please provide both follower and leader IDs.'
        );
      }

      // Validate subscription exists and is active
      const isValidSubscription = await ValidationService.validateSubscription({
        follower_id,
        leader_id,
        allocation_percentage: req.body.allocation_percentage
      } as Partial<CopyTradingSubscription>);

      if (!isValidSubscription.isValid) {
        throw new AppError(
          isValidSubscription.errors.join(', '),
          ErrorCode.VALIDATION_ERROR,
          400,
          'Invalid subscription configuration.'
        );
      }

      await handler(req, res);

    } catch (error) {
      throw error; // Let base middleware handle error
    }
  });
}

/**
 * Database error handling middleware
 */
export function withDatabaseErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
  return operation().catch(error => {
    logger.error(LogCategory.SYSTEM, `Database error`, {
      error: error instanceof Error ? error : new Error('Unknown error')
    });
    throw new AppError(
      'Database operation failed',
      ErrorCode.DATABASE_ERROR,
      500,
      'A database error occurred. Please try again later.'
    );
  });
}

/**
 * External API error handling middleware
 */
export function withExternalApiErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
  return operation().catch(error => {
    logger.error(LogCategory.SYSTEM, `External API error`, {
      error: error instanceof Error ? error : new Error('Unknown error')
    });
    throw new AppError(
      'External API request failed',
      ErrorCode.EXTERNAL_API_ERROR,
      502,
      'Unable to communicate with external service. Please try again later.'
    );
  });
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  maxRequests: number,
  windowMs: number,
  keyGenerator?: (req: NextApiRequest) => string
) {
  const requests = new Map<string, number[]>();

  return function(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>) {
    return withApiMiddleware(async (req: NextApiRequest, res: NextApiResponse) => {
      const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown';
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get existing requests in window
      const requestTimes = requests.get(key) || [];
      const requestsInWindow = requestTimes.filter(time => time > windowStart);

      if (requestsInWindow.length >= maxRequests) {
        throw new AppError(
          'Rate limit exceeded',
          ErrorCode.RATE_LIMIT_EXCEEDED,
          429,
          'Too many requests. Please wait before trying again.',
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

      // Add current request
      requestsInWindow.push(now);
      requests.set(key, requestsInWindow);

      // Clean up old requests
      requests.forEach((times, key) => {
        const validTimes = times.filter(time => time > windowStart);
        if (validTimes.length === 0) {
          requests.delete(key);
        } else {
          requests.set(key, validTimes);
        }
      });

      return handler(req, res);
    });
  };
}