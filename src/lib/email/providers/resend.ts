/**
 * Resend Email Provider
 * Used for: Trading notifications (no branding on free tier)
 */

import type { EmailPayload, EmailResult } from '../types';

// Access environment variables - works in both Astro and Node.js contexts
const RESEND_API_KEY = typeof process !== 'undefined'
  ? process.env.RESEND_API_KEY
  : import.meta.env.RESEND_API_KEY;
const RESEND_API_URL = 'https://api.resend.com/emails';

export async function sendResendEmail(
  payload: EmailPayload,
  fromEmail: string,
  fromName: string
): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    console.error('Resend API key not configured');
    console.error('Checked process.env.RESEND_API_KEY:', typeof process !== 'undefined' ? !!process.env.RESEND_API_KEY : 'N/A');
    console.error('Checked import.meta.env.RESEND_API_KEY:', !!import.meta.env.RESEND_API_KEY);
    return {
      success: false,
      error: 'Resend API key not configured',
      provider: 'resend',
    };
  }

  try {
    const requestBody = {
      from: `${fromName} <${fromEmail}>`,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      ...(payload.text && { text: payload.text }),
      ...(payload.replyTo && { reply_to: payload.replyTo }),
      ...(payload.cc && { cc: payload.cc }),
      ...(payload.bcc && { bcc: payload.bcc }),
    };

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Resend API response status:', response.status);

    if (!response.ok) {
      const responseText = await response.text();
      console.error('Resend API error response:', responseText);

      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }

      throw new Error(errorData.message || `Resend API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.id,
      provider: 'resend',
    };
  } catch (error) {
    console.error('Resend email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: 'resend',
    };
  }
}
