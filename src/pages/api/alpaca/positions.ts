import type { APIRoute } from 'astro';
import { z } from 'zod';

const alpacaHeaders = {
  'APCA-API-KEY-ID': import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY,
  'APCA-API-SECRET-KEY': import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET,
  'Content-Type': 'application/json',
};

const baseUrl = import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL;

// Schema for query parameters
const positionsQuerySchema = z.object({
  symbol: z.string().optional(),
  asof: z.string().optional(),
});

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Parse and validate query parameters
    const queryParams = Object.fromEntries(url.searchParams);
    const validatedQuery = positionsQuerySchema.parse(queryParams);

    // Build query string
    const searchParams = new URLSearchParams();
    if (validatedQuery.symbol) searchParams.append('symbol', validatedQuery.symbol);
    if (validatedQuery.asof) searchParams.append('asof', validatedQuery.asof);

    const queryString = searchParams.toString();
    const apiUrl = `${baseUrl}/v1/trading/positions${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: alpacaHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch positions',
        details: errorText 
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const positions = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      data: positions
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

    console.error('Positions API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};