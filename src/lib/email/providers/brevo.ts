/**
 * Brevo (Sendinblue) Email Provider
 * Used for: Auth, Support, Marketing
 */

import type { EmailPayload, EmailResult } from '../types';

// Access environment variables - works in both Astro and Node.js contexts
const BREVO_API_KEY = typeof process !== 'undefined' 
  ? process.env.BREVO_API_KEY 
  : import.meta.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export async function sendBrevoEmail(
  payload: EmailPayload,
  fromEmail: string,
  fromName: string
): Promise<EmailResult> {
  if (!BREVO_API_KEY) {
    console.error('Brevo API key not configured');
    console.error('Checked process.env.BREVO_API_KEY:', typeof process !== 'undefined' ? !!process.env.BREVO_API_KEY : 'N/A');
    console.error('Checked import.meta.env.BREVO_API_KEY:', !!import.meta.env.BREVO_API_KEY);
    return {
      success: false,
      error: 'Brevo API key not configured',
      provider: 'brevo',
    };
  }

  try {
    const recipients = Array.isArray(payload.to) 
      ? payload.to.map(email => ({ email }))
      : [{ email: payload.to }];

    const requestBody = {
      sender: {
        email: fromEmail,
        name: fromName,
      },
      to: recipients,
      subject: payload.subject,
      htmlContent: payload.html,
      textContent: payload.text,
      ...(payload.replyTo && { replyTo: { email: payload.replyTo } }),
      ...(payload.cc && { cc: payload.cc.map(email => ({ email })) }),
      ...(payload.bcc && { bcc: payload.bcc.map(email => ({ email })) }),
    };

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Brevo API response status:', response.status);
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error('Brevo API error response:', responseText);
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      
      throw new Error(errorData.message || `Brevo API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.messageId,
      provider: 'brevo',
    };
  } catch (error) {
    console.error('Brevo email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: 'brevo',
    };
  }
}
