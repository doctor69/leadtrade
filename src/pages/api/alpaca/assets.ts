import type { APIRoute } from 'astro';
import { z } from 'zod';

const alpacaHeaders = {
  'APCA-API-KEY-ID': import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY,
  'APCA-API-SECRET-KEY': import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET,
  'Content-Type': 'application/json',
};

const baseUrl = import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL;

// Schema for query parameters
const assetsQuerySchema = z.object({
  status: z.enum(['active', 'inactive']).default('active'),
  asset_class: z.enum(['us_equity', 'crypto']).default('us_equity'),
  exchange: z.string().optional(),
  attributes: z.string().optional(), // comma-separated attributes
  search: z.string().optional(),
});

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Parse and validate query parameters
    const queryParams = Object.fromEntries(url.searchParams);
    const validatedQuery = assetsQuerySchema.parse(queryParams);

    // Build query string
    const searchParams = new URLSearchParams();
    searchParams.append('status', validatedQuery.status);
    searchParams.append('asset_class', validatedQuery.asset_class);
    
    if (validatedQuery.exchange) searchParams.append('exchange', validatedQuery.exchange);
    if (validatedQuery.attributes) searchParams.append('attributes', validatedQuery.attributes);
    if (validatedQuery.search) searchParams.append('search', validatedQuery.search);

    const apiUrl = `${baseUrl}/v1/assets?${searchParams.toString()}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: alpacaHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch assets',
        details: errorText 
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const assets = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      data: assets
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

    console.error('Assets API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};