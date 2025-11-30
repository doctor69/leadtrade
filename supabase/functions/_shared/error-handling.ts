// Comprehensive error handling utilities for Supabase Edge Functions

import { createErrorResponse, ERROR_CODES } from './response.ts';
import type { Logger } from './logging.ts';

export interface AlpacaApiError {
  code?: string;
  message: string;
  status?: number;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Handles Alpaca API errors and converts them to standardized responses
 */
export function handleAlpacaError(
  error: AlpacaApiError,
  logger?: Logger,
  context?: string
): Response {
  if (logger) {
    logger.error(`Alpaca API error${context ? ` in ${context}` : ''}`, undefined, {
      alpacaError: error
    });
  }

  // Map common Alpaca errors to user-friendly messages
  let userMessage = error.message;
  let errorCode = error.code || ERROR_CODES.ALPACA_API_ERROR;

  if (error.message.includes('insufficient_funds')) {
    userMessage = 'Insufficient funds to complete this order';
    errorCode = 'INSUFFICIENT_FUNDS';
  } else if (error.message.includes('invalid_symbol')) {
    userMessage = 'Invalid stock symbol';
    errorCode = 'INVALID_SYMBOL';
  } else if (error.message.includes('market_closed')) {
    userMessage = 'Market is currently closed';
    errorCode = 'MARKET_CLOSED';
  } else if (error.message.includes('order_not_found')) {
    userMessage = 'Order not found';
    errorCode = 'ORDER_NOT_FOUND';
  } else if (error.message.includes('position_not_found')) {
    userMessage = 'Position not found';
    errorCode = 'POSITION_NOT_FOUND';
  } else if (error.message.includes('account_suspended')) {
    userMessage = 'Account is suspended. Please contact support.';
    errorCode = 'ACCOUNT_SUSPENDED';
  } else if (error.message.includes('day_trading_buying_power_exceeded')) {
    userMessage = 'Day trading buying power exceeded';
    errorCode = 'DAY_TRADING_LIMIT_EXCEEDED';
  } else if (error.message.includes('pattern_day_trader')) {
    userMessage = 'Pattern day trader restrictions apply';
    errorCode = 'PATTERN_DAY_TRADER_RESTRICTION';
  }

  return createErrorResponse(
    {
      code: errorCode,
      message: userMessage,
      details: error.details
    },
    error.status || 400
  );
}

/**
 * Handles validation errors from Zod or custom validation
 */
export function handleValidationError(
  errors: ValidationError[] | any,
  logger?: Logger,
  context?: string
): Response {
  if (logger) {
    logger.warn(`Validation error${context ? ` in ${context}` : ''}`, {
      validationErrors: errors
    });
  }

  let formattedErrors: ValidationError[];

  // Handle Zod errors
  if (errors && typeof errors === 'object' && 'errors' in errors) {
    formattedErrors = errors.errors.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.received
    }));
  } else if (Array.isArray(errors)) {
    formattedErrors = errors;
  } else {
    formattedErrors = [{
      field: 'unknown',
      message: 'Validation failed',
      value: errors
    }];
  }

  return createErrorResponse(
    {
      code: ERROR_CODES.INVALID_REQUEST,
      message: 'Validation failed',
      details: {
        errors: formattedErrors
      }
    },
    400
  );
}

/**
 * Handles authentication errors
 */
export function handleAuthError(
  message: string,
  logger?: Logger,
  context?: string
): Response {
  if (logger) {
    logger.warn(`Authentication error${context ? ` in ${context}` : ''}`, {
      authError: message
    });
  }

  return createErrorResponse(
    {
      code: ERROR_CODES.AUTHENTICATION_FAILED,
      message: message || 'Authentication failed'
    },
    401
  );
}

/**
 * Handles database errors
 */
export function handleDatabaseError(
  error: any,
  logger?: Logger,
  context?: string
): Response {
  if (logger) {
    logger.error(`Database error${context ? ` in ${context}` : ''}`, error instanceof Error ? error : undefined, {
      databaseError: error
    });
  }

  // Don't expose internal database errors to users
  return createErrorResponse(
    {
      code: ERROR_CODES.DATABASE_ERROR,
      message: 'A database error occurred. Please try again later.'
    },
    500
  );
}

/**
 * Handles unexpected errors
 */
export function handleUnexpectedError(
  error: unknown,
  logger?: Logger,
  context?: string
): Response {
  if (logger) {
    logger.error(`Unexpected error${context ? ` in ${context}` : ''}`, error instanceof Error ? error : undefined, {
      unexpectedError: error
    });
  }

  return createErrorResponse(
    {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred. Please try again later.'
    },
    500
  );
}

/**
 * Validates required environment variables
 */
export function validateEnvironment(
  requiredVars: string[],
  logger?: Logger
): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!Deno.env.get(varName)) {
      missing.push(varName);
    }
  }

  if (missing.length > 0 && logger) {
    logger.error('Missing required environment variables', undefined, {
      missingVars: missing
    });
  }

  return {
    isValid: missing.length === 0,
    missing
  };
}

/**
 * Validates request method
 */
export function validateMethod(
  req: Request,
  allowedMethods: string[],
  logger?: Logger
): Response | null {
  if (!allowedMethods.includes(req.method)) {
    if (logger) {
      logger.warn('Invalid request method', {
        method: req.method,
        allowedMethods
      });
    }

    return createErrorResponse(
      {
        code: ERROR_CODES.INVALID_REQUEST,
        message: `Method ${req.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`
      },
      405
    );
  }

  return null;
}

/**
 * Validates content type for POST/PUT requests
 */
export function validateContentType(
  req: Request,
  expectedType: string = 'application/json',
  logger?: Logger
): Response | null {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers.get('Content-Type');
    
    if (!contentType || !contentType.includes(expectedType)) {
      if (logger) {
        logger.warn('Invalid content type', {
          contentType,
          expectedType
        });
      }

      return createErrorResponse(
        {
          code: ERROR_CODES.INVALID_REQUEST,
          message: `Invalid content type. Expected: ${expectedType}`
        },
        400
      );
    }
  }

  return null;
}

/**
 * Comprehensive request validator
 */
export function validateRequest(
  req: Request,
  allowedMethods: string[],
  logger?: Logger
): Response | null {
  // Validate method
  const methodError = validateMethod(req, allowedMethods, logger);
  if (methodError) return methodError;

  // Validate content type for body-containing requests
  const contentTypeError = validateContentType(req, 'application/json', logger);
  if (contentTypeError) return contentTypeError;

  return null;
}