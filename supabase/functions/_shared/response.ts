import { corsHeaders } from './cors.ts'

export interface ErrorResponse {
  code: string
  message: string
  details?: any
  timestamp?: string
}

export const ERROR_CODES = {
  ALPACA_API_ERROR: 'ALPACA_API_ERROR',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  WEBSOCKET_CONNECTION_FAILED: 'WEBSOCKET_CONNECTION_FAILED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
}

/**
 * Creates a standardized success response
 * @param data The response data
 * @param status HTTP status code (default: 200)
 * @returns Response object with standardized format
 */
export function createSuccessResponse<T = any>(data: T, status = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Creates a standardized error response
 * @param error The error details
 * @param status HTTP status code (default: 400)
 * @returns Response object with standardized format
 */
export function createErrorResponse(
  error: string | ErrorResponse,
  status = 400
): Response {
  let errorObj: ErrorResponse

  if (typeof error === 'string') {
    errorObj = {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: error,
      timestamp: new Date().toISOString()
    }
  } else {
    errorObj = {
      ...error,
      timestamp: error.timestamp || new Date().toISOString()
    }
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: errorObj
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Creates a standardized CORS preflight response
 * @returns Response object for OPTIONS requests
 */
export function createCorsResponse(): Response {
  return new Response('ok', { headers: corsHeaders })
}

/**
 * Helper function to handle common request processing
 * @param req The incoming request
 * @param handler The handler function for the request
 * @returns Response from the handler or an error response
 */
export async function processRequest(
  req: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createCorsResponse()
  }

  try {
    return await handler()
  } catch (error) {
    console.error('Unhandled error:', error)
    
    return createErrorResponse({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      details: error instanceof Error ? { stack: error.stack } : undefined
    }, 500)
  }
}