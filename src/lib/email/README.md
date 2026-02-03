# LeadTrade Email Service

Centralized email delivery system with automatic routing to Brevo and Resend providers.

## Quick Start

```typescript
import { sendAuthEmail, sendTradingEmail, sendSupportEmail } from '@/lib/email';
import { getWelcomeEmailTemplate, getTradeConfirmationTemplate } from '@/lib/email';

// Send welcome email
const { html, text } = getWelcomeEmailTemplate('John Doe', 'https://verify-url');
await sendAuthEmail({
  to: 'user@example.com',
  subject: 'Welcome to LeadTrade',
  html,
  text,
});

// Send trade confirmation
const { html, text } = getTradeConfirmationTemplate('John Doe', {
  symbol: 'AAPL',
  side: 'buy',
  quantity: 10,
  price: 150.25,
  total: 1502.50,
  timestamp: new Date().toISOString(),
  orderId: 'ORDER-123',
});
await sendTradingEmail({
  to: 'user@example.com',
  subject: 'Trade Confirmation - AAPL',
  html,
  text,
});
```

## Email Categories

| Category | Provider | From Address | Use Case |
|----------|----------|--------------|----------|
| `auth` | Brevo | no-reply@auth.leadtrade.app | Password resets, email verification |
| `trading` | Resend | notifications@trade.leadtrade.app | Trade confirmations, copy trade alerts |
| `support` | Brevo | support@leadtrade.app | Support inquiries, help requests |
| `marketing` | Brevo | hello@marketing.leadtrade.app | Marketing campaigns (future) |

## API Reference

### Send Functions

#### `sendEmail(category, payload)`
Generic send function that routes to appropriate provider.

```typescript
import { sendEmail } from '@/lib/email';

await sendEmail('auth', {
  to: 'user@example.com',
  subject: 'Email Verification',
  html: '<p>Please verify your email</p>',
  text: 'Please verify your email',
});
```

#### `sendAuthEmail(payload)`
Send authentication-related emails via Brevo.

```typescript
await sendAuthEmail({
  to: 'user@example.com',
  subject: 'Password Reset',
  html: '<p>Reset your password</p>',
  text: 'Reset your password',
  replyTo: 'support@leadtrade.app', // optional
});
```

#### `sendTradingEmail(payload)`
Send trading notifications via Resend (no branding).

```typescript
await sendTradingEmail({
  to: 'user@example.com',
  subject: 'Trade Executed',
  html: '<p>Your trade was executed</p>',
  text: 'Your trade was executed',
});
```

#### `sendSupportEmail(payload)`
Send support-related emails via Brevo.

```typescript
await sendSupportEmail({
  to: 'user@example.com',
  subject: 'Support Inquiry Received',
  html: '<p>We received your message</p>',
  text: 'We received your message',
  cc: ['admin@leadtrade.app'], // optional
});
```

#### `sendMarketingEmail(payload)`
Send marketing emails via Brevo (future use).

```typescript
await sendMarketingEmail({
  to: ['user1@example.com', 'user2@example.com'],
  subject: 'New Feature Announcement',
  html: '<p>Check out our new feature</p>',
  text: 'Check out our new feature',
});
```

### Email Payload

```typescript
interface EmailPayload {
  to: string | string[];        // Recipient(s)
  subject: string;               // Email subject
  html: string;                  // HTML content
  text?: string;                 // Plain text fallback
  replyTo?: string;              // Reply-to address
  cc?: string[];                 // CC recipients
  bcc?: string[];                // BCC recipients
}
```

### Email Result

```typescript
interface EmailResult {
  success: boolean;              // Whether email was sent
  messageId?: string;            // Provider message ID
  error?: string;                // Error message if failed
  provider: 'brevo' | 'resend';  // Which provider was used
}
```

## Templates

### Auth Templates

#### Welcome Email
```typescript
import { getWelcomeEmailTemplate } from '@/lib/email';

const { html, text } = getWelcomeEmailTemplate(
  'John Doe',
  'https://leadtrade.app/verify?token=abc123' // optional
);
```

#### Password Reset
```typescript
import { getPasswordResetTemplate } from '@/lib/email';

const { html, text } = getPasswordResetTemplate(
  'John Doe',
  'https://leadtrade.app/reset-password?token=abc123'
);
```

#### Email Verification
```typescript
import { getEmailVerificationTemplate } from '@/lib/email';

const { html, text } = getEmailVerificationTemplate(
  'John Doe',
  'https://leadtrade.app/verify?token=abc123'
);
```

### Trading Templates

#### Trade Confirmation
```typescript
import { getTradeConfirmationTemplate } from '@/lib/email';

const { html, text } = getTradeConfirmationTemplate('John Doe', {
  symbol: 'AAPL',
  side: 'buy',
  quantity: 10,
  price: 150.25,
  total: 1502.50,
  timestamp: new Date().toISOString(),
  orderId: 'ORDER-123',
});
```

#### Copy Trade Notification
```typescript
import { getCopyTradeNotificationTemplate } from '@/lib/email';

const { html, text } = getCopyTradeNotificationTemplate(
  'John Doe',      // follower name
  'Jane Smith',    // leader name
  {
    symbol: 'TSLA',
    side: 'sell',
    quantity: 5,
    price: 250.00,
    total: 1250.00,
    timestamp: new Date().toISOString(),
    orderId: 'ORDER-456',
  }
);
```

### Support Templates

#### Support Inquiry Confirmation
```typescript
import { getSupportInquiryTemplate } from '@/lib/email';

const { html, text } = getSupportInquiryTemplate({
  name: 'John Doe',
  email: 'john@example.com',
  subject: 'Account Issue',
  message: 'I cannot access my account...',
  userId: 'user-123', // optional
});
```

#### Support Response
```typescript
import { getSupportResponseTemplate } from '@/lib/email';

const { html, text } = getSupportResponseTemplate(
  'John Doe',
  'I cannot access my account...',  // original message
  'We have reset your password...'  // response
);
```

## Usage Examples

### User Signup Flow

```typescript
import { sendAuthEmail, getWelcomeEmailTemplate } from '@/lib/email';

async function handleUserSignup(user: { name: string; email: string; verificationToken: string }) {
  const verificationUrl = `${import.meta.env.PUBLIC_APP_URL}/verify?token=${user.verificationToken}`;
  
  const { html, text } = getWelcomeEmailTemplate(user.name, verificationUrl);
  
  const result = await sendAuthEmail({
    to: user.email,
    subject: 'Welcome to LeadTrade - Verify Your Email',
    html,
    text,
  });
  
  if (!result.success) {
    console.error('Failed to send welcome email:', result.error);
    // Handle error (retry, log, alert admin, etc.)
  }
  
  return result;
}
```

### Trade Execution Flow

```typescript
import { sendTradingEmail, getTradeConfirmationTemplate } from '@/lib/email';

async function handleTradeExecution(trade: Trade, user: User) {
  const { html, text } = getTradeConfirmationTemplate(user.name, {
    symbol: trade.symbol,
    side: trade.side,
    quantity: trade.quantity,
    price: trade.price,
    total: trade.quantity * trade.price,
    timestamp: trade.executedAt,
    orderId: trade.orderId,
  });
  
  const result = await sendTradingEmail({
    to: user.email,
    subject: `Trade Confirmation - ${trade.side.toUpperCase()} ${trade.symbol}`,
    html,
    text,
  });
  
  return result;
}
```

### Copy Trade Flow

```typescript
import { sendTradingEmail, getCopyTradeNotificationTemplate } from '@/lib/email';

async function handleCopyTrade(follower: User, leader: User, trade: Trade) {
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
  
  const result = await sendTradingEmail({
    to: follower.email,
    subject: `Copy Trade Executed - ${trade.symbol}`,
    html,
    text,
  });
  
  return result;
}
```

### Support Inquiry Flow

```typescript
import { sendSupportEmail, getSupportInquiryTemplate } from '@/lib/email';

async function handleSupportInquiry(inquiry: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const { html, text } = getSupportInquiryTemplate(inquiry);
  
  // Send confirmation to user
  const userResult = await sendSupportEmail({
    to: inquiry.email,
    subject: `Support Inquiry Received - ${inquiry.subject}`,
    html,
    text,
  });
  
  // Notify support team (via Gmail forwarding)
  const adminResult = await sendSupportEmail({
    to: 'support@leadtrade.app',
    subject: `New Support Inquiry: ${inquiry.subject}`,
    html: `<p><strong>From:</strong> ${inquiry.name} (${inquiry.email})</p><p><strong>Message:</strong></p><p>${inquiry.message}</p>`,
    text: `From: ${inquiry.name} (${inquiry.email})\n\nMessage:\n${inquiry.message}`,
    replyTo: inquiry.email,
  });
  
  return { userResult, adminResult };
}
```

## Testing

### Test Endpoint

```bash
# Test all email categories
curl -X POST http://localhost:4321/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "category": "all",
    "to": "your.email@gmail.com"
  }'

# Test specific category
curl -X POST http://localhost:4321/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "category": "trading",
    "to": "your.email@gmail.com"
  }'
```

### Manual Testing

```typescript
import { sendAuthEmail } from '@/lib/email';

// In your test file or API route
await sendAuthEmail({
  to: 'test@example.com',
  subject: 'Test Email',
  html: '<h1>Test</h1><p>This is a test email.</p>',
  text: 'Test\n\nThis is a test email.',
});
```

## Error Handling

```typescript
import { sendTradingEmail } from '@/lib/email';

const result = await sendTradingEmail({
  to: 'user@example.com',
  subject: 'Trade Confirmation',
  html: '<p>Your trade was executed</p>',
  text: 'Your trade was executed',
});

if (!result.success) {
  console.error('Email failed:', result.error);
  
  // Retry logic
  if (result.error?.includes('rate limit')) {
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 60000));
    // Retry...
  }
  
  // Alert admin
  // Log to monitoring service
  // Store for later retry
}
```

## Rate Limits

### Brevo (Free Tier)
- 300 emails/day
- Unlimited contacts
- Branding in emails

### Resend (Free Tier)
- 100 emails/day
- 3,000 emails/month
- No branding

### Handling Rate Limits

```typescript
import { sendEmail } from '@/lib/email';

async function sendEmailWithRetry(category: string, payload: EmailPayload, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await sendEmail(category, payload);
    
    if (result.success) {
      return result;
    }
    
    if (result.error?.includes('rate limit') && i < maxRetries - 1) {
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      continue;
    }
    
    return result;
  }
}
```

## Environment Variables

Required in `.env`:

```bash
BREVO_API_KEY=xkeysib-your_api_key_here
RESEND_API_KEY=re_your_api_key_here
```

## Troubleshooting

### Emails not sending

1. Check API keys are set correctly
2. Verify domains are verified in provider dashboards
3. Check rate limits
4. Review provider status pages

### Emails going to spam

1. Verify SPF, DKIM, DMARC records
2. Check domain reputation
3. Warm up new domains gradually
4. Avoid spam trigger words

### Wrong sender address

1. Check email category is correct
2. Verify domain is verified in provider
3. Check sender address is configured

## Support

For setup instructions, see:
- `docs/EMAIL_SETUP_GUIDE.md` - Complete setup guide
- `docs/EMAIL_SETUP_CHECKLIST.md` - Quick checklist

For issues:
- Check provider dashboards for delivery status
- Review application logs
- Test with `/api/email/test` endpoint
