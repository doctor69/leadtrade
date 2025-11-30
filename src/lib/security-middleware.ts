// Comprehensive security middleware for API endpoints
import { SecurityService, RATE_LIMITS, SUSPICIOUS_PATTERNS } from './security-config';
import { ValidationService } from './validation';
import { logger, LogCategory } from './logger';
import { errorHandler, ErrorCode } from './error-handler';
import { withRateLimit } from './api-middleware';

export interface SecurityMiddlewareOptions {
  requireAuth?: boolean;
  rateLimitKey?: keyof typeof RATE_LIMITS;
  validateInput?: boolean;
  logActivity?: boolean;
  checkSuspiciousActivity?: boolean;
  sanitizeInput?: boolean;
}

/**
 * Comprehensive security middleware that can be applied to any API endpoint
 */
export function withSecurityMiddleware<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  options: SecurityMiddlewareOptions = {}
) {
  const {
    requireAuth = true,
    rateLimitKey = 'api_general',
    validateInput = true,
    logActivity = true,
    checkSuspiciousActivity = true,
    sanitizeInput = true
  } = options;

  // Apply rate limiting first
  const rateLimitConfig = RATE_LIMITS[rateLimitKey];
  const rateLimitedHandler = withRateLimit(handler, {
    maxRequests: rateLimitConfig.maxRequests,
    windowMs: rateLimitConfig.windowMs,
    keyGenerator: (request: Request) => {
      const authHeader = request.headers.get('authorization');
      const ip = getClientIP(request);
      return authHeader ? `${rateLimitKey}_${authHeader.slice(-10)}` : `${rateLimitKey}_${ip}`;
    }
  });

  return async (...args: T): Promise<R> => {
    const request = args[0] as Request;
    const startTime = Date.now();
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    try {
      // 1. Validate request security
      if (validateInput) {
        const securityValidation = SecurityService.validateRequestSecurity(request);
        if (!securityValidation.isValid) {
          throw errorHandler.createTradingError(
            ErrorCode.VALIDATION_ERROR,
            'Request security validation failed',
            'Invalid request format or headers',
            {
              metadata: { errors: securityValidation.errors },
              retryable: false
            }
          );
        }
      }

      // 2. Check for suspicious activity
      if (checkSuspiciousActivity && SecurityService.isBlocked(clientIP)) {
        SecurityService.logSuspiciousActivity(clientIP, {
          type: 'blocked_request_attempt',
          details: {
            endpoint: new URL(request.url).pathname,
            userAgent,
            method: request.method
          },
          timestamp: new Date(),
          severity: 'high'
        });

        throw errorHandler.createTradingError(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Access temporarily blocked',
          'Your access has been temporarily blocked due to suspicious activity',
          {
            retryable: true,
            metadata: { blockReason: 'suspicious_activity' }
          }
        );
      }

      // 3. Sanitize input if needed
      let sanitizedRequest = request;
      if (sanitizeInput && (request.method === 'POST' || request.method === 'PUT')) {
        try {
          const body = await SecurityService.sanitizeRequestBody(request);
          if (body) {
            sanitizedRequest = new Request(request.url, {
              method: request.method,
              headers: request.headers,
              body: JSON.stringify(body)
            });
          }
        } catch (error) {
          throw errorHandler.createTradingError(
            ErrorCode.VALIDATION_ERROR,
            'Request body validation failed',
            'Invalid request data format',
            {
              metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
              retryable: false
            }
          );
        }
      }

      // 4. Log activity if enabled
      if (logActivity) {
        logger.info(
          LogCategory.SECURITY,
          `Secure API request: ${request.method} ${new URL(request.url).pathname}`,
          {
            metadata: {
              clientIP,
              userAgent,
              rateLimitKey,
              requireAuth
            }
          }
        );
      }

      // 5. Execute the rate-limited handler with sanitized request
      const updatedArgs = [sanitizedRequest, ...args.slice(1)] as T;
      const result = await rateLimitedHandler(...updatedArgs);

      // 6. Log successful completion
      const responseTime = Date.now() - startTime;
      if (logActivity) {
        logger.info(
          LogCategory.SECURITY,
          `Secure API request completed successfully`,
          {
            metadata: {
              endpoint: new URL(request.url).pathname,
              responseTime,
              clientIP
            }
          }
        );
      }

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Log security-related errors
      if (checkSuspiciousActivity) {
        const severity = error instanceof Error && error.message.includes('rate limit') ? 'medium' : 'low';
        
        SecurityService.logSuspiciousActivity(clientIP, {
          type: 'api_error',
          details: {
            endpoint: new URL(request.url).pathname,
            error: error instanceof Error ? error.message : 'Unknown error',
            userAgent,
            responseTime
          },
          timestamp: new Date(),
          severity
        });
      }

      // Log the error
      logger.error(
        LogCategory.SECURITY,
        `Secure API request failed`,
        {
          error: error as Error,
          metadata: {
            endpoint: new URL(request.url).pathname,
            clientIP,
            responseTime,
            rateLimitKey
          }
        }
      );

      throw error;
    }
  };
}

/**
 * Security middleware specifically for trading operations
 */
export function withTradingSecurityMiddleware<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  options: { operation: string } = { operation: 'trading' }
) {
  return withSecurityMiddleware(handler, {
    requireAuth: true,
    rateLimitKey: 'trade_execution',
    validateInput: true,
    logActivity: true,
    checkSuspiciousActivity: true,
    sanitizeInput: true
  });
}

/**
 * Security middleware for authentication operations
 */
export function withAuthSecurityMiddleware<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  options: { operation: 'login' | 'logout' | 'signup' } = { operation: 'login' }
) {
  return withSecurityMiddleware(handler, {
    requireAuth: false,
    rateLimitKey: options.operation,
    validateInput: true,
    logActivity: true,
    checkSuspiciousActivity: true,
    sanitizeInput: true
  });
}

/**
 * Security middleware for copy trading operations
 */
export function withCopyTradingSecurityMiddleware<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  options: { operation: string } = { operation: 'copy_trading' }
) {
  return withSecurityMiddleware(handler, {
    requireAuth: true,
    rateLimitKey: 'subscription_create',
    validateInput: true,
    logActivity: true,
    checkSuspiciousActivity: true,
    sanitizeInput: true
  });
}

/**
 * Security middleware for market data operations
 */
export function withMarketDataSecurityMiddleware<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return withSecurityMiddleware(handler, {
    requireAuth: true,
    rateLimitKey: 'market_data',
    validateInput: false, // Market data requests typically don't have complex input
    logActivity: false, // Market data requests are frequent, reduce logging
    checkSuspiciousActivity: true,
    sanitizeInput: false
  });
}

/**
 * Get client IP address from request headers
 */
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  
  return 'unknown';
}

/**
 * Enhanced input validation for trading requests
 */
export function validateTradingInput(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic security validation
  const securityValidation = SecurityService.validateTradingRequest(data);
  if (!securityValidation.isValid) {
    errors.push(...securityValidation.errors);
  }
  
  // Additional trading-specific validation
  if (data.symbol) {
    try {
      ValidationService.sanitizeSymbol(data.symbol);
    } catch (error) {
      errors.push('Invalid symbol format');
    }
  }
  
  if (data.quantity && (data.quantity <= 0 || data.quantity > 100000)) {
    errors.push('Quantity must be between 1 and 100,000');
  }
  
  if (data.price && (data.price <= 0 || data.price > 50000)) {
    errors.push('Price must be between $0.01 and $50,000');
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Create secure response with security headers
 */
export function createSecureApiResponse<T>(
  data: T,
  options?: {
    status?: number;
    message?: string;
    metadata?: Record<string, any>;
  }
): Response {
  return SecurityService.createSecureResponse(data, options);
}

/**
 * Middleware to detect and prevent API abuse patterns
 */
export function withAbuseDetection<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  options: {
    maxRequestsPerMinute?: number;
    maxFailuresPerHour?: number;
    blockDurationMinutes?: number;
  } = {}
) {
  const {
    maxRequestsPerMinute = 100,
    maxFailuresPerHour = 20,
    blockDurationMinutes = 15
  } = options;

  return async (...args: T): Promise<R> => {
    const request = args[0] as Request;
    const clientIP = getClientIP(request);
    const now = Date.now();

    try {
      // Check current request rate
      const recentRequests = getRecentActivity(clientIP, 'requests', 60 * 1000);
      if (recentRequests.length > maxRequestsPerMinute) {
        SecurityService.logSuspiciousActivity(clientIP, {
          type: 'rate_abuse',
          details: {
            requestCount: recentRequests.length,
            timeWindow: '1 minute',
            endpoint: new URL(request.url).pathname
          },
          timestamp: new Date(),
          severity: 'high'
        });

        throw errorHandler.createTradingError(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Request rate limit exceeded',
          'Too many requests. Please slow down.',
          { retryable: true }
        );
      }

      // Execute handler
      const result = await handler(...args);
      
      // Log successful request
      logActivity(clientIP, 'requests', now);
      
      return result;

    } catch (error) {
      // Log failed request
      logActivity(clientIP, 'failures', now);
      
      // Check failure rate
      const recentFailures = getRecentActivity(clientIP, 'failures', 60 * 60 * 1000);
      if (recentFailures.length > maxFailuresPerHour) {
        SecurityService.logSuspiciousActivity(clientIP, {
          type: 'failure_abuse',
          details: {
            failureCount: recentFailures.length,
            timeWindow: '1 hour',
            endpoint: new URL(request.url).pathname
          },
          timestamp: new Date(),
          severity: 'high'
        });
      }

      throw error;
    }
  };
}

// Simple in-memory activity tracking (in production, use Redis or database)
const activityLog = new Map<string, { requests: number[]; failures: number[] }>();

function getRecentActivity(identifier: string, type: 'requests' | 'failures', windowMs: number): number[] {
  const activity = activityLog.get(identifier) || { requests: [], failures: [] };
  const cutoff = Date.now() - windowMs;
  return activity[type].filter(timestamp => timestamp > cutoff);
}

function logActivity(identifier: string, type: 'requests' | 'failures', timestamp: number): void {
  if (!activityLog.has(identifier)) {
    activityLog.set(identifier, { requests: [], failures: [] });
  }
  
  const activity = activityLog.get(identifier)!;
  activity[type].push(timestamp);
  
  // Keep only recent activity (last 24 hours)
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  activity.requests = activity.requests.filter(t => t > cutoff);
  activity.failures = activity.failures.filter(t => t > cutoff);
}