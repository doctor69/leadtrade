# LeadTrade Email Setup Guide

Complete guide for setting up email delivery across Brevo and Resend providers.

## Overview

LeadTrade uses two email providers for cost optimization and branding:

- **Brevo (Sendinblue)**: Auth, Support, Marketing (free tier has branding, supports multiple domains)
- **Resend**: Trading notifications (free tier has no branding, single domain)

## Email Routing

| Category | From Address | Provider | Purpose |
|----------|-------------|----------|---------|
| Auth | no-reply@auth.leadtrade.app | Brevo | Password resets, email verification |
| Trading | notifications@trade.leadtrade.app | Resend | Trade confirmations, copy trade alerts |
| Support | support@leadtrade.app | Brevo | Support inquiries, help requests |
| Marketing | hello@marketing.leadtrade.app | Brevo | Marketing campaigns (future) |

---

## Part 1: Brevo Setup

### 1.1 Create Brevo Account

1. Go to [Brevo](https://www.brevo.com/) (formerly Sendinblue)
2. Sign up for a free account
3. Verify your email address

### 1.2 Get API Key

1. Navigate to **Settings** → **SMTP & API**
2. Click **Create a new API key**
3. Name it: `LeadTrade Production`
4. Copy the API key
5. Add to your `.env` file:
   ```bash
   BREVO_API_KEY=xkeysib-your_api_key_here
   ```

### 1.3 Add Sender Domains

#### Add auth.leadtrade.app

1. Go to **Settings** → **Senders & IP**
2. Click **Add a domain**
3. Enter: `auth.leadtrade.app`
4. Follow DNS verification steps (see Cloudflare section below)

#### Add leadtrade.app (for support@)

1. Click **Add a domain**
2. Enter: `leadtrade.app`
3. Follow DNS verification steps

#### Add marketing.leadtrade.app (future)

1. Click **Add a domain**
2. Enter: `marketing.leadtrade.app`
3. Follow DNS verification steps

### 1.4 Configure Sender Addresses

After domain verification:

1. Go to **Settings** → **Senders & IP** → **Senders**
2. Add sender: `no-reply@auth.leadtrade.app` (name: "LeadTrade Authentication")
3. Add sender: `support@leadtrade.app` (name: "LeadTrade Support")
4. Add sender: `hello@leadtrade.app` (name: "LeadTrade")
5. Add sender: `hello@marketing.leadtrade.app` (name: "LeadTrade")

---

## Part 2: Resend Setup

### 2.1 Create Resend Account

1. Go to [Resend](https://resend.com/)
2. Sign up for a free account
3. Verify your email address

### 2.2 Get API Key

1. Navigate to **API Keys**
2. Click **Create API Key**
3. Name it: `LeadTrade Production`
4. Select permissions: **Sending access**
5. Copy the API key
6. Add to your `.env` file:
   ```bash
   RESEND_API_KEY=re_your_api_key_here
   ```

### 2.3 Add Domain

1. Go to **Domains**
2. Click **Add Domain**
3. Enter: `trade.leadtrade.app`
4. Follow DNS verification steps (see Cloudflare section below)

### 2.4 Configure Sender

After domain verification, you can send from: `notifications@trade.leadtrade.app`

---

## Part 3: Cloudflare DNS Configuration

### 3.1 Brevo DNS Records

Add these DNS records in Cloudflare for each Brevo domain:

#### For auth.leadtrade.app:

```
Type: TXT
Name: auth.leadtrade.app
Content: [Brevo verification code from dashboard]
Proxy: DNS only (gray cloud)

Type: TXT
Name: mail._domainkey.auth.leadtrade.app
Content: [DKIM key from Brevo]
Proxy: DNS only

Type: MX
Name: auth.leadtrade.app
Content: [Brevo MX record]
Priority: 10
Proxy: DNS only
```

#### For leadtrade.app (support@):

```
Type: TXT
Name: leadtrade.app
Content: [Brevo verification code]
Proxy: DNS only

Type: TXT
Name: mail._domainkey.leadtrade.app
Content: [DKIM key from Brevo]
Proxy: DNS only

Type: MX
Name: leadtrade.app
Content: [Brevo MX record]
Priority: 10
Proxy: DNS only
```

#### For marketing.leadtrade.app:

```
Type: TXT
Name: marketing.leadtrade.app
Content: [Brevo verification code]
Proxy: DNS only

Type: TXT
Name: mail._domainkey.marketing.leadtrade.app
Content: [DKIM key from Brevo]
Proxy: DNS only

Type: MX
Name: marketing.leadtrade.app
Content: [Brevo MX record]
Priority: 10
Proxy: DNS only
```

### 3.2 Resend DNS Records

#### For trade.leadtrade.app:

```
Type: TXT
Name: trade.leadtrade.app
Content: [Resend verification code from dashboard]
Proxy: DNS only

Type: TXT
Name: resend._domainkey.trade.leadtrade.app
Content: [DKIM key from Resend]
Proxy: DNS only

Type: MX
Name: trade.leadtrade.app
Content: [Resend MX record]
Priority: 10
Proxy: DNS only
```

### 3.3 SPF Record (Important!)

Add SPF record to main domain to allow both providers:

```
Type: TXT
Name: leadtrade.app
Content: v=spf1 include:spf.brevo.com include:resend.com ~all
Proxy: DNS only
```

---

## Part 4: Gmail Forwarding Setup

To receive emails sent to LeadTrade addresses in your personal Gmail:

### 4.1 Cloudflare Email Routing

1. Log in to Cloudflare
2. Select your domain: `leadtrade.app`
3. Go to **Email** → **Email Routing**
4. Click **Get started** (if not already enabled)

### 4.2 Add Destination Address

1. Click **Destination addresses**
2. Click **Add destination address**
3. Enter your personal Gmail: `your.email@gmail.com`
4. Verify the email (check Gmail for verification link)

### 4.3 Create Routing Rules

Add these forwarding rules:

```
support@leadtrade.app → your.email@gmail.com
hello@leadtrade.app → your.email@gmail.com
no-reply@auth.leadtrade.app → your.email@gmail.com (optional)
notifications@trade.leadtrade.app → your.email@gmail.com (optional)
```

**Note**: For no-reply and notifications addresses, you may want to skip forwarding since they're typically one-way.

### 4.4 Catch-All (Optional)

To catch all emails to any @leadtrade.app address:

1. Click **Create address**
2. Select **Catch-all address**
3. Forward to: `your.email@gmail.com`

---

## Part 5: Supabase Auth Email Configuration

### 5.1 Disable Supabase Default Emails

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Email Templates**
4. For each template (Confirm signup, Reset password, etc.):
   - Click **Edit**
   - Note: We'll handle these via our custom email service

### 5.2 Configure Custom SMTP (Brevo)

1. Go to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Enable **Enable Custom SMTP**
4. Configure:
   ```
   Host: smtp-relay.brevo.com
   Port: 587
   Username: [Your Brevo SMTP username from dashboard]
   Password: [Your Brevo SMTP password]
   Sender email: no-reply@auth.leadtrade.app
   Sender name: LeadTrade Authentication
   ```

### 5.3 Update Email Templates

For each template, update the sender:

**Confirm your signup:**
```
From: no-reply@auth.leadtrade.app
Subject: Confirm Your Email - LeadTrade
```

**Reset Password:**
```
From: no-reply@auth.leadtrade.app
Subject: Reset Your Password - LeadTrade
```

**Magic Link:**
```
From: no-reply@auth.leadtrade.app
Subject: Your LeadTrade Sign In Link
```

---

## Part 6: Testing

### 6.1 Test Email Delivery

Use the test endpoint:

```bash
# Test all categories
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

### 6.2 Verify Deliverability

Check:
- [ ] Emails arrive in inbox (not spam)
- [ ] Sender addresses are correct
- [ ] Branding is appropriate (Resend has no branding, Brevo may have footer)
- [ ] Links work correctly
- [ ] Images load properly

### 6.3 Test Supabase Auth

1. Create a test account on your app
2. Verify email confirmation is sent from `no-reply@auth.leadtrade.app`
3. Test password reset flow
4. Check Gmail forwarding is working

---

## Part 7: Environment Variables

### Production (.env)

```bash
# Email Service Configuration
BREVO_API_KEY=xkeysib-your_production_key_here
RESEND_API_KEY=re_your_production_key_here
```

### Development (.env.local)

```bash
# Email Service Configuration (use test keys)
BREVO_API_KEY=xkeysib-your_test_key_here
RESEND_API_KEY=re_your_test_key_here
```

---

## Part 8: Monitoring & Troubleshooting

### 8.1 Brevo Dashboard

Monitor:
- **Statistics** → **Email** - Delivery rates, opens, clicks
- **Logs** → **Email logs** - Individual email status
- **Senders & IP** → **Reputation** - Domain reputation score

### 8.2 Resend Dashboard

Monitor:
- **Emails** - Recent sends and status
- **Analytics** - Delivery metrics
- **Logs** - Detailed delivery logs

### 8.3 Common Issues

**Emails going to spam:**
- Verify SPF, DKIM, DMARC records
- Check domain reputation
- Warm up new domains gradually

**Domain not verified:**
- Wait 24-48 hours for DNS propagation
- Use `dig` to verify DNS records
- Ensure DNS records are not proxied (gray cloud in Cloudflare)

**API errors:**
- Check API key is correct
- Verify API key permissions
- Check rate limits (Brevo: 300/day free, Resend: 100/day free)

---

## Part 9: Rate Limits & Costs

### Brevo Free Tier
- 300 emails/day
- Unlimited contacts
- Branding in emails
- Multiple domains supported

### Resend Free Tier
- 100 emails/day
- 1 domain
- No branding
- 3,000 emails/month

### Upgrade Recommendations

When to upgrade:
- **Brevo**: When sending >300 emails/day or want to remove branding
- **Resend**: When sending >100 trading notifications/day

---

## Quick Reference

### Email Categories

```typescript
import { sendAuthEmail, sendTradingEmail, sendSupportEmail } from '@/lib/email';

// Auth email
await sendAuthEmail({
  to: 'user@example.com',
  subject: 'Welcome to LeadTrade',
  html: '<p>Welcome!</p>',
  text: 'Welcome!',
});

// Trading email
await sendTradingEmail({
  to: 'user@example.com',
  subject: 'Trade Confirmation',
  html: '<p>Your trade was executed</p>',
  text: 'Your trade was executed',
});

// Support email
await sendSupportEmail({
  to: 'user@example.com',
  subject: 'Support Inquiry Received',
  html: '<p>We received your message</p>',
  text: 'We received your message',
});
```

### Email Templates

```typescript
import {
  getWelcomeEmailTemplate,
  getTradeConfirmationTemplate,
  getSupportInquiryTemplate,
} from '@/lib/email';

const { html, text } = getWelcomeEmailTemplate('John Doe', 'https://verify-url');
```

---

## Support

For issues:
1. Check provider dashboards for delivery status
2. Verify DNS records with `dig` command
3. Test with `/api/email/test` endpoint
4. Check application logs for errors

Need help? Contact support@leadtrade.app
