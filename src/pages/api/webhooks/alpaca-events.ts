/**
 * Alpaca Events Webhook Handler
 * Receives trade updates from Alpaca and sends notifications
 * POST /api/webhooks/alpaca-events
 */

import type { APIRoute } from 'astro';
import { notifyTradeExecution } from '../../../lib/notifications/trade-notifications';

interface AlpacaTradeEvent {
  event_type: string;
  order: {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    filled_qty: string;
    filled_avg_price: string;
    filled_at: string;
    status: string;
  };
  account_id: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const event: AlpacaTradeEvent = await request.json();

    console.log('📨 Received Alpaca event:', event.event_type);

    // Only process filled orders
    if (event.event_type === 'trade_updates' && event.order.status === 'filled') {
      console.log(`✅ Order filled: ${event.order.symbol} - ${event.order.side}`);

      // Get user ID from Alpaca account ID
      // You'll need to query your database to map Alpaca account ID to user ID
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('alpaca_account_id', event.account_id)
        .single();

      if (profile?.id) {
        // Send trade notification email
        await notifyTradeExecution(profile.id, {
          symbol: event.order.symbol,
          side: event.order.side,
          quantity: parseFloat(event.order.filled_qty),
          price: parseFloat(event.order.filled_avg_price),
          orderId: event.order.id,
          executedAt: event.order.filled_at,
        });
      } else {
        console.warn('⚠️ User not found for Alpaca account:', event.account_id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Event processed' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to process webhook',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
