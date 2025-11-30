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
 * Edge Function handler for canceling Alpaca orders
 * 
 * DELETE: Cancels a specific order or all orders
 * 
 * Requirements: Order management, risk control
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow DELETE requests
    if (req.method !== 'DELETE') {
      return createErrorResponse(
        {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Method not allowed. Only DELETE requests are supported.'
        },
        405
      )
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        console.log(`Processing cancel order request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        const url = new URL(req.url)
        const orderId = url.searchParams.get('orderId')
        const cancelAll = url.searchParams.get('all') === 'true'
        
        // Handle canceling all orders
        if (cancelAll) {
          console.log('Canceling all open orders')
          
          const response = await alpacaClient.brokerRequest('/v2/orders', {
            method: 'DELETE'
          })
          
          if (!response.success) {
            console.error('Failed to cancel all orders:', response.error)
            return createErrorResponse(
              {
                code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                message: response.error?.message || 'Failed to cancel all orders',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          console.log('✅ All orders canceled successfully')
          return createSuccessResponse({
            message: 'All open orders canceled successfully',
            canceled_orders: response.data || []
          })
        }
        
        // Handle canceling a specific order
        if (!orderId) {
          return createErrorResponse(
            {
              code: ERROR_CODES.INVALID_REQUEST,
              message: 'Order ID is required',
              details: 'Please provide an order ID to cancel, or use ?all=true to cancel all orders'
            },
            400
          )
        }
        
        // First, get the current order to validate the cancellation
        const currentOrderResponse = await alpacaClient.brokerRequest(`/v2/orders/${orderId}`)
        
        if (!currentOrderResponse.success) {
          console.error(`Failed to fetch order ${orderId}:`, currentOrderResponse.error)
          return createErrorResponse(
            {
              code: currentOrderResponse.error?.code || ERROR_CODES.ALPACA_API_ERROR,
              message: currentOrderResponse.error?.message || 'Failed to fetch order for cancellation',
              details: currentOrderResponse.error?.details
            },
            currentOrderResponse.error?.status || 400
          )
        }
        
        const currentOrder = currentOrderResponse.data
        
        // Check if order can be canceled (must be in a cancelable state)
        const cancelableStatuses = ['new', 'partially_filled', 'pending_new', 'accepted', 'pending_cancel', 'pending_replace']
        if (!cancelableStatuses.includes(currentOrder.status)) {
          return createErrorResponse(
            {
              code: ERROR_CODES.INVALID_REQUEST,
              message: 'Order cannot be canceled',
              details: `Order status '${currentOrder.status}' does not allow cancellation. Only orders with status: ${cancelableStatuses.join(', ')} can be canceled.`
            },
            400
          )
        }
        
        console.log(`Canceling order ${orderId} (${currentOrder.symbol} ${currentOrder.side} ${currentOrder.qty})`)
        
        // Make request to Alpaca API to cancel the order
        const response = await alpacaClient.brokerRequest(`/v2/orders/${orderId}`, {
          method: 'DELETE'
        })
        
        if (!response.success) {
          console.error(`Failed to cancel order ${orderId}:`, response.error)
          return createErrorResponse(
            {
              code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
              message: response.error?.message || 'Failed to cancel order',
              details: response.error?.details
            },
            response.error?.status || 400
          )
        }
        
        console.log(`✅ Order ${orderId} canceled successfully`)
        return createSuccessResponse({
          message: `Order ${orderId} canceled successfully`,
          order_id: orderId,
          symbol: currentOrder.symbol,
          side: currentOrder.side,
          qty: currentOrder.qty,
          canceled_at: new Date().toISOString()
        })
        
      } catch (error) {
        console.error('Unexpected error in cancel order endpoint:', error)
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