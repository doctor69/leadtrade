/**
 * Email Service Types
 * Defines email categories and routing for LeadTrade
 */

export type EmailProvider = 'brevo' | 'resend';

export type EmailCategory = 
  | 'auth'           // Authentication, password resets (Brevo)
  | 'trading'        // Trade notifications, confirmations (Resend)
  | 'support'        // Support inquiries, help requests (Brevo)
  | 'marketing';     // Marketing campaigns (Brevo - future)

export interface EmailConfig {
  category: EmailCategory;
  provider: EmailProvider;
  fromEmail: string;
  fromName: string;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: EmailProvider;
}

// Email routing configuration
export const EMAIL_CONFIGS: Record<EmailCategory, EmailConfig> = {
  auth: {
    category: 'auth',
    provider: 'brevo',
    fromEmail: 'no-reply@auth.leadtrade.app',
    fromName: 'LeadTrade Authentication',
  },
  trading: {
    category: 'trading',
    provider: 'resend',
    fromEmail: 'notifications@trade.leadtrade.app',
    fromName: 'LeadTrade Trading',
  },
  support: {
    category: 'support',
    provider: 'brevo',
    fromEmail: 'support@leadtrade.app',
    fromName: 'LeadTrade Support',
  },
  marketing: {
    category: 'marketing',
    provider: 'brevo',
    fromEmail: 'hello@marketing.leadtrade.app',
    fromName: 'LeadTrade',
  },
};
