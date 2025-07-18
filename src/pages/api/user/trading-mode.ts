import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { validateTradingModeConfig, type TradingMode } from '../../../lib/trading-config';

export const prerender = false;

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ 
        error: 'Not authenticated' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Set session
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !sessionData.user) {
      return new Response(JSON.stringify({ 
        error: 'Invalid session' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = sessionData.user.id;
    const body = await request.json();
    const { tradingMode } = body;

    // Validate trading mode
    if (!tradingMode || !['paper', 'live'].includes(tradingMode)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid trading mode. Must be "paper" or "live"' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate that the requested trading mode is properly configured
    const configValidation = validateTradingModeConfig(tradingMode as TradingMode);
    if (!configValidation.valid) {
      return new Response(JSON.stringify({ 
        error: `${tradingMode} trading is not properly configured`,
        details: `Missing configuration: ${configValidation.missing.join(', ')}`,
        missingConfig: configValidation.missing
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isPaperTrading = tradingMode === 'paper';

    // Update user profile
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        is_paper_trading: isPaperTrading,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating trading mode:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Failed to update trading mode',
        details: updateError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        tradingMode,
        isPaperTrading,
        profile: data
      },
      message: `Trading mode updated to ${tradingMode}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Trading mode API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ 
        error: 'Not authenticated' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Set session
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !sessionData.user) {
      return new Response(JSON.stringify({ 
        error: 'Invalid session' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = sessionData.user.id;

    // Get user profile
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('is_paper_trading')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching trading mode:', profileError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch trading mode',
        details: profileError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tradingMode: TradingMode = data?.is_paper_trading !== false ? 'paper' : 'live';

    return new Response(JSON.stringify({
      success: true,
      data: {
        tradingMode,
        isPaperTrading: data?.is_paper_trading !== false
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Trading mode API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};