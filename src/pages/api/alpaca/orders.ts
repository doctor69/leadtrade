import type { APIRoute } from 'astro';
import { z } from 'zod';

const alpacaHeaders = {
    'APCA-API-KEY-ID': import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY,
    'APCA-API-SECRET-KEY': import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET,
    'Content-Type': 'application/json',
};

const baseUrl = import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL;

// Helper function to construct option symbol in OCC format
function constructOptionSymbol(underlyingSymbol: string, optionDetails: {
    strike: number;
    expiration: string;
    option_type: 'call' | 'put';
}): string {
    // Parse expiration date
    const expirationDate = new Date(optionDetails.expiration);
    const year = expirationDate.getFullYear().toString().slice(-2);
    const month = (expirationDate.getMonth() + 1).toString().padStart(2, '0');
    const day = expirationDate.getDate().toString().padStart(2, '0');
    
    // Format strike price (multiply by 1000 and pad to 8 digits)
    const strikeFormatted = Math.round(optionDetails.strike * 1000).toString().padStart(8, '0');
    
    // Option type (C for call, P for put)
    const optionType = optionDetails.option_type.toUpperCase().charAt(0);
    
    return `${underlyingSymbol}${year}${month}${day}${optionType}${strikeFormatted}`;
}

// Schema for options details
const optionDetailsSchema = z.object({
    strike: z.number().positive('Strike price must be positive'),
    expiration: z.string().min(1, 'Expiration date is required'),
    option_type: z.enum(['call', 'put'], { required_error: 'Option type must be call or put' }),
    contract_size: z.number().positive().default(100),
    premium: z.number().positive().optional(),
});

// Schema for creating orders
const createOrderSchema = z.object({
    symbol: z.string().min(1, 'Symbol is required'),
    qty: z.number().positive('Quantity must be positive'),
    side: z.enum(['buy', 'sell'], { required_error: 'Side must be buy or sell' }),
    type: z.enum(['market', 'limit', 'stop', 'stop_limit'], { required_error: 'Order type is required' }),
    time_in_force: z.enum(['day', 'gtc', 'ioc', 'fok']).default('day'),
    limit_price: z.number().positive().optional(),
    stop_price: z.number().positive().optional(),
    trail_price: z.number().positive().optional(),
    trail_percent: z.number().positive().optional(),
    extended_hours: z.boolean().default(false),
    client_order_id: z.string().optional(),
    trade_type: z.enum(['stock', 'option']).default('stock'),
    option_details: optionDetailsSchema.optional(),
});

// Schema for query parameters
const ordersQuerySchema = z.object({
    status: z.enum(['open', 'closed', 'all']).default('open'),
    limit: z.number().min(1).max(500).default(50),
    after: z.string().optional(),
    until: z.string().optional(),
    direction: z.enum(['asc', 'desc']).default('desc'),
    nested: z.boolean().default(true),
    symbols: z.string().optional(), // comma-separated symbols
});

export const GET: APIRoute = async ({ url }) => {
    try {
        // Parse and validate query parameters
        const queryParams: Record<string, any> = Object.fromEntries(url.searchParams);

        // Convert string numbers to actual numbers
        if (queryParams.limit) queryParams.limit = parseInt(queryParams.limit as string);
        if (queryParams.nested) queryParams.nested = queryParams.nested === 'true';

        const validatedQuery = ordersQuerySchema.parse(queryParams);

        // Build query string
        const searchParams = new URLSearchParams();
        searchParams.append('status', validatedQuery.status);
        searchParams.append('limit', validatedQuery.limit.toString());
        searchParams.append('direction', validatedQuery.direction);
        searchParams.append('nested', validatedQuery.nested.toString());

        if (validatedQuery.after) searchParams.append('after', validatedQuery.after);
        if (validatedQuery.until) searchParams.append('until', validatedQuery.until);
        if (validatedQuery.symbols) searchParams.append('symbols', validatedQuery.symbols);

        const apiUrl = `${baseUrl}/v1/trading/orders?${searchParams.toString()}`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: alpacaHeaders,
        });

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(JSON.stringify({
                error: 'Failed to fetch orders',
                details: errorText
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const orders = await response.json();

        return new Response(JSON.stringify({
            success: true,
            data: orders
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify({
                error: 'Invalid query parameters',
                details: error.errors
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.error('Orders GET API Error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const validatedOrder = createOrderSchema.parse(body);

        // Validate limit price for limit orders
        if (validatedOrder.type === 'limit' && !validatedOrder.limit_price) {
            return new Response(JSON.stringify({
                error: 'Limit price is required for limit orders'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate stop price for stop orders
        if ((validatedOrder.type === 'stop' || validatedOrder.type === 'stop_limit') && !validatedOrder.stop_price) {
            return new Response(JSON.stringify({
                error: 'Stop price is required for stop orders'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate options trading requirements
        if (validatedOrder.trade_type === 'option') {
            if (!validatedOrder.option_details) {
                return new Response(JSON.stringify({
                    error: 'Option details are required for options trading'
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Construct option symbol in OCC format for Alpaca
            const optionSymbol = constructOptionSymbol(validatedOrder.symbol, validatedOrder.option_details);
            validatedOrder.symbol = optionSymbol;
        }

        // Prepare order payload for Alpaca API
        let orderPayload: any = {
            symbol: validatedOrder.symbol,
            qty: validatedOrder.qty,
            side: validatedOrder.side,
            type: validatedOrder.type,
            time_in_force: validatedOrder.time_in_force,
            extended_hours: validatedOrder.extended_hours
        };

        // Add optional fields
        if (validatedOrder.limit_price) orderPayload.limit_price = validatedOrder.limit_price;
        if (validatedOrder.stop_price) orderPayload.stop_price = validatedOrder.stop_price;
        if (validatedOrder.trail_price) orderPayload.trail_price = validatedOrder.trail_price;
        if (validatedOrder.trail_percent) orderPayload.trail_percent = validatedOrder.trail_percent;
        if (validatedOrder.client_order_id) orderPayload.client_order_id = validatedOrder.client_order_id;

        // Add options-specific fields
        if (validatedOrder.trade_type === 'option') {
            orderPayload.class = 'option';
        }

        const response = await fetch(`${baseUrl}/v1/trading/orders`, {
            method: 'POST',
            headers: alpacaHeaders,
            body: JSON.stringify(orderPayload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(JSON.stringify({
                error: 'Failed to create order',
                details: errorText
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const order = await response.json();

        return new Response(JSON.stringify({
            success: true,
            data: order,
            message: 'Order created successfully'
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify({
                error: 'Invalid order data',
                details: error.errors
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.error('Orders POST API Error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};