# Email Integration Examples

Real-world examples for integrating the email system into LeadTrade.

## Table of Contents

1. [User Signup Flow](#user-signup-flow)
2. [Password Reset Flow](#password-reset-flow)
3. [Trade Execution Flow](#trade-execution-flow)
4. [Copy Trading Flow](#copy-trading-flow)
5. [Support Inquiry Flow](#support-inquiry-flow)
6. [Batch Notifications](#batch-notifications)
7. [Error Handling & Retries](#error-handling--retries)

---

## User Signup Flow

### In `src/lib/signup-service.ts`

```typescript
import { sendAuthEmail, getWelcomeEmailTemplate } from '@/lib/email';

// After successful user creation
export async function completeSignup(authData: any, signupData: SignupData) {
  // ... existing signup logic ...

  // Send welcome email
  if (authData.user?.email) {
    const verificationUrl = authData.user.email_confirmed_at
      ? undefined
      : `${import.meta.env.PUBLIC_APP_URL}/verify?token=${authData.session?.access_token}`;

    const { html, text } = getWelcomeEmailTemplate(
      signupData.full_name || signupData.email.split('@')[0],
      verificationUrl
    );

    const emailResult = await sendAuthEmail({
      to: authData.user.email,
      subject: 'Welcome to LeadTrade',
      html,
      text,
    });

    if (!emailResult.success) {
      console.error('Failed to send welcome email:', emailResult.error);
      // Don't fail signup if email fails
    }
  }

  return {
    success: true,
    userId: authData.user.id,
    needsEmailVerification: !authData.user.email_confirmed_at,
  };
}
```

---

## Password Reset Flow

### Create `src/pages/api/auth/reset-password.ts`

```typescript
import type { APIRoute } from 'astro';
import { supabaseAuth } from '@/lib/supabase';
import { sendAuthEmail, getPasswordResetTemplate } from '@/lib/email';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();

    // Request password reset from Supabase
    const { data, error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.PUBLIC_APP_URL}/reset-password`,
    });

    if (error) throw error;

    // Supabase will send its own email, but you can also send a custom one
    // Get user profile for name
    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('full_name')
      .eq('email', email)
      .single();

    // Send custom email (optional - Supabase already sends one)
    // This is only if you want full control over the email design
    /*
    const resetUrl = `${import.meta.env.PUBLIC_APP_URL}/reset-password?token=...`;
    const { html, text } = getPasswordResetTemplate(
      profile?.full_name || 'User',
      resetUrl
    );

    await sendAuthEmail({
      to: email,
      subject: 'Reset Your Password - LeadTrade',
      html,
      text,
    });
    */

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to send reset email' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

---

## Trade Execution Flow

### Create `src/lib/notifications/trade-notifications.ts`

```typescript
import { sendTradingEmail, getTradeConfirmationTemplate } from '@/lib/email';
import { supabaseAuth } from '@/lib/supabase';

export async function notifyTradeExecution(
  userId: string,
  trade: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    orderId: string;
    executedAt: string;
  }
) {
  try {
    // Get user details
    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) {
      console.error('User email not found:', userId);
      return { success: false, error: 'User email not found' };
    }

    // Generate email
    const { html, text } = getTradeConfirmationTemplate(
      profile.full_name || 'Trader',
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

    // Send email
    return await sendTradingEmail({
      to: profile.email,
      subject: `Trade Confirmation - ${trade.side.toUpperCase()} ${trade.symbol}`,
      html,
      text,
    });
  } catch (error) {
    console.error('Trade notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: 'resend' as const,
    };
  }
}
```

### Use in Alpaca webhook handler

```typescript
// In your Alpaca webhook handler
import { notifyTradeExecution } from '@/lib/notifications/trade-notifications';

// When trade is filled
if (event.event_type === 'trade_updates' && event.order.status === 'filled') {
  await notifyTradeExecution(userId, {
    symbol: event.order.symbol,
    side: event.order.side,
    quantity: parseFloat(event.order.filled_qty),
    price: parseFloat(event.order.filled_avg_price),
    orderId: event.order.id,
    executedAt: event.order.filled_at,
  });
}
```

---

## Copy Trading Flow

### In `supabase/functions/execute-copy-trades/index.ts`

```typescript
import { sendTradingEmail, getCopyTradeNotificationTemplate } from '@/lib/email';

async function notifyFollower(
  follower: { id: string; email: string; full_name: string },
  leader: { full_name: string },
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
    follower.full_name,
    leader.full_name,
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
    subject: `Copy Trade Executed - ${trade.symbol}`,
    html,
    text,
  });
}

// In your copy trade execution logic
for (const follower of followers) {
  // Execute trade for follower
  const copiedTrade = await executeTrade(follower, leaderTrade);

  // Notify follower
  await notifyFollower(
    follower,
    { full_name: leader.full_name },
    {
      symbol: copiedTrade.symbol,
      side: copiedTrade.side,
      quantity: copiedTrade.quantity,
      price: copiedTrade.price,
      orderId: copiedTrade.id,
      executedAt: copiedTrade.filled_at,
    }
  );
}
```

---

## Support Inquiry Flow

### Create `src/pages/api/support/submit.ts`

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { sendSupportEmail, getSupportInquiryTemplate } from '@/lib/email';

const inquirySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(10),
  userId: z.string().optional(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const inquiry = inquirySchema.parse(body);

    // Generate confirmation email for user
    const { html, text } = getSupportInquiryTemplate(inquiry);

    // Send confirmation to user
    const userResult = await sendSupportEmail({
      to: inquiry.email,
      subject: `Support Inquiry Received - ${inquiry.subject}`,
      html,
      text,
    });

    // Notify support team (forwarded to Gmail via Cloudflare)
    const supportResult = await sendSupportEmail({
      to: 'support@leadtrade.app',
      subject: `New Support Inquiry: ${inquiry.subject}`,
      html: `
        <h2>New Support Inquiry</h2>
        <p><strong>From:</strong> ${inquiry.name} (${inquiry.email})</p>
        ${inquiry.userId ? `<p><strong>User ID:</strong> ${inquiry.userId}</p>` : ''}
        <p><strong>Subject:</strong> ${inquiry.subject}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${inquiry.message}</p>
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

    return new Response(
      JSON.stringify({
        success: true,
        userEmailSent: userResult.success,
        supportNotified: supportResult.success,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Support inquiry error:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid input', details: error.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Failed to submit inquiry' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

---

## Batch Notifications

### Send notifications to multiple users

```typescript
import { sendTradingEmail, getTradeConfirmationTemplate } from '@/lib/email';
import { batchSendEmails } from '@/lib/email/utils';

export async function notifyMultipleUsers(
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
  // Create email send functions
  const emailFunctions = notifications.map((notification) => {
    return async () => {
      const { html, text } = getTradeConfirmationTemplate(
        notification.user.name,
        {
          symbol: notification.trade.symbol,
          side: notification.trade.side,
          quantity: notification.trade.quantity,
          price: notification.trade.price,
          total: notification.trade.quantity * notification.trade.price,
          timestamp: notification.trade.executedAt,
          orderId: notification.trade.orderId,
        }
      );

      return await sendTradingEmail({
        to: notification.user.email,
        subject: `Trade Confirmation - ${notification.trade.symbol}`,
        html,
        text,
      });
    };
  });

  // Send in batches of 10 with 1 second delay between batches
  const results = await batchSendEmails(emailFunctions, 10, 1000);

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`Batch email results: ${successful} sent, ${failed} failed`);

  return { successful, failed, results };
}
```

---

## Error Handling & Retries

### With automatic retry

```typescript
import { sendEmailWithRetry } from '@/lib/email/utils';
import { sendTradingEmail, getTradeConfirmationTemplate } from '@/lib/email';

export async function sendTradeNotificationWithRetry(
  user: { email: string; name: string },
  trade: any
) {
  const { html, text } = getTradeConfirmationTemplate(user.name, trade);

  // Retry up to 3 times with exponential backoff
  const result = await sendEmailWithRetry(
    () =>
      sendTradingEmail({
        to: user.email,
        subject: `Trade Confirmation - ${trade.symbol}`,
        html,
        text,
      }),
    3, // max retries
    1000 // base delay (1 second)
  );

  if (!result.success) {
    // Log to monitoring service
    console.error('Failed to send trade notification after retries:', result.error);

    // Could also:
    // - Add to queue for later retry
    // - Alert admin
    // - Store in database for manual review
  }

  return result;
}
```

### With queue for failed emails

```typescript
import { emailQueue, startQueueProcessor } from '@/lib/email/queue';
import { sendEmail } from '@/lib/email';

// Start queue processor on app startup
// In your main app file or server startup
startQueueProcessor(sendEmail, 60000); // Process every minute

// When sending email
export async function sendEmailWithQueue(
  category: 'auth' | 'trading' | 'support',
  payload: any
) {
  const result = await sendEmail(category, payload);

  // If failed, add to queue
  if (!result.success) {
    const queueId = emailQueue.add(category, payload, 5); // 5 max attempts
    console.log(`Email queued for retry: ${queueId}`);
  }

  return result;
}
```

---

## Monitoring Email Delivery

### Check metrics

```typescript
import { emailMonitor } from '@/lib/email/monitoring';

// Get overall metrics
const metrics = emailMonitor.getMetrics();
console.log(`Success rate: ${metrics.successRate}%`);

// Get category-specific metrics
const tradingMetrics = emailMonitor.getCategoryMetrics('trading');
console.log(`Trading emails: ${tradingMetrics.sent} sent, ${tradingMetrics.failed} failed`);

// Check health
if (!emailMonitor.isHealthy(90)) {
  console.error('Email delivery health below 90%!');
  // Alert admin
}

// Generate report
console.log(emailMonitor.generateReport());
```

### API endpoint for metrics

```bash
# Get email metrics
curl http://localhost:4321/api/email/metrics
```

---

## Complete Integration Checklist

- [ ] Add welcome email to signup flow
- [ ] Configure Supabase auth emails
- [ ] Add trade confirmation emails
- [ ] Add copy trade notifications
- [ ] Create support inquiry form
- [ ] Implement error handling and retries
- [ ] Set up email queue processor
- [ ] Add monitoring and alerts
- [ ] Test all email flows
- [ ] Monitor delivery rates

---

For more information, see:
- `src/lib/email/README.md` - API documentation
- `docs/EMAIL_SETUP_GUIDE.md` - Setup instructions
- `src/lib/email/examples.ts` - Code examples
