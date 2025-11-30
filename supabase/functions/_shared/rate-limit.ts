// Rate limiting utility for Supabase Edge Functions
// Uses in-memory storage for simplicity (could be enhanced with Redis for production)

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit storage
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request, userId?: string) => string; // Custom key generator
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Default rate limit configurations for different endpoints
 */
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints - more restrictive
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
  },
  signup: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 signup attempts per hour
  },
  
  // Trading endpoints - moderate limits
  orders: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 orders per minute
  },
  positions: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
  
  // Market data endpoints - higher limits
  marketData: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
  
  // Account management - moderate limits
  account: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute
  },
  
  // Funding operations - more restrictive
  funding: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 funding operations per hour
  },
  
  // Default fallback
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50, // 50 requests per minute
  }
};

/**
 * Default key generator - uses IP address and user ID if available
 */
function defaultKeyGenerator(req: Request, userId?: string): string {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  return userId ? `${userId}:${ip}` : ip;
}

/**
 * Cleans up expired entries from the rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Checks if a request should be rate limited
 * @param req The incoming request
 * @param config Rate limit configuration
 * @param userId Optional user ID for user-specific rate limiting
 * @returns Rate limit result
 */
export function checkRateLimit(
  req: Request,
  config: RateLimitConfig,
  userId?: string
): RateLimitResult {
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    cleanupExpiredEntries();
  }
  
  const keyGenerator = config.keyGenerator || defaultKeyGenerator;
  const key = keyGenerator(req, userId);
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  // If no entry exists or the window has expired, create a new one
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs
    };
  }
  
  // Increment the request count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const allowed = entry.count <= config.maxRequests;
  
  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
    retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000)
  };
}

/**
 * Middleware function to apply rate limiting to Edge Functions
 * @param req The incoming request
 * @param config Rate limit configuration
 * @param userId Optional user ID
 * @param handler The handler function to execute if rate limit allows
 * @returns Response from handler or rate limit error
 */
export async function withRateLimit(
  req: Request,
  config: RateLimitConfig,
  userId: string | undefined,
  handler: () => Promise<Response>
): Promise<Response> {
  const rateLimitResult = checkRateLimit(req, config, userId);
  
  // Add rate limit headers to all responses
  const headers = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
  };
  
  if (!rateLimitResult.allowed) {
    // Rate limit exceeded
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
          resetTime: new Date(rateLimitResult.resetTime).toISOString()
        }
      }),
      {
        status: 429,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
        }
      }
    );
  }
  
  // Execute the handler and add rate limit headers to the response
  const response = await handler();
  
  // Add rate limit headers to the response
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Helper function to get rate limit config by endpoint name
 * @param endpointName The name of the endpoint
 * @returns Rate limit configuration
 */
export function getRateLimitConfig(endpointName: string): RateLimitConfig {
  return RATE_LIMIT_CONFIGS[endpointName as keyof typeof RATE_LIMIT_CONFIGS] || 
         RATE_LIMIT_CONFIGS.default;
}