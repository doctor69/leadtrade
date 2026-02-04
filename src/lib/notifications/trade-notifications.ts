/**
 * Trade Notification Service
 * Sends email notifications for trade executions and copy trades
 */

import { sendTradingEmail, getTradeConfirmationTemplate, getCopyTradeNotificationTemplate } from '../email';
import { createClient } from '@supabase/supabase-js';

// Access environment variables correctly
const SUPABASE_URL = typeof process !== 'undefined'
  ? process.env.PUBLIC_SUPABASE_URL
  : import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = typeof process !== 'undefined'
  ? (process.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY)
  : (import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY);

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

export interface TradeNotificationData {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  orderId: string;
  executedAt: string;
}

/**
 * Send trade confirmation email to user
 */
export async function notifyTradeExecution(
  userId: string,
  trade: TradeNotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.email) {
      console.error('Failed to get user profile for trade notification:', profileError);
      return { success: false, error: 'User profile not found' };
    }

    // Generate email
    const { html, text } = getTradeConfirmationTemplate(
      profile.full_name || 'Trader',
      {
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        price: trade.price,
        total: trade.quantity * trade.price,
        timestamp: trade.executedAt,
        orderId: trade.orderId,
      }
    );

    // Send email
    const result = await sendTradingEmail({
      to: profile.email,
      subject: `Trade Confirmation - ${trade.side.toUpperCase()} ${trade.symbol}`,
      html,
      text,
    });

    if (result.success) {
      console.log(`✅ Trade notification sent to ${profile.email} for ${trade.symbol}`);
    } else {
      console.error(`❌ Failed to send trade notification:`, result.error);
    }

    return result;
  } catch (error) {
    console.error('Error sending trade notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send copy trade notification to follower
 */
export async function notifyCopyTrade(
  followerId: string,
  leaderId: string,
  trade: TradeNotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get follower and leader details
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', [followerId, leaderId]);

    if (profilesError || !profiles || profiles.length !== 2) {
      console.error('Failed to get profiles for copy trade notification:', profilesError);
      return { success: false, error: 'Profiles not found' };
    }

    const follower = profiles.find(p => p.id === followerId);
    const leader = profiles.find(p => p.id === leaderId);

    if (!follower?.email || !leader) {
      return { success: false, error: 'Follower or leader not found' };
    }

    // Generate email
    const { html, text } = getCopyTradeNotificationTemplate(
      follower.full_name || 'Trader',
      leader.full_name || 'Leader',
      {
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        price: trade.price,
        total: trade.quantity * trade.price,
        timestamp: trade.executedAt,
        orderId: trade.orderId,
      }
    );

    // Send email
    const result = await sendTradingEmail({
      to: follower.email,
      subject: `Copy Trade Executed - ${trade.symbol}`,
      html,
      text,
    });

    if (result.success) {
      console.log(`✅ Copy trade notification sent to ${follower.email} for ${trade.symbol}`);
    } else {
      console.error(`❌ Failed to send copy trade notification:`, result.error);
    }

    return result;
  } catch (error) {
    console.error('Error sending copy trade notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch notify multiple users about their trades
 */
export async function batchNotifyTrades(
  notifications: Array<{ userId: string; trade: TradeNotificationData }>
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  for (const notification of notifications) {
    const result = await notifyTradeExecution(notification.userId, notification.trade);

    if (result.success) {
      successful++;
    } else {
      failed++;
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`📊 Batch trade notifications: ${successful} sent, ${failed} failed`);

  return { successful, failed };
}
