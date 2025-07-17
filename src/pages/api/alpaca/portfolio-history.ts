import type { APIRoute } from 'astro';
import { z } from 'zod';

const alpacaHeaders = {
  'APCA-API-KEY-ID': import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY,
  'APCA-API-SECRET-KEY': import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET,
  'Content-Type': 'application/json',
};

const baseUrl = import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL;

// Schema for query parameters
const portfolioHistoryQuerySchema = z.object({
  period: z.enum(['1D', '1W', '1M', '3M', '1A', '2A', '5A', 'all']).default('1M'),
  timeframe: z.enum(['1Min', '5Min', '15Min', '1H', '1D']).default('1D'),
  date_end: z.string().optional(),
  asof: z.string().optional(),
  page_size: z.number().min(1).max(10000).default(1000),
  page_token: z.string().optional(),
  pnl_reset: z.enum(['per_day', 'per_position']).default('per_day'),
});

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Parse and validate query parameters
    const queryParams = Object.fromEntries(url.searchParams);
    
    // Convert string numbers to actual numbers
    if (queryParams.page_size) queryParams.page_size = parseInt(queryParams.page_size);

    const validatedQuery = portfolioHistoryQuerySchema.parse(queryParams);

    // Build query string
    const searchParams = new URLSearchParams();
    searchParams.append('period', validatedQuery.period);
    searchParams.append('timeframe', validatedQuery.timeframe);
    searchParams.append('page_size', validatedQuery.page_size.toString());
    searchParams.append('pnl_reset', validatedQuery.pnl_reset);
    
    if (validatedQuery.date_end) searchParams.append('date_end', validatedQuery.date_end);
    if (validatedQuery.asof) searchParams.append('asof', validatedQuery.asof);
    if (validatedQuery.page_token) searchParams.append('page_token', validatedQuery.page_token);

    const apiUrl = `${baseUrl}/v1/trading/account/portfolio/history?${searchParams.toString()}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: alpacaHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch portfolio history',
        details: errorText 
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const portfolioHistory = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      data: portfolioHistory
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

    console.error('Portfolio History API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};