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
  ERROR_CODES
} from '../_shared/index.ts'
import type { AuthContext } from '../_shared/auth.ts'

// Schema for execution query parameters
const executionsQuerySchema = z.object({
  order_id: z.string().optional(),
  symbol: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  page_token: z.string().optional(),
});

/**
 * Edge Function handler for Alpaca order executions
 * 
 * GET: Retrieves order executions (fills) with filtering options
 * 
 * Requirements: Trade reporting, execution analysis, compliance
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
      return createErrorResponse(
        {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Method not allowed. Only GET requests are supported.'
        },
        405
      )
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        console.log(`Processing order executions request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        // Parse URL and extract query parameters
        const url = new URL(req.url)
        const queryParams = Object.fromEntries(url.searchParams)
        
        // Validate query parameters
        try {
          const validatedQuery = executionsQuerySchema.parse(queryParams)
          
          // Build query parameters for Alpaca API
          const params: Record<string, string> = {
            limit: validatedQuery.limit.toString()
          }
          
          if (validatedQuery.order_id) params.order_id = validatedQuery.order_id
          if (validatedQuery.symbol) params.symbol = validatedQuery.symbol
          if (validatedQuery.start_date) params.start_date = validatedQuery.start_date
          if (validatedQuery.end_date) params.end_date = validatedQuery.end_date
          if (validatedQuery.page_token) params.page_token = validatedQuery.page_token
          
          console.log('Fetching order executions with params:', params)
          
          // Make request to Alpaca API for executions
          const response = await alpacaClient.brokerRequest('/v2/trading/orders/executions', { params })
          
          if (!response.success) {
            console.error('Failed to fetch order executions:', response.error)
            return createErrorResponse(
              {
                code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                message: response.error?.message || 'Failed to fetch order executions',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          const executions = response.data
          
          // Enhance execution data with additional computed fields
          const enhancedExecutions = {
            executions: Array.isArray(executions) ? executions.map((execution: any) => ({
              ...execution,
              // Add computed fields
              execution_value: execution.price && execution.qty 
                ? parseFloat(execution.price) * parseFloat(execution.qty)
                : null,
              execution_time_formatted: execution.timestamp 
                ? new Date(execution.timestamp).toLocaleString()
                : null,
              // Add execution type classification
              execution_type: execution.liquidity_flag === 'A' ? 'aggressive' : 
                             execution.liquidity_flag === 'P' ? 'passive' : 'unknown',
              // Calculate time since execution
              time_since_execution: execution.timestamp 
                ? Date.now() - new Date(execution.timestamp).getTime()
                : null
            })) : [],
            
            // Add summary statistics
            summary: {
              total_executions: Array.isArray(executions) ? executions.length : 0,
              total_volume: Array.isArray(executions) 
                ? executions.reduce((sum: number, exec: any) => 
                    sum + (parseFloat(exec.qty || '0')), 0)
                : 0,
              total_value: Array.isArray(executions) 
                ? executions.reduce((sum: number, exec: any) => 
                    sum + (parseFloat(exec.price || '0') * parseFloat(exec.qty || '0')), 0)
                : 0,
              average_price: Array.isArray(executions) && executions.length > 0
                ? executions.reduce((sum: number, exec: any) => 
                    sum + parseFloat(exec.price || '0'), 0) / executions.length
                : 0,
              symbols_traded: Array.isArray(executions) 
                ? [...new Set(executions.map((exec: any) => exec.symbol))]
                : [],
              date_range: {
                start: validatedQuery.start_date,
                end: validatedQuery.end_date
              }
            },
            
            // Add pagination info if available
            pagination: {
              limit: validatedQuery.limit,
              page_token: validatedQuery.page_token,
              has_more: response.data?.next_page_token ? true : false,
              next_page_token: response.data?.next_page_token
            }
          }
          
          console.log(`✅ Fetched ${enhancedExecutions.summary.total_executions} order executions`)
          return createSuccessResponse(enhancedExecutions)
          
        } catch (error) {
          const validationError = error as Error;
          if (validationError instanceof z.ZodError) {
            return createErrorResponse(
              {
                code: ERROR_CODES.INVALID_REQUEST,
                message: 'Invalid query parameters',
                details: validationError.errors
              },
              400
            )
          }
          throw validationError
        }
      } catch (error) {
        console.error('Unexpected error in order executions endpoint:', error)
        return createErrorResponse(
          {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: error instanceof Error ? error.message : 'An unexpected error occurred'
          },
          500
        )
      }
    })
  })
})