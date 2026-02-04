/**
 * Email Service
 * Routes emails to Supabase edge function for delivery
 */

import type { EmailCategory, EmailPayload, EmailResult } from './types';
import { EMAIL_CONFIGS } from './types';
import { emailMonitor } from './monitoring';
import { logEmailResult } from './utils';
import { createClient } from '@supabase/supabase-js';

// Get Supabase client
const supabaseUrl = typeof process !== 'undefined' 
  ? process.env.PUBLIC_SUPABASE_URL 
  : import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = typeof process !== 'undefined'
  ? (process.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY)
  : (import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY);

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function sendEmail(
  category: EmailCategory,
  payload: EmailPayload
): Promise<EmailResult> {
  const config = EMAIL_CONFIGS[category];

  if (!config) {
    const result: EmailResult = {
      success: false,
      error: `Invalid email category: ${category}`,
      provider: 'brevo',
    };
    emailMonitor.record(category, result);
    return result;
  }

  if (!supabase) {
    const result: EmailResult = {
      success: false,
      error: 'Supabase client not configured',
      provider: config.provider,
    };
    emailMonitor.record(category, result);
    return result;
  }

  try {
    // Call Supabase edge function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        category,
        ...payload,
      },
    });

    let result: EmailResult;
    
    if (error) {
      result = {
        success: false,
        error: error.message || 'Failed to send email',
        provider: config.provider,
      };
    } else if (data && data.success) {
      result = {
        success: true,
        messageId: data.messageId,
        provider: data.provider || config.provider,
      };
    } else {
      result = {
        success: false,
        error: data?.error || 'Unknown error',
        provider: config.provider,
      };
    }

    // Track metrics and log
    emailMonitor.record(category, result);
    logEmailResult(category, payload.to, result);

    return result;
  } catch (error) {
    const result: EmailResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: config.provider,
    };
    
    emailMonitor.record(category, result);
    logEmailResult(category, payload.to, result);
    
    return result;
  }
}

// Convenience functions for each category
export async function sendAuthEmail(payload: EmailPayload): Promise<EmailResult> {
  return sendEmail('auth', payload);
}

export async function sendTradingEmail(payload: EmailPayload): Promise<EmailResult> {
  return sendEmail('trading', payload);
}

export async function sendSupportEmail(payload: EmailPayload): Promise<EmailResult> {
  return sendEmail('support', payload);
}

export async function sendMarketingEmail(payload: EmailPayload): Promise<EmailResult> {
  return sendEmail('marketing', payload);
}
