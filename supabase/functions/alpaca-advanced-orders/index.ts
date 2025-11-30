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

// Schema for bracket orders
const bracketOrderSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  qty: z.number().positive('Quantity must be positive'),
  side: z.enum(['buy', 'sell'], { required_error: 'Side must be buy or sell' }),
  type: z.enum(['market', 'limit'], { required_error: 'Order type is required' }),
  time_in_force: z.enum(['day', 'gtc']).default('day'),
  limit_price: z.number().positive().optional(),
  take_profit: z.object({
    limit_price: z.number().positive('Take profit limit price must be positive')
  }),
  stop_loss: z.object({
    stop_price: z.number().positive('Stop loss price must be positive'),
    limit_price: z.number().positive().optional()
  }),
  extended_hours: z.boolean().default(false),
  client_order_id: z.string().optional(),
});

// Schema for OCO (One-Cancels-Other) orders
const ocoOrderSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  qty: z.number().positive('Quantity must be positive'),
  side: z.enum(['buy', 'sell'], { required_error: 'Side must be buy or sell' }),
  time_in_force: z.enum(['day', 'gtc']).default('day'),
  legs: z.array(z.object({
    type: z.enum(['limit', 'stop', 'stop_limit']),
    limit_price: z.number().positive().optional(),
    stop_price: z.number().positive().optional()
  })).min(2, 'OCO orders require at least 2 legs').max(2, 'OCO orders support maximum 2 legs'),
  extended_hours: z.boolean().default(false),
  client_order_id: z.string().optional(),
});

// Schema for trailing stop orders
const trailingStopSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  qty: z.number().positive('Quantity must be positive'),
  side: z.enum(['buy', 'sell'], { required_error: 'Side must be buy or sell' }),
  type: z.literal('trailing_stop'),
  time_in_force: z.enum(['day', 'gtc']).default('day'),
  trail_price: z.number().positive().optional(),
  trail_percent: z.number().positive().max(50).optional(),
  extended_hours: z.boolean().default(false),
  client_order_id: z.string().optional(),
}).refine(data => data.trail_price || data.trail_percent, {
  message: "Either trail_price or trail_percent must be provided"
});

/**
 * Edge Function handler for Alpaca advanced orders
 * 
 * POST: Places advanced order types (bracket, OCO, trailing stop)
 * 
 * Requirements: Advanced trading strategies, risk management
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return createErrorResponse(
        {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Method not allowed. Only POST requests are supported.'
        },
        405
      )
    }

    return withAuth(req, async (authContext: AuthContext) => {
      try {
        console.log(`Processing advanced orders request for user ${authContext.userId} in ${authContext.tradingMode} mode`)
        
        // Create Alpaca client with auth context
        const alpacaClient = new AlpacaClient(authContext)
        
        const url = new URL(req.url)
        const orderType = url.searchParams.get('type') // 'bracket', 'oco', 'trailing_stop'
        
        if (!orderType) {
          return createErrorResponse(
            {
              code: ERROR_CODES.INVALID_REQUEST,
              message: 'Order type is required',
              details: 'Please specify order type: bracket, oco, or trailing_stop'
            },
            400
          )
        }
        
        try {
          const body = await req.json()
          
          // Handle bracket orders
          if (orderType === 'bracket') {
            const validatedOrder = bracketOrderSchema.parse(body)
            
            // Validate limit price for limit orders
            if (validatedOrder.type === 'limit' && !validatedOrder.limit_price) {
              return createErrorResponse(
                {
                  code: ERROR_CODES.INVALID_REQUEST,
                  message: 'Limit price required for limit bracket orders'
                },
                400
              )
            }
            
            // Prepare bracket order payload
            const orderPayload = {
              symbol: validatedOrder.symbol,
              qty: validatedOrder.qty,
              side: validatedOrder.side,
              type: validatedOrder.type,
              time_in_force: validatedOrder.time_in_force,
              extended_hours: validatedOrder.extended_hours,
              order_class: 'bracket',
              take_profit: validatedOrder.take_profit,
              stop_loss: validatedOrder.stop_loss
            }
            
            if (validatedOrder.limit_price) {
              orderPayload.limit_price = validatedOrder.limit_price
            }
            
            if (validatedOrder.client_order_id) {
              orderPayload.client_order_id = validatedOrder.client_order_id
            }
            
            const response = await alpacaClient.brokerRequest('/v2/orders', {
              method: 'POST',
              body: orderPayload
            })
            
            if (!response.success) {
              console.error('Failed to create bracket order:', response.error)
              return createErrorResponse(
                {
                  code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: response.error?.message || 'Failed to create bracket order',
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            return createSuccessResponse(response.data, 201)
          }
          
          // Handle OCO orders
          if (orderType === 'oco') {
            const validatedOrder = ocoOrderSchema.parse(body)
            
            // Validate leg requirements
            for (const leg of validatedOrder.legs) {
              if (leg.type === 'limit' && !leg.limit_price) {
                return createErrorResponse(
                  {
                    code: ERROR_CODES.INVALID_REQUEST,
                    message: 'Limit price required for limit order legs'
                  },
                  400
                )
              }
              if ((leg.type === 'stop' || leg.type === 'stop_limit') && !leg.stop_price) {
                return createErrorResponse(
                  {
                    code: ERROR_CODES.INVALID_REQUEST,
                    message: 'Stop price required for stop order legs'
                  },
                  400
                )
              }
            }
            
            // Prepare OCO order payload
            const orderPayload = {
              symbol: validatedOrder.symbol,
              qty: validatedOrder.qty,
              side: validatedOrder.side,
              time_in_force: validatedOrder.time_in_force,
              extended_hours: validatedOrder.extended_hours,
              order_class: 'oco',
              legs: validatedOrder.legs
            }
            
            if (validatedOrder.client_order_id) {
              orderPayload.client_order_id = validatedOrder.client_order_id
            }
            
            const response = await alpacaClient.brokerRequest('/v2/orders', {
              method: 'POST',
              body: orderPayload
            })
            
            if (!response.success) {
              console.error('Failed to create OCO order:', response.error)
              return createErrorResponse(
                {
                  code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: response.error?.message || 'Failed to create OCO order',
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            return createSuccessResponse(response.data, 201)
          }
          
          // Handle trailing stop orders
          if (orderType === 'trailing_stop') {
            const validatedOrder = trailingStopSchema.parse(body)
            
            // Prepare trailing stop order payload
            const orderPayload = {
              symbol: validatedOrder.symbol,
              qty: validatedOrder.qty,
              side: validatedOrder.side,
              type: 'trailing_stop',
              time_in_force: validatedOrder.time_in_force,
              extended_hours: validatedOrder.extended_hours
            }
            
            if (validatedOrder.trail_price) {
              orderPayload.trail_price = validatedOrder.trail_price
            }
            
            if (validatedOrder.trail_percent) {
              orderPayload.trail_percent = validatedOrder.trail_percent
            }
            
            if (validatedOrder.client_order_id) {
              orderPayload.client_order_id = validatedOrder.client_order_id
            }
            
            const response = await alpacaClient.brokerRequest('/v2/orders', {
              method: 'POST',
              body: orderPayload
            })
            
            if (!response.success) {
              console.error('Failed to create trailing stop order:', response.error)
              return createErrorResponse(
                {
                  code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
                  message: response.error?.message || 'Failed to create trailing stop order',
                  details: response.error?.details
                },
                response.error?.status || 400
              )
            }
            
            return createSuccessResponse(response.data, 201)
          }
          
          return createErrorResponse(
            {
              code: ERROR_CODES.INVALID_REQUEST,
              message: 'Invalid order type',
              details: 'Supported order types: bracket, oco, trailing_stop'
            },
            400
          )
        } catch (error) {
          const validationError = error as Error;
          if (validationError instanceof z.ZodError) {
            return createErrorResponse(
              {
                code: ERROR_CODES.INVALID_REQUEST,
                message: 'Invalid order parameters',
                details: validationError.errors
              },
              400
            )
          }
          throw validationError
        }
      } catch (error) {
        console.error('Unexpected error in advanced orders endpoint:', error)
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