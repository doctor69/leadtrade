# Email System - Quick Start Guide

## 1. Get API Keys (5 minutes)

### Brevo
1. Sign up: https://www.brevo.com/
2. Settings → SMTP & API → Create API key
3. Add to `.env`: `BREVO_API_KEY=xkeysib-...`

### Resend
1. Sign up: https://resend.com/
2. API Keys → Create API Key
3. Add to `.env`: `RESEND_API_KEY=re_...`

---

## 2. Add Domains (10 minutes)

### Brevo Dashboard
Add domains:
- `auth.leadtrade.app`
- `leadtrade.app`
- `marketing.leadtrade.app`

### Resend Dashboard
Add domain:
- `trade.leadtrade.app`

**Note DNS records for each domain**

---

## 3. Configure DNS in Cloudflare (15 minutes)

For each domain, add records from provider dashboards:
- TXT (verification)
- TXT (DKIM)
- MX (mail exchange)

**Important**: Set all to "DNS only" (gray cloud)

Add SPF to main domain:
```
Type: TXT
Name: leadtrade.app
Content: v=spf1 include:spf.brevo.com include:resend.com ~all
```

---

## 4. Setup Gmail Forwarding (5 minutes)

Cloudflare → Email → Email Routing:
1. Enable Email Routing
2. Add destination: `your.email@gmail.com`
3. Verify in Gmail
4. Create rules:
   - `support@leadtrade.app` → your Gmail
   - `hello@leadtrade.app` → your Gmail

---

## 5. Configure Supabase (10 minutes)

Supabase Dashboard → Project Settings → Auth:
```
Enable Custom SMTP
Host: smtp-relay.brevo.com
Port: 587
Username: [from Brevo]
Password: [from Brevo]
Sender: no-reply@auth.leadtrade.app
```

Update email templates sender to: `no-reply@auth.leadtrade.app`

---

## 6. Test (5 minutes)

```bash
npm run dev

curl -X POST http://localhost:4321/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"category": "all", "to": "your.email@gmail.com"}'
```

Check Gmail for 3 test emails.

---

## Usage

```typescript
import { sendAuthEmail, sendTradingEmail, sendSupportEmail } from '@/lib/email';
import { getWelcomeEmailTemplate, getTradeConfirmationTemplate } from '@/lib/email';

// Welcome email
const { html, text } = getWelcomeEmailTemplate('John Doe', 'https://verify-url');
await sendAuthEmail({ to: 'user@example.com', subject: 'Welcome', html, text });

// Trade confirmation
const { html, text } = getTradeConfirmationTemplate('John Doe', {
  symbol: 'AAPL', side: 'buy', quantity: 10, price: 150.25,
  total: 1502.50, timestamp: new Date().toISOString(), orderId: 'ORDER-123'
});
await sendTradingEmail({ to: 'user@example.com', subject: 'Trade Confirmation', html, text });
```

---

## Email Routing

| Category | Provider | From | Use |
|----------|----------|------|-----|
| auth | Brevo | no-reply@auth.leadtrade.app | Password resets, verification |
| trading | Resend | notifications@trade.leadtrade.app | Trade confirmations |
| support | Brevo | support@leadtrade.app | Support inquiries |
| marketing | Brevo | hello@marketing.leadtrade.app | Marketing (future) |

---

## Verify DNS

```bash
dig TXT auth.leadtrade.app
dig TXT trade.leadtrade.app
dig MX leadtrade.app
```

---

## Rate Limits

- **Brevo**: 300 emails/day (free)
- **Resend**: 100 emails/day (free)

---

## Full Documentation

- Complete guide: `docs/EMAIL_SETUP_GUIDE.md`
- Checklist: `docs/EMAIL_SETUP_CHECKLIST.md`
- Usage: `src/lib/email/README.md`
- Summary: `EMAIL_IMPLEMENTATION_SUMMARY.md`

---

**Total Setup Time: ~50 minutes**
