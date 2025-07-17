import type { APIRoute } from 'astro';
import { z } from 'zod';

const alpacaHeaders = {
  'APCA-API-KEY-ID': import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY,
  'APCA-API-SECRET-KEY': import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET,
  'Content-Type': 'application/json',
};

const baseUrl = import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL;

export const GET: APIRoute = async ({ request }) => {
  try {
    const response = await fetch(`${baseUrl}/v1/trading/account`, {
      method: 'GET',
      headers: alpacaHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch account data',
        details: errorText 
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const accountData = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      data: accountData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Account API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};