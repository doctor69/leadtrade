/**
 * Email Integration Examples
 * Copy these into your application code
 */

import {
  sendAuthEmail,
  sendTradingEmail,
  sendSupportEmail,
  getWelcomeEmailTemplate,
  getPasswordResetTemplate,
  getTradeConfirmationTemplate,
  getCopyTradeNotificationTemplate,
  getSupportInquiryTemplate,
  sendEmailWithRetry,
} from './index';

// ============================================
// Example 1: User Signup with Email Verification
// ============================================

export async function sendWelcomeEmail(user: {
  email: string;
  name: string;
  verificationToken: string;
}) {
  const appUrl = import.meta.env.PUBLIC_APP_URL || 'https://leadtrade.app';
  const verificationUrl = `${appUrl}/verify?token=${user.verificationToken}`;

  const { html, text } = getWelcomeEmailTemplate(user.name, verificationUrl);

  return await sendEmailWithRetry(
    () =>
      sendAuthEmail({
        to: user.email,
        subject: 'Welcome to LeadTrade - Verify Your Email',
        html,
        text,
      }),
    3 // retry up to 3 times
  );
}

// ============================================
// Example 2: Password Reset
// ============================================

export async function sendPasswordResetEmail(user: {
  email: string;
  name: string;
  resetToken: string;
}) {
  const appUrl = import.meta.env.PUBLIC_APP_URL || 'https://leadtrade.app';
  const resetUrl = `${appUrl}/reset-password?token=${user.resetToken}`;

  const { html, text } = getPasswordResetTemplate(user.name, resetUrl);

  return await sendAuthEmail({
    to: user.email,
    subject: 'Reset Your Password - LeadTrade',
    html,
    text,
  });
}

// ============================================
// Example 3: Trade Execution Notification
// ============================================

export async function notifyTradeExecution(
  user: { email: string; name: string },
  trade: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    orderId: string;
    executedAt: string;
  }
) {
  const { html, text } = getTradeConfirmationTemplate(user.name, {
    symbol: trade.symbol,
    side: trade.side,
    quantity: trade.quantity,
    price: trade.price,
    total: trade.quantity * trade.price,
    timestamp: trade.executedAt,
    orderId: trade.orderId,
  });

  return await sendTradingEmail({
    to: user.email,
    subject: `Trade Confirmation - ${trade.side.toUpperCase()} ${trade.symbol}`,
    html,
    text,
  });
}

// ============================================
// Example 4: Copy Trade Notification
// ============================================

export async function notifyCopyTrade(
  follower: { email: string; name: string },
  leader: { name: string },
  trade: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    orderId: string;
    executedAt: string;
  }
) {
  const { html, text } = getCopyTradeNotificationTemplate(
    follower.name,
    leader.name,
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

  return await sendTradingEmail({
    to: follower.email,
    subject: `Copy Trade Executed - ${trade.symbol} from ${leader.name}`,
    html,
    text,
  });
}

// ============================================
// Example 5: Support Inquiry
// ============================================

export async function handleSupportInquiry(inquiry: {
  name: string;
  email: string;
  subject: string;
  message: string;
  userId?: string;
}) {
  const { html, text } = getSupportInquiryTemplate(inquiry);

  // Send confirmation to user
  const userResult = await sendSupportEmail({
    to: inquiry.email,
    subject: `Support Inquiry Received - ${inquiry.subject}`,
    html,
    text,
  });

  // Notify support team (will be forwarded to Gmail)
  const supportResult = await sendSupportEmail({
    to: 'support@leadtrade.app',
    subject: `New Support Inquiry: ${inquiry.subject}`,
    html: `
      <h2>New Support Inquiry</h2>
      <p><strong>From:</strong> ${inquiry.name} (${inquiry.email})</p>
      ${inquiry.userId ? `<p><strong>User ID:</strong> ${inquiry.userId}</p>` : ''}
      <p><strong>Subject:</strong> ${inquiry.subject}</p>
      <p><strong>Message:</strong></p>
      <p>${inquiry.message.replace(/\n/g, '<br>')}</p>
    `,
    text: `
New Support Inquiry

From: ${inquiry.name} (${inquiry.email})
${inquiry.userId ? `User ID: ${inquiry.userId}` : ''}
Subject: ${inquiry.subject}

Message:
${inquiry.message}
    `.trim(),
    replyTo: inquiry.email,
  });

  return { userResult, supportResult };
}

// ============================================
// Example 6: Batch Email Sending
// ============================================

export async function sendBulkTradeNotifications(
  notifications: Array<{
    user: { email: string; name: string };
    trade: {
      symbol: string;
      side: 'buy' | 'sell';
      quantity: number;
      price: number;
      orderId: string;
      executedAt: string;
    };
  }>
) {
  const results = [];

  // Send in batches to avoid rate limits
  for (const notification of notifications) {
    const result = await notifyTradeExecution(
      notification.user,
      notification.trade
    );
    results.push(result);

    // Small delay between emails
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

// ============================================
// Example 7: Email with Retry and Queue
// ============================================

import { emailQueue } from './queue';

export async function sendEmailWithQueue(
  category: 'auth' | 'trading' | 'support' | 'marketing',
  payload: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
  }
) {
  // Try to send immediately
  const result = await sendEmailWithRetry(
    () => {
      switch (category) {
        case 'auth':
          return sendAuthEmail(payload);
        case 'trading':
          return sendTradingEmail(payload);
        case 'support':
          return sendSupportEmail(payload);
        default:
          return sendAuthEmail(payload);
      }
    },
    2 // Try twice immediately
  );

  // If failed, add to queue for later retry
  if (!result.success) {
    const queueId = emailQueue.add(category, payload, 5); // 5 max attempts
    console.log(`Email queued for retry: ${queueId}`);
  }

  return result;
}
