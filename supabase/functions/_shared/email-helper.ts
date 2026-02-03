/**
 * Shared Email Helper for Supabase Edge Functions
 * Provides a simple interface to send emails via the send-email function
 */

interface EmailPayload {
  category: 'auth' | 'trading' | 'support' | 'marketing';
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via Supabase edge function
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase configuration');
    return {
      success: false,
      error: 'Supabase configuration not found',
    };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return {
        success: true,
        messageId: result.messageId,
      };
    } else {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
