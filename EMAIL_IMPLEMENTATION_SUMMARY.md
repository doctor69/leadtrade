# LeadTrade Email System - Implementation Summary

## What Was Built

A comprehensive email delivery system for LeadTrade with automatic routing to Brevo and Resend providers based on email category.

### Email Routing Strategy

| Category | Provider | From Address | Purpose |
|----------|----------|--------------|---------|
| **Auth** | Brevo | no-reply@auth.leadtrade.app | Password resets, email verification, account security |
| **Trading** | Resend | notifications@trade.leadtrade.app | Trade confirmations, copy trade alerts |
| **Support** | Brevo | support@leadtrade.app | Support inquiries, help requests |
| **Marketing** | Brevo | hello@marketing.leadtrade.app | Marketing campaigns (future) |

**Why Two Providers?**
- **Brevo**: Free tier supports multiple domains but includes branding
- **Resend**: Free tier has no branding but limited to one domain
- Cost-effective solution: Use Resend for customer-facing trading emails (no branding), Brevo for everything else

---

## Files Created

### Core Email Service
```
src/lib/email/
├── index.ts                      # Main exports
├── types.ts                      # TypeScript definitions & routing config
├── service.ts                    # Email routing logic
├── providers/
│   ├── brevo.ts                  # Brevo API integration
│   └── resend.ts                 # Resend API integration
├── templates/
│   ├── auth.ts                   # Welcome, password reset, verification
│   ├── trading.ts                # Trade confirmations, copy trades
│   └── support.ts                # Support inquiries, responses
└── README.md                     # Usage documentation
```

### API Endpoints
```
src/pages/api/email/
├── send.ts                       # Generic email send endpoint
└── test.ts                       # Test email delivery
```

### Supabase Edge Function
```
supabase/functions/
├── _shared/
│   └── cors.ts                   # CORS headers
└── send-email/
    └── index.ts                  # Edge function for email delivery
```

### Documentation
```
docs/
├── EMAIL_SETUP_GUIDE.md          # Complete setup instructions
└── EMAIL_SETUP_CHECKLIST.md      # Quick setup checklist
```

---

## Setup Instructions

### Step 1: Get API Keys

#### Brevo (15 minutes)
1. Create account at https://www.brevo.com/
2. Go to Settings → SMTP & API
3. Create API key named "LeadTrade Production"
4. Copy key and add to `.env`:
   ```bash
   BREVO_API_KEY=xkeysib-your_key_here
   ```

#### Resend (10 minutes)
1. Create account at https://resend.com/
2. Go to API Keys
3. Create API key named "LeadTrade Production"
4. Copy key and add to `.env`:
   ```bash
   RESEND_API_KEY=re_your_key_here
   ```

### Step 2: Configure Domains

#### In Brevo Dashboard
Add these domains:
- `auth.leadtrade.app`
- `leadtrade.app`
- `marketing.leadtrade.app`

For each domain, note the DNS records (TXT, DKIM, MX)

#### In Resend Dashboard
Add domain:
- `trade.leadtrade.app`

Note the DNS records (TXT, DKIM, MX)

### Step 3: Configure DNS in Cloudflare

For each domain, add the DNS records provided by Brevo/Resend:

**Example for auth.leadtrade.app:**
```
Type: TXT
Name: auth.leadtrade.app
Content: [verification code from Brevo]
Proxy: DNS only (gray cloud)

Type: TXT
Name: mail._domainkey.auth.leadtrade.app
Content: [DKIM key from Brevo]
Proxy: DNS only

Type: MX
Name: auth.leadtrade.app
Content: [MX record from Brevo]
Priority: 10
Proxy: DNS only
```

**Add SPF record to main domain:**
```
Type: TXT
Name: leadtrade.app
Content: v=spf1 include:spf.brevo.com include:resend.com ~all
Proxy: DNS only
```

### Step 4: Configure Gmail Forwarding

1. Go to Cloudflare → Email → Email Routing
2. Enable Email Routing
3. Add destination: `your.email@gmail.com`
4. Verify email in Gmail
5. Create routing rules:
   - `support@leadtrade.app` → `your.email@gmail.com`
   - `hello@leadtrade.app` → `your.email@gmail.com`

### Step 5: Configure Supabase Auth

1. Log in to Supabase Dashboard
2. Go to Project Settings → Auth
3. Enable Custom SMTP:
   ```
   Host: smtp-relay.brevo.com
   Port: 587
   Username: [from Brevo dashboard]
   Password: [from Brevo dashboard]
   Sender: no-reply@auth.leadtrade.app
   ```
4. Go to Authentication → Email Templates
5. Update sender for all templates to: `no-reply@auth.leadtrade.app`

### Step 6: Deploy Supabase Edge Function

```bash
# Navigate to supabase directory
cd supabase

# Set environment variables
supabase secrets set BREVO_API_KEY=xkeysib-your_key_here
supabase secrets set RESEND_API_KEY=re_your_key_here

# Deploy function
supabase functions deploy send-email
```

### Step 7: Test Email Delivery

```bash
# Start dev server
npm run dev

# Test all email categories
curl -X POST http://localhost:4321/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "category": "all",
    "to": "your.email@gmail.com"
  }'
```

Check your Gmail for:
- Welcome email from `no-reply@auth.leadtrade.app`
- Trade confirmation from `notifications@trade.leadtrade.app`
- Support inquiry from `support@leadtrade.app`

---

## Usage Examples

### Send Welcome Email

```typescript
import { sendAuthEmail, getWelcomeEmailTemplate } from '@/lib/email';

const { html, text } = getWelcomeEmailTemplate(
  'John Doe',
  'https://leadtrade.app/verify?token=abc123'
);

await sendAuthEmail({
  to: 'user@example.com',
  subject: 'Welcome to LeadTrade',
  html,
  text,
});
```

### Send Trade Confirmation

```typescript
import { sendTradingEmail, getTradeConfirmationTemplate } from '@/lib/email';

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

### Send Copy Trade Notification

```typescript
import { sendTradingEmail, getCopyTradeNotificationTemplate } from '@/lib/email';

const { html, text } = getCopyTradeNotificationTemplate(
  'Follower Name',
  'Leader Name',
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

await sendTradingEmail({
  to: 'follower@example.com',
  subject: 'Copy Trade Executed - TSLA',
  html,
  text,
});
```

### Send Support Inquiry

```typescript
import { sendSupportEmail, getSupportInquiryTemplate } from '@/lib/email';

const { html, text } = getSupportInquiryTemplate({
  name: 'John Doe',
  email: 'john@example.com',
  subject: 'Account Issue',
  message: 'I cannot access my account...',
});

await sendSupportEmail({
  to: 'john@example.com',
  subject: 'Support Inquiry Received',
  html,
  text,
});
```

---

## Integration Points

### 1. User Signup (src/lib/signup-service.ts)

Add after successful signup:

```typescript
import { sendAuthEmail, getWelcomeEmailTemplate } from '@/lib/email';

// After user creation
const verificationUrl = `${import.meta.env.PUBLIC_APP_URL}/verify?token=${verificationToken}`;
const { html, text } = getWelcomeEmailTemplate(userData.full_name, verificationUrl);

await sendAuthEmail({
  to: userData.email,
  subject: 'Welcome to LeadTrade - Verify Your Email',
  html,
  text,
});
```

### 2. Trade Execution

Create new file `src/lib/trade-notifications.ts`:

```typescript
import { sendTradingEmail, getTradeConfirmationTemplate } from '@/lib/email';

export async function notifyTradeExecution(trade: Trade, user: User) {
  const { html, text } = getTradeConfirmationTemplate(user.full_name, {
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
```

### 3. Copy Trading

In `supabase/functions/execute-copy-trades/index.ts`:

```typescript
import { sendTradingEmail, getCopyTradeNotificationTemplate } from '@/lib/email';

// After copying trade
const { html, text } = getCopyTradeNotificationTemplate(
  follower.full_name,
  leader.full_name,
  tradeDetails
);

await sendTradingEmail({
  to: follower.email,
  subject: `Copy Trade Executed - ${tradeDetails.symbol}`,
  html,
  text,
});
```

### 4. Support Form

Create `src/pages/api/support/submit.ts`:

```typescript
import { sendSupportEmail, getSupportInquiryTemplate } from '@/lib/email';

export const POST: APIRoute = async ({ request }) => {
  const inquiry = await request.json();
  
  const { html, text } = getSupportInquiryTemplate(inquiry);
  
  // Send confirmation to user
  await sendSupportEmail({
    to: inquiry.email,
    subject: `Support Inquiry Received - ${inquiry.subject}`,
    html,
    text,
  });
  
  // Notify support team (forwarded to Gmail)
  await sendSupportEmail({
    to: 'support@leadtrade.app',
    subject: `New Support Inquiry: ${inquiry.subject}`,
    html: `<p><strong>From:</strong> ${inquiry.name} (${inquiry.email})</p><p>${inquiry.message}</p>`,
    text: `From: ${inquiry.name} (${inquiry.email})\n\n${inquiry.message}`,
    replyTo: inquiry.email,
  });
  
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
```

---

## Cloudflare Email Routing Setup

### Enable Email Routing

1. Log in to Cloudflare
2. Select domain: `leadtrade.app`
3. Go to **Email** → **Email Routing**
4. Click **Get started**

### Add Destination

1. Click **Destination addresses**
2. Add: `your.email@gmail.com`
3. Verify in Gmail

### Create Routing Rules

```
support@leadtrade.app → your.email@gmail.com
hello@leadtrade.app → your.email@gmail.com
```

### Optional: Catch-All

Forward all emails to your Gmail:
1. Click **Create address**
2. Select **Catch-all address**
3. Forward to: `your.email@gmail.com`

---

## DNS Verification Commands

```bash
# Verify TXT records
dig TXT auth.leadtrade.app
dig TXT trade.leadtrade.app
dig TXT leadtrade.app

# Verify MX records
dig MX leadtrade.app
dig MX auth.leadtrade.app
dig MX trade.leadtrade.app

# Verify DKIM
dig TXT mail._domainkey.auth.leadtrade.app
dig TXT resend._domainkey.trade.leadtrade.app

# Verify SPF
dig TXT leadtrade.app | grep spf
```

---

## Rate Limits

### Brevo Free Tier
- 300 emails/day
- Unlimited contacts
- Branding in emails
- Multiple domains

### Resend Free Tier
- 100 emails/day
- 3,000 emails/month
- No branding
- 1 domain

### Monitoring

Check usage in dashboards:
- **Brevo**: Statistics → Email
- **Resend**: Analytics

---

## Troubleshooting

### Emails Not Sending

1. Check API keys in `.env`
2. Verify domains in provider dashboards
3. Check rate limits
4. Review provider status pages

### Emails in Spam

1. Verify SPF/DKIM/DMARC records
2. Check domain reputation
3. Warm up domains gradually
4. Avoid spam trigger words

### DNS Not Propagating

1. Wait 24-48 hours
2. Ensure records are "DNS only" (not proxied)
3. Use `dig` to verify

### Wrong Sender Address

1. Check email category
2. Verify domain is verified
3. Check sender configuration

---

## Next Steps

1. **Complete Setup**: Follow `docs/EMAIL_SETUP_CHECKLIST.md`
2. **Test Thoroughly**: Use `/api/email/test` endpoint
3. **Integrate**: Add email notifications to signup, trading, support flows
4. **Monitor**: Check provider dashboards regularly
5. **Upgrade**: When approaching rate limits

---

## Documentation

- **Complete Guide**: `docs/EMAIL_SETUP_GUIDE.md`
- **Quick Checklist**: `docs/EMAIL_SETUP_CHECKLIST.md`
- **Usage Examples**: `src/lib/email/README.md`

---

## Support

For issues:
1. Check provider dashboards
2. Review application logs
3. Test with `/api/email/test`
4. Verify DNS with `dig` commands

Contact: support@leadtrade.app
