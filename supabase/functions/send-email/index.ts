/**
 * Supabase Edge Function: Send Email
 * Handles email delivery via Brevo and Resend
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface EmailPayload {
  category: 'auth' | 'trading' | 'support' | 'marketing';
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

interface EmailConfig {
  provider: 'brevo' | 'resend';
  fromEmail: string;
  fromName: string;
}

const EMAIL_CONFIGS: Record<string, EmailConfig> = {
  auth: {
    provider: 'brevo',
    fromEmail: 'no-reply@auth.leadtrade.app',
    fromName: 'LeadTrade Authentication',
  },
  trading: {
    provider: 'resend',
    fromEmail: 'notifications@trade.leadtrade.app',
    fromName: 'LeadTrade Trading',
  },
  support: {
    provider: 'brevo',
    fromEmail: 'support@leadtrade.app',
    fromName: 'LeadTrade Support',
  },
  marketing: {
    provider: 'brevo',
    fromEmail: 'hello@marketing.leadtrade.app',
    fromName: 'LeadTrade',
  },
};

async function sendBrevoEmail(
  payload: EmailPayload,
  config: EmailConfig
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');

  if (!BREVO_API_KEY) {
    return { success: false, error: 'Brevo API key not configured' };
  }

  try {
    const recipients = Array.isArray(payload.to)
      ? payload.to.map(email => ({ email }))
      : [{ email: payload.to }];

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          email: config.fromEmail,
          name: config.fromName,
        },
        to: recipients,
        subject: payload.subject,
        htmlContent: payload.html,
        textContent: payload.text,
        ...(payload.replyTo && { replyTo: { email: payload.replyTo } }),
        ...(payload.cc && { cc: payload.cc.map(email => ({ email })) }),
        ...(payload.bcc && { bcc: payload.bcc.map(email => ({ email })) }),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Brevo API error: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('Brevo email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function sendResendEmail(
  payload: EmailPayload,
  config: EmailConfig
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

  if (!RESEND_API_KEY) {
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        ...(payload.text && { text: payload.text }),
        ...(payload.replyTo && { reply_to: payload.replyTo }),
        ...(payload.cc && { cc: payload.cc }),
        ...(payload.bcc && { bcc: payload.bcc }),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Resend API error: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Resend email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Allow internal calls from other edge functions
  // Check if request is from another Supabase function (internal call)
  const authHeader = req.headers.get('Authorization');
  const isInternalCall = authHeader?.includes('Bearer ') || req.headers.get('x-client-info');
  
  console.log('Send-email function called');
  console.log('Auth header present:', !!authHeader);
  console.log('Is internal call:', isInternalCall);

  try {
    const payload: EmailPayload = await req.json();
    console.log('Email payload received:', { category: payload.category, to: payload.to, subject: payload.subject });

    // Validate required fields
    if (!payload.category || !payload.to || !payload.subject || !payload.html) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: category, to, subject, html',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const config = EMAIL_CONFIGS[payload.category];
    if (!config) {
      console.error('Invalid email category:', payload.category);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid email category: ${payload.category}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Routing to ${config.provider} provider...`);

    // Route to appropriate provider
    const result = config.provider === 'resend'
      ? await sendResendEmail(payload, config)
      : await sendBrevoEmail(payload, config);

    console.log('Email send result:', result);

    return new Response(
      JSON.stringify({
        ...result,
        provider: config.provider,
      }),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
