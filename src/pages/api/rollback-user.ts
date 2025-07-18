import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { userId, reason } = await request.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Call the Supabase Edge Function
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/rollback-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ userId, reason }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge function error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Rollback failed', details: errorText }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const result = await response.json();
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Rollback API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};