/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
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

/**
 * Edge Function handler for retrieving specific Alpaca orders
 * 
 * GET: Retrieves a specific order by ID with detailed information
 * 
 * Requirements: Order tracking, trade history
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
        console.log(`Processing get order request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        const url = new URL(req.url)
        const orderId = url.searchParams.get('orderId')
        const includeExecutions = url.searchParams.get('includeExecutions') === 'true'
        
        if (!orderId) {
          return createErrorResponse(
            {
              code: ERROR_CODES.INVALID_REQUEST,
              message: 'Order ID is required',
              details: 'Please provide an order ID in the query parameters'
            },
            400
          )
        }
        
        console.log(`Fetching order ${orderId}${includeExecutions ? ' with executions' : ''}`)
        
        // Build query parameters
        const params: Record<string, string> = {}
        if (includeExecutions) {
          params.nested = 'true' // Include nested order details and executions
        }
        
        // Make request to Alpaca API to get the order
        const response = await alpacaClient.brokerRequest(`/v2/orders/${orderId}`, {
          params
        })
        
        if (!response.success) {
          console.error(`Failed to fetch order ${orderId}:`, response.error)
          
          // Handle specific error cases
          if (response.error?.status === 404) {
            return createErrorResponse(
              {
                code: 'ORDER_NOT_FOUND',
                message: `Order ${orderId} not found`,
                details: 'The specified order ID does not exist or does not belong to this account'
              },
              404
            )
          }
          
          return createErrorResponse(
            {
              code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
              message: response.error?.message || 'Failed to fetch order',
              details: response.error?.details
            },
            response.error?.status || 400
          )
        }
        
        const order = response.data
        
        // Enhance the order data with additional computed fields
        const enhancedOrder = {
          ...order,
          // Add computed fields for better frontend handling
          is_active: ['new', 'partially_filled', 'pending_new', 'accepted'].includes(order.status),
          is_cancelable: ['new', 'partially_filled', 'pending_new', 'accepted', 'pending_cancel', 'pending_replace'].includes(order.status),
          is_modifiable: ['new', 'partially_filled', 'pending_new', 'accepted'].includes(order.status),
          filled_percentage: order.qty ? (parseFloat(order.filled_qty || '0') / parseFloat(order.qty)) * 100 : 0,
          remaining_qty: order.qty ? parseFloat(order.qty) - parseFloat(order.filled_qty || '0') : 0,
          // Calculate estimated value
          estimated_value: order.filled_avg_price && order.filled_qty 
            ? parseFloat(order.filled_avg_price) * parseFloat(order.filled_qty)
            : order.limit_price && order.qty
            ? parseFloat(order.limit_price) * parseFloat(order.qty)
            : null,
          // Add time calculations
          time_since_created: order.created_at ? Date.now() - new Date(order.created_at).getTime() : null,
          time_since_updated: order.updated_at ? Date.now() - new Date(order.updated_at).getTime() : null,
        }
        
        // If this is a complex order (bracket, OCO), fetch related orders
        if (order.legs && order.legs.length > 0) {
          console.log(`Order ${orderId} has ${order.legs.length} legs, fetching leg details`)
          
          const legDetails = await Promise.all(
            order.legs.map(async (leg: any) => {
              try {
                const legResponse = await alpacaClient.brokerRequest(`/v2/orders/${leg.id}`)
                return legResponse.success ? legResponse.data : leg
              } catch (error) {
                console.warn(`Failed to fetch leg ${leg.id}:`, error)
                return leg
              }
            })
          )
          
          enhancedOrder.legs = legDetails
        }
        
        console.log(`✅ Order ${orderId} fetched successfully`)
        return createSuccessResponse(enhancedOrder)
        
      } catch (error) {
        console.error('Unexpected error in get order endpoint:', error)
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