// Enhanced Alpaca Market Data Edge Function
// Demonstrates comprehensive authentication, rate limiting, error handling, and logging

/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { 
  withAuth, 
  processRequest, 
  createSuccessResponse, 
  createErrorResponse,
  AlpacaClient,
  corsHeaders,
  withRateLimit,
  getRateLimitConfig,
  createLogger,
  logApiRequest,
  logApiResponse,
  handleAlpacaError,
  handleValidationError,
  handleUnexpectedError,
  validateRequest,
  validateEnvironment
} from '../_shared/index.ts'
import type { AuthContext } from '../_shared/auth.ts'

// Schema for market data query parameters
const marketDataQuerySchema = z.object({
  symbols: z.string().min(1, 'At least one symbol is required'),
  timeframe: z.enum(['1Min', '5Min', '15Min', '30Min', '1Hour', '1Day']).default('1Min'),
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.coerce.number().min(1).max(10000).default(100),
  adjustment: z.enum(['raw', 'split', 'dividend', 'all']).default('raw'),
  feed: z.enum(['iex', 'sip']).default('iex'),
  sort: z.enum(['asc', 'desc']).default('desc'),
});

// Schema for real-time quotes
const quotesQuerySchema = z.object({
  symbols: z.string().min(1, 'At least one symbol is required'),
  feed: z.enum(['iex', 'sip']).default('iex'),
});

// Schema for market status
const marketStatusSchema = z.object({
  market: z.enum(['NASDAQ', 'NYSE', 'AMEX']).optional(),
});

/**
 * Enhanced Edge Function handler for Alpaca Market Data
 * 
 * GET /bars - Historical price data (OHLCV bars)
 * GET /quotes - Real-time quotes
 * GET /trades - Recent trades
 * GET /status - Market status
 * 
 * Features:
 * - Comprehensive authentication and authorization
 * - Rate limiting with user-specific limits
 * - Enhanced error handling with user-friendly messages
 * - Detailed logging and monitoring
 * - Input validation with Zod schemas
 * - Environment validation
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Validate environment variables
    const envValidation = validateEnvironment([
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'PUBLIC_ALPACA_PAPER_DATA_BASE_URL',
      'PUBLIC_ALPACA_LIVE_DATA_BASE_URL'
    ]);

    if (!envValidation.isValid) {
      return createErrorResponse(
        {
          code: 'CONFIGURATION_ERROR',
          message: 'Server configuration error',
          details: { missingVars: envValidation.missing }
        },
        500
      );
    }

    // Validate request method
    const methodValidation = validateRequest(req, ['GET']);
    if (methodValidation) return methodValidation;

    return withAuth(req, async (authContext: AuthContext) => {
      // Apply rate limiting based on endpoint
      const url = new URL(req.url);
      const endpoint = url.pathname.split('/').pop() || 'marketData';
      const rateLimitConfig = getRateLimitConfig('marketData');
      
      return withRateLimit(req, rateLimitConfig, authContext.userId, async () => {
        try {
          // Create logger with context
          const logger = createLogger('alpaca-market-data-enhanced', authContext.userId, {
            tradingMode: authContext.tradingMode,
            alpacaAccountId: authContext.alpacaAccountId,
            endpoint
          });
          
          logger.info(`Processing market data request for endpoint: ${endpoint}`);
          
          // Create Alpaca client with auth context
          const alpacaClient = new AlpacaClient(authContext, (message, data) => {
            logger.debug(message, data);
          });

          // Parse URL path to determine endpoint
          const pathSegments = url.pathname.split('/');
          const dataType = pathSegments[pathSegments.length - 1];

          switch (dataType) {
            case 'bars':
              return await handleBarsRequest(req, alpacaClient, logger);
            
            case 'quotes':
              return await handleQuotesRequest(req, alpacaClient, logger);
            
            case 'trades':
              return await handleTradesRequest(req, alpacaClient, logger);
            
            case 'status':
              return await handleMarketStatusRequest(req, alpacaClient, logger);
            
            default:
              logger.warn('Unknown market data endpoint', { dataType });
              return createErrorResponse(
                {
                  code: 'INVALID_ENDPOINT',
                  message: 'Invalid market data endpoint. Available: bars, quotes, trades, status'
                },
                404
              );
          }

        } catch (error) {
          return handleUnexpectedError(error, undefined, 'market data processing');
        }
      });
    });
  });
});

/**
 * Handles historical bars (OHLCV) requests
 */
async function handleBarsRequest(
  req: Request,
  alpacaClient: AlpacaClient,
  logger: any
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams);
    
    // Validate query parameters
    const validatedQuery = marketDataQuerySchema.parse(queryParams);
    
    logger.info('Fetching historical bars', {
      symbols: validatedQuery.symbols,
      timeframe: validatedQuery.timeframe,
      limit: validatedQuery.limit
    });

    // Build API parameters
    const params: Record<string, string> = {
      symbols: validatedQuery.symbols,
      timeframe: validatedQuery.timeframe,
      limit: validatedQuery.limit.toString(),
      adjustment: validatedQuery.adjustment,
      feed: validatedQuery.feed,
      sort: validatedQuery.sort
    };

    if (validatedQuery.start) params.start = validatedQuery.start;
    if (validatedQuery.end) params.end = validatedQuery.end;

    // Make request to Alpaca Data API
    const startTime = Date.now();
    const response = await alpacaClient.dataRequest('/v2/stocks/bars', { params });
    const responseTime = Date.now() - startTime;

    logApiResponse(logger, response.success ? 200 : 400, responseTime, response.success, response.error?.message);

    if (!response.success) {
      return handleAlpacaError(response.error!, logger, 'bars request');
    }

    logger.info('Successfully fetched historical bars', {
      symbolCount: validatedQuery.symbols.split(',').length,
      responseTime
    });

    return createSuccessResponse({
      bars: response.data,
      metadata: {
        symbols: validatedQuery.symbols.split(','),
        timeframe: validatedQuery.timeframe,
        count: response.data?.bars ? Object.keys(response.data.bars).length : 0,
        responseTime
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleValidationError(error, logger, 'bars request');
    }
    return handleUnexpectedError(error, logger, 'bars request');
  }
}

/**
 * Handles real-time quotes requests
 */
async function handleQuotesRequest(
  req: Request,
  alpacaClient: AlpacaClient,
  logger: any
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams);
    
    // Validate query parameters
    const validatedQuery = quotesQuerySchema.parse(queryParams);
    
    logger.info('Fetching real-time quotes', {
      symbols: validatedQuery.symbols
    });

    // Build API parameters
    const params: Record<string, string> = {
      symbols: validatedQuery.symbols,
      feed: validatedQuery.feed
    };

    // Make request to Alpaca Data API
    const startTime = Date.now();
    const response = await alpacaClient.dataRequest('/v2/stocks/quotes/latest', { params });
    const responseTime = Date.now() - startTime;

    logApiResponse(logger, response.success ? 200 : 400, responseTime, response.success, response.error?.message);

    if (!response.success) {
      return handleAlpacaError(response.error!, logger, 'quotes request');
    }

    logger.info('Successfully fetched real-time quotes', {
      symbolCount: validatedQuery.symbols.split(',').length,
      responseTime
    });

    return createSuccessResponse({
      quotes: response.data,
      metadata: {
        symbols: validatedQuery.symbols.split(','),
        feed: validatedQuery.feed,
        count: response.data?.quotes ? Object.keys(response.data.quotes).length : 0,
        responseTime
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleValidationError(error, logger, 'quotes request');
    }
    return handleUnexpectedError(error, logger, 'quotes request');
  }
}

/**
 * Handles recent trades requests
 */
async function handleTradesRequest(
  req: Request,
  alpacaClient: AlpacaClient,
  logger: any
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams);
    
    // Validate query parameters (reuse quotes schema for simplicity)
    const validatedQuery = quotesQuerySchema.parse(queryParams);
    
    logger.info('Fetching recent trades', {
      symbols: validatedQuery.symbols
    });

    // Build API parameters
    const params: Record<string, string> = {
      symbols: validatedQuery.symbols,
      feed: validatedQuery.feed
    };

    // Make request to Alpaca Data API
    const startTime = Date.now();
    const response = await alpacaClient.dataRequest('/v2/stocks/trades/latest', { params });
    const responseTime = Date.now() - startTime;

    logApiResponse(logger, response.success ? 200 : 400, responseTime, response.success, response.error?.message);

    if (!response.success) {
      return handleAlpacaError(response.error!, logger, 'trades request');
    }

    logger.info('Successfully fetched recent trades', {
      symbolCount: validatedQuery.symbols.split(',').length,
      responseTime
    });

    return createSuccessResponse({
      trades: response.data,
      metadata: {
        symbols: validatedQuery.symbols.split(','),
        feed: validatedQuery.feed,
        count: response.data?.trades ? Object.keys(response.data.trades).length : 0,
        responseTime
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleValidationError(error, logger, 'trades request');
    }
    return handleUnexpectedError(error, logger, 'trades request');
  }
}

/**
 * Handles market status requests
 */
async function handleMarketStatusRequest(
  req: Request,
  alpacaClient: AlpacaClient,
  logger: any
): Promise<Response> {
  try {
    logger.info('Fetching market status');

    // Make request to Alpaca Data API
    const startTime = Date.now();
    const response = await alpacaClient.dataRequest('/v2/stocks/meta/conditions');
    const responseTime = Date.now() - startTime;

    logApiResponse(logger, response.success ? 200 : 400, responseTime, response.success, response.error?.message);

    if (!response.success) {
      return handleAlpacaError(response.error!, logger, 'market status request');
    }

    logger.info('Successfully fetched market status', { responseTime });

    return createSuccessResponse({
      status: response.data,
      metadata: {
        responseTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    return handleUnexpectedError(error, logger, 'market status request');
  }
}