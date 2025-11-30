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

// Schema for order modifications
const modifyOrderSchema = z.object({
  qty: z.number().positive().optional(),
  time_in_force: z.enum(['day', 'gtc', 'ioc', 'fok']).optional(),
  limit_price: z.number().positive().optional(),
  stop_price: z.number().positive().optional(),
  trail: z.number().positive().optional(),
  client_order_id: z.string().optional(),
});

/**
 * Edge Function handler for modifying Alpaca orders
 * 
 * PUT: Modifies an existing order
 * 
 * Requirements: Order management, trading flexibility
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow PUT requests
    if (req.method !== 'PUT') {
      return createErrorResponse(
        {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Method not allowed. Only PUT requests are supported.'
        },
        405
      )
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        console.log(`Processing modify order request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        const url = new URL(req.url)
        const orderId = url.searchParams.get('orderId')
        
        if (!orderId) {
          return createErrorResponse(
            {
              code: ERROR_CODES.INVALID_REQUEST,
              message: 'Order ID is required',
              details: 'Please provide an order ID to modify'
            },
            400
          )
        }
        
        try {
          const body = await req.json()
          const validatedUpdates = modifyOrderSchema.parse(body)
          
          // Check if at least one field is being updated
          const hasUpdates = Object.keys(validatedUpdates).length > 0
          if (!hasUpdates) {
            return createErrorResponse(
              {
                code: ERROR_CODES.INVALID_REQUEST,
                message: 'No updates provided',
                details: 'Please provide at least one field to update'
              },
              400
            )
          }
          
          // First, get the current order to validate the modification
          const currentOrderResponse = await alpacaClient.brokerRequest(`/v2/orders/${orderId}`)
          
          if (!currentOrderResponse.success) {
            console.error(`Failed to fetch order ${orderId}:`, currentOrderResponse.error)
            return createErrorResponse(
              {
                code: currentOrderResponse.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                message: currentOrderResponse.error?.message || 'Failed to fetch order for modification',
                details: currentOrderResponse.error?.details
              },
              currentOrderResponse.error?.status || 400
            )
          }
          
          const currentOrder = currentOrderResponse.data
          
          // Check if order can be modified (must be in a modifiable state)
          const modifiableStatuses = ['new', 'partially_filled', 'pending_new', 'accepted']
          if (!modifiableStatuses.includes(currentOrder.status)) {
            return createErrorResponse(
              {
                code: ERROR_CODES.INVALID_REQUEST,
                message: 'Order cannot be modified',
                details: `Order status '${currentOrder.status}' does not allow modifications. Only orders with status: ${modifiableStatuses.join(', ')} can be modified.`
              },
              400
            )
          }
          
          // Validate limit price for limit orders
          if (validatedUpdates.limit_price && !['limit', 'stop_limit'].includes(currentOrder.type)) {
            return createErrorResponse(
              {
                code: ERROR_CODES.INVALID_REQUEST,
                message: 'Limit price can only be set for limit or stop_limit orders',
                details: `Current order type is '${currentOrder.type}'`
              },
              400
            )
          }
          
          // Validate stop price for stop orders
          if (validatedUpdates.stop_price && !['stop', 'stop_limit'].includes(currentOrder.type)) {
            return createErrorResponse(
              {
                code: ERROR_CODES.INVALID_REQUEST,
                message: 'Stop price can only be set for stop or stop_limit orders',
                details: `Current order type is '${currentOrder.type}'`
              },
              400
            )
          }
          
          // Prepare the modification payload
          const modificationPayload: Record<string, any> = {}
          
          if (validatedUpdates.qty) modificationPayload.qty = validatedUpdates.qty
          if (validatedUpdates.time_in_force) modificationPayload.time_in_force = validatedUpdates.time_in_force
          if (validatedUpdates.limit_price) modificationPayload.limit_price = validatedUpdates.limit_price
          if (validatedUpdates.stop_price) modificationPayload.stop_price = validatedUpdates.stop_price
          if (validatedUpdates.trail) modificationPayload.trail = validatedUpdates.trail
          if (validatedUpdates.client_order_id) modificationPayload.client_order_id = validatedUpdates.client_order_id
          
          console.log(`Modifying order ${orderId} with:`, modificationPayload)
          
          // Make request to Alpaca API to modify the order
          const response = await alpacaClient.brokerRequest(`/v2/orders/${orderId}`, {
            method: 'PATCH',
            body: modificationPayload
          })
          
          if (!response.success) {
            console.error(`Failed to modify order ${orderId}:`, response.error)
            return createErrorResponse(
              {
                code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                message: response.error?.message || 'Failed to modify order',
                details: response.error?.details
              },
              response.error?.status || 400
            )
          }
          
          console.log(`✅ Order ${orderId} modified successfully`)
          return createSuccessResponse(response.data)
          
        } catch (error) {
          const validationError = error as Error;
          if (validationError instanceof z.ZodError) {
            return createErrorResponse(
              {
                code: ERROR_CODES.INVALID_REQUEST,
                message: 'Invalid modification parameters',
                details: validationError.errors
              },
              400
            )
          }
          throw validationError
        }
      } catch (error) {
        console.error('Unexpected error in modify order endpoint:', error)
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