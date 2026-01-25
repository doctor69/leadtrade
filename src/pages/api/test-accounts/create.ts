import type { APIRoute } from 'astro';

/**
 * Test Account Creation API Endpoint
 * 
 * POST /api/test-accounts/create
 * 
 * Creates a pre-funded test account for Alpaca consultants
 * Requires service role authorization
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: email, password',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Call the Supabase Edge Function
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/test-accounts-create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(body),
      }
    );

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Test account creation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
