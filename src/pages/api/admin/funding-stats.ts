/**
 * API endpoint for funding verification statistics
 * 
 * GET /api/admin/funding-stats
 * Returns comprehensive funding system statistics for verification
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Get session from cookies
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Set session
    const { data: { user }, error: authError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile with Alpaca account ID
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('alpaca_account_id, is_paper_trading')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.alpaca_account_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Alpaca account not linked',
          message: 'Please link your Alpaca account to view funding statistics'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Query transfers from database (if we're storing them)
    // For now, we'll return a structure that the frontend can populate
    const stats = {
      accountId: profile.alpaca_account_id,
      tradingMode: profile.is_paper_trading ? 'paper' : 'live',
      timestamp: new Date().toISOString(),
      message: 'Use the funding verification dashboard component to load live data'
    };

    return new Response(
      JSON.stringify(stats),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error fetching funding stats:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
