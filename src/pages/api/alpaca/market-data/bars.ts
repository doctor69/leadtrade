import type { APIRoute } from 'astro';
import { z } from 'zod';

const alpacaDataHeaders = {
  'APCA-API-KEY-ID': import.meta.env.PUBLIC_ALPACA_DATA_API_KEY || import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY,
  'APCA-API-SECRET-KEY': import.meta.env.PUBLIC_ALPACA_DATA_API_SECRET || import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET,
  'Content-Type': 'application/json',
};

const dataBaseUrl = 'https://data.sandbox.alpaca.markets';

// Schema for query parameters
const barsQuerySchema = z.object({
  symbols: z.string().min(1, 'Symbols are required'), // comma-separated symbols
  timeframe: z.enum(['1Min', '5Min', '15Min', '30Min', '1Hour', '1Day', '1Week', '1Month']).default('1Day'),
  start: z.string().optional(),
  end: z.string().optional(),
  adjustment: z.enum(['raw', 'split', 'dividend', 'all']).default('raw'),
  feed: z.enum(['iex', 'otc', 'sip']).default('iex'),
  page_token: z.string().optional(),
  limit: z.number().min(1).max(10000).default(1000),
  sort: z.enum(['asc', 'desc']).default('asc'),
});

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Parse and validate query parameters
    const queryParams = Object.fromEntries(url.searchParams);
    
    // Convert string numbers to actual numbers
    if (queryParams.limit) queryParams.limit = parseInt(queryParams.limit as string);

    const validatedQuery = barsQuerySchema.parse(queryParams);

    // Build query string
    const searchParams = new URLSearchParams();
    searchParams.append('symbols', validatedQuery.symbols);
    searchParams.append('timeframe', validatedQuery.timeframe);
    searchParams.append('adjustment', validatedQuery.adjustment);
    searchParams.append('feed', validatedQuery.feed);
    searchParams.append('limit', validatedQuery.limit.toString());
    searchParams.append('sort', validatedQuery.sort);
    
    if (validatedQuery.start) searchParams.append('start', validatedQuery.start);
    if (validatedQuery.end) searchParams.append('end', validatedQuery.end);
    if (validatedQuery.page_token) searchParams.append('page_token', validatedQuery.page_token);

    const apiUrl = `${dataBaseUrl}/v2/stocks/bars?${searchParams.toString()}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: alpacaDataHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch bars',
        details: errorText 
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const bars = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      data: bars
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

    console.error('Bars API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};