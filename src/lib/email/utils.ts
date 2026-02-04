/**
 * Email Utility Functions
 */

import type { EmailResult } from './types';

/**
 * Retry email sending with exponential backoff
 */
export async function sendEmailWithRetry(
  sendFn: () => Promise<EmailResult>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<EmailResult> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await sendFn();

    if (result.success) {
      return result;
    }

    // Don't retry on validation errors
    if (result.error?.includes('Invalid') || result.error?.includes('required')) {
      return result;
    }

    // Retry on rate limits or temporary failures
    if (attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Email send failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: `Failed after ${maxRetries} attempts`,
    provider: 'brevo',
  };
}

/**
 * Batch send emails with rate limiting
 */
export async function batchSendEmails(
  emails: Array<() => Promise<EmailResult>>,
  batchSize = 10,
  delayBetweenBatches = 1000
): Promise<EmailResult[]> {
  const results: EmailResult[] = [];

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);

    // Delay between batches to avoid rate limits
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize email content to prevent injection
 */
export function sanitizeEmailContent(content: string): string {
  // Remove potentially dangerous HTML tags
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '');
}

/**
 * Format email subject with prefix
 */
export function formatSubject(subject: string, prefix?: string): string {
  if (!prefix) return subject;
  return `[${prefix}] ${subject}`;
}

/**
 * Extract plain text from HTML
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Log email result for monitoring
 */
export function logEmailResult(
  category: string,
  to: string | string[],
  result: EmailResult
): void {
  const recipients = Array.isArray(to) ? to.join(', ') : to;
  
  if (result.success) {
    console.log(`✓ Email sent [${category}] to ${recipients} via ${result.provider} (ID: ${result.messageId})`);
  } else {
    console.error(`✗ Email failed [${category}] to ${recipients}: ${result.error}`);
  }
}

/**
 * Check if rate limit error
 */
export function isRateLimitError(error?: string): boolean {
  if (!error) return false;
  const rateLimitKeywords = ['rate limit', 'too many requests', '429', 'quota exceeded'];
  return rateLimitKeywords.some(keyword => error.toLowerCase().includes(keyword));
}

/**
 * Get email provider status
 */
export async function checkProviderStatus(): Promise<{
  brevo: boolean;
  resend: boolean;
}> {
  const brevoKey = import.meta.env.BREVO_API_KEY;
  const resendKey = import.meta.env.RESEND_API_KEY;

  return {
    brevo: !!brevoKey && brevoKey.startsWith('xkeysib-'),
    resend: !!resendKey && resendKey.startsWith('re_'),
  };
}
