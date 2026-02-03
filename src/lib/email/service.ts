/**
 * Email Service
 * Routes emails to appropriate providers based on category
 */

import type { EmailCategory, EmailPayload, EmailResult } from './types';
import { EMAIL_CONFIGS } from './types';
import { sendBrevoEmail } from './providers/brevo';
import { sendResendEmail } from './providers/resend';
import { emailMonitor } from './monitoring';
import { logEmailResult } from './utils';

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

  // Route to appropriate provider
  let result: EmailResult;
  if (config.provider === 'resend') {
    result = await sendResendEmail(payload, config.fromEmail, config.fromName);
  } else {
    result = await sendBrevoEmail(payload, config.fromEmail, config.fromName);
  }

  // Track metrics and log
  emailMonitor.record(category, result);
  logEmailResult(category, payload.to, result);

  return result;
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
