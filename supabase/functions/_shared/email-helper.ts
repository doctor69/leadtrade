/**
 * Shared Email Helper for Supabase Edge Functions
 * Sends emails directly via Brevo and Resend APIs
 * Supports Resend templates for trading emails
 */

interface EmailPayload {
  category: 'auth' | 'trading' | 'support' | 'marketing';
  to: string | string[];
  subject?: string; // Optional when using templates
  html?: string; // Optional when using templates
  text?: string;
  // Resend template support
  templateId?: string;
  templateData?: Record<string, any>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface EmailConfig {
  provider: 'brevo' | 'resend';
  fromEmail: string;
  fromName: string;
}

// Resend template IDs (create these in your Resend dashboard)
export const RESEND_TEMPLATES = {
  LEADER_TRADE: 'leader-trade-executed', // Template for leader trade notifications
  FOLLOWER_COPY_TRADE: 'follower-copy-trade', // Template for follower copy trade notifications
} as const;

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

/**
 * Send email via Brevo API
 */
async function sendBrevoEmail(
  payload: EmailPayload,
  config: EmailConfig
): Promise<EmailResult> {
  const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');

  if (!BREVO_API_KEY) {
    console.error('Brevo API key not configured');
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

/**
 * Send email via Resend API
 * Supports both HTML content and templates
 */
async function sendResendEmail(
  payload: EmailPayload,
  config: EmailConfig
): Promise<EmailResult> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

  if (!RESEND_API_KEY) {
    console.error('Resend API key not configured');
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    // Build email body - use template if provided, otherwise use HTML
    const emailBody: any = {
      from: `${config.fromName} <${config.fromEmail}>`,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
    };

    if (payload.templateId) {
      // Resend templates use a nested object structure
      emailBody.template = {
        id: payload.templateId,
        variables: payload.templateData || {}
      };
    } else {
      // Use HTML content
      if (!payload.subject || !payload.html) {
        throw new Error('Subject and HTML are required when not using a template');
      }
      emailBody.subject = payload.subject;
      emailBody.html = payload.html;
      if (payload.text) {
        emailBody.text = payload.text;
      }
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend API error:', errorData);
      throw new Error(errorData.message || `Resend API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Email sent successfully, ID:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Resend email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send email directly via Brevo or Resend API
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const config = EMAIL_CONFIGS[payload.category];

  if (!config) {
    console.error('Invalid email category:', payload.category);
    return {
      success: false,
      error: `Invalid email category: ${payload.category}`,
    };
  }

  console.log(`Sending ${payload.category} email via ${config.provider} to ${payload.to}`);

  // Call provider API directly
  const result = config.provider === 'resend'
    ? await sendResendEmail(payload, config)
    : await sendBrevoEmail(payload, config);

  if (result.success) {
    console.log(`✅ Email sent successfully via ${config.provider} (ID: ${result.messageId})`);
  } else {
    console.error(`❌ Email failed via ${config.provider}:`, result.error);
  }

  return result;
}

/**
 * Generate trade confirmation email HTML
 */
export function generateTradeEmailHtml(params: {
  userName: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  isLeader?: boolean;
  followerCount?: number;
}): string {
  const { userName, symbol, side, quantity, isLeader, followerCount } = params;
  const sideColor = side === 'buy' ? '#10b981' : '#ef4444';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Trade Executed</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px;">Hi ${userName},</p>
        <p style="font-size: 16px;">Your trade has been executed${isLeader && followerCount ? ` and copied to ${followerCount} follower${followerCount !== 1 ? 's' : ''}` : ''}:</p>
        <div style="background: white; border: 2px solid ${sideColor}; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <span style="font-weight: 600; color: #666;">Action:</span>
            <span style="font-weight: 700; color: ${sideColor}; font-size: 18px;">${side.toUpperCase()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Symbol:</span>
            <span style="font-weight: 600;">${symbol}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Quantity:</span>
            <span style="font-weight: 600;">${quantity}</span>
          </div>
          ${isLeader && followerCount ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Followers Copied:</span>
            <span style="font-weight: 600;">${followerCount}</span>
          </div>
          ` : ''}
        </div>
        <p style="font-size: 14px; color: #666;">${isLeader ? 'Your followers are automatically copying your trades based on their allocation settings.' : 'You can view your complete trading history in your LeadTrade dashboard.'}</p>
      </div>
    </div>
  `;
}

/**
 * Generate copy trade email HTML
 */
export function generateCopyTradeEmailHtml(params: {
  followerName: string;
  leaderName: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  portfolioPercentage?: number;
}): string {
  const { followerName, leaderName, symbol, side, quantity, portfolioPercentage } = params;
  const sideColor = side === 'buy' ? '#10b981' : '#ef4444';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Copy Trade Executed</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px;">Hi ${followerName},</p>
        <p style="font-size: 16px;">A trade from <strong>${leaderName}</strong> has been copied to your account:</p>
        <div style="background: white; border: 2px solid ${sideColor}; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <div style="background: #f3f4f6; padding: 10px; border-radius: 6px; margin-bottom: 15px; text-align: center;">
            <span style="font-size: 14px; color: #666;">Following: <strong>${leaderName}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <span style="font-weight: 600; color: #666;">Action:</span>
            <span style="font-weight: 700; color: ${sideColor}; font-size: 18px;">${side.toUpperCase()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Symbol:</span>
            <span style="font-weight: 600;">${symbol}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Quantity:</span>
            <span style="font-weight: 600;">${quantity.toFixed(9)}</span>
          </div>
          ${portfolioPercentage ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Portfolio %:</span>
            <span style="font-weight: 600;">${portfolioPercentage.toFixed(4)}%</span>
          </div>
          ` : ''}
        </div>
        <p style="font-size: 14px; color: #666;">You can manage your copy trading settings and view all trades in your dashboard.</p>
      </div>
    </div>
  `;
}
