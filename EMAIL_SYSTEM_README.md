# 📧 LeadTrade Email System

Complete email delivery infrastructure with automatic routing, monitoring, and retry capabilities.

## 🎯 Quick Overview

The email system routes messages to **Brevo** and **Resend** based on category:

| Category | Provider | From Address | Purpose |
|----------|----------|--------------|---------|
| **Auth** | Brevo | no-reply@auth.leadtrade.app | Password resets, verification |
| **Trading** | Resend | notifications@trade.leadtrade.app | Trade confirmations |
| **Support** | Brevo | support@leadtrade.app | Support inquiries |
| **Marketing** | Brevo | hello@marketing.leadtrade.app | Marketing (future) |

**Why two providers?**
- Resend: No branding (perfect for customer-facing trading emails)
- Brevo: Multiple domains support (cost-effective for auth/support)

---

## 🚀 Quick Start

### 1. Install Dependencies (Already Done)

All email code is TypeScript-based, no additional packages needed.

### 2. Get API Keys

```bash
# Brevo: https://www.brevo.com/
# Get API key from Settings → SMTP & API
BREVO_API_KEY=xkeysib-your_key_here

# Resend: https://resend.com/
# Get API key from API Keys section
RESEND_API_KEY=re_your_key_here
```

Add to `.env` file.

### 3. Configure Domains

Follow the setup guide to configure DNS and verify domains:
- See `docs/EMAIL_SETUP_GUIDE.md` for complete instructions
- See `docs/EMAIL_SETUP_CHECKLIST.md` for quick checklist

### 4. Test Email Delivery

```bash
npm run dev

curl -X POST http://localhost:4321/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"category": "all", "to": "your.email@gmail.com"}'
```

---

## 📚 Documentation

### Setup & Configuration
- **[EMAIL_SETUP_GUIDE.md](docs/EMAIL_SETUP_GUIDE.md)** - Complete setup instructions (DNS, providers, Gmail)
- **[EMAIL_SETUP_CHECKLIST.md](docs/EMAIL_SETUP_CHECKLIST.md)** - Quick setup checklist (~50 minutes)
- **[QUICK_START_EMAIL.md](QUICK_START_EMAIL.md)** - Ultra-quick reference card

### Implementation
- **[EMAIL_IMPLEMENTATION_SUMMARY.md](EMAIL_IMPLEMENTATION_SUMMARY.md)** - What was built and how to use it
- **[EMAIL_INTEGRATION_EXAMPLES.md](docs/EMAIL_INTEGRATION_EXAMPLES.md)** - Real-world integration examples
- **[src/lib/email/README.md](src/lib/email/README.md)** - API documentation and usage

### Architecture
- **[EMAIL_ARCHITECTURE_DIAGRAM.md](docs/EMAIL_ARCHITECTURE_DIAGRAM.md)** - Visual system architecture

---

## 💻 Usage Examples

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

More examples in `src/lib/email/examples.ts` and `docs/EMAIL_INTEGRATION_EXAMPLES.md`.

---

## 🏗️ Project Structure

```
src/lib/email/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript definitions & routing config
├── service.ts                  # Core routing logic
├── providers/
│   ├── brevo.ts               # Brevo API integration
│   └── resend.ts              # Resend API integration
├── templates/
│   ├── auth.ts                # Welcome, password reset, verification
│   ├── trading.ts             # Trade confirmations, copy trades
│   └── support.ts             # Support inquiries, responses
├── utils.ts                   # Helper functions (retry, batch, validation)
├── queue.ts                   # Email queue for failed sends
├── monitoring.ts              # Analytics and metrics tracking
├── examples.ts                # Integration examples
└── README.md                  # API documentation

src/pages/api/email/
├── send.ts                    # Generic email send endpoint
├── test.ts                    # Test email delivery
└── metrics.ts                 # Email metrics endpoint

supabase/functions/
├── _shared/cors.ts            # CORS headers
└── send-email/index.ts        # Edge function for email delivery

docs/
├── EMAIL_SETUP_GUIDE.md       # Complete setup guide
├── EMAIL_SETUP_CHECKLIST.md   # Quick checklist
├── EMAIL_INTEGRATION_EXAMPLES.md  # Integration examples
└── EMAIL_ARCHITECTURE_DIAGRAM.md  # System architecture
```

---

## 🔧 API Reference

### Send Functions

```typescript
// Generic send (auto-routes to provider)
await sendEmail(category, payload);

// Category-specific sends
await sendAuthEmail(payload);
await sendTradingEmail(payload);
await sendSupportEmail(payload);
await sendMarketingEmail(payload);
```

### Templates

```typescript
// Auth templates
getWelcomeEmailTemplate(name, verificationUrl?)
getPasswordResetTemplate(name, resetUrl)
getEmailVerificationTemplate(name, verificationUrl)

// Trading templates
getTradeConfirmationTemplate(name, tradeDetails)
getCopyTradeNotificationTemplate(followerName, leaderName, tradeDetails)

// Support templates
getSupportInquiryTemplate(inquiry)
getSupportResponseTemplate(name, originalMessage, response)
```

### Utilities

```typescript
// Retry with exponential backoff
await sendEmailWithRetry(sendFn, maxRetries, baseDelay);

// Batch send with rate limiting
await batchSendEmails(emailFunctions, batchSize, delay);

// Validation
isValidEmail(email);
sanitizeEmailContent(html);
```

### Monitoring

```typescript
import { emailMonitor } from '@/lib/email';

// Get metrics
const metrics = emailMonitor.getMetrics();
const categoryMetrics = emailMonitor.getCategoryMetrics('trading');
const providerMetrics = emailMonitor.getProviderMetrics('resend');

// Check health
const healthy = emailMonitor.isHealthy(90); // 90% threshold

// Generate report
console.log(emailMonitor.generateReport());
```

---

## 🧪 Testing

### Test All Email Categories

```bash
curl -X POST http://localhost:4321/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"category": "all", "to": "your.email@gmail.com"}'
```

### Test Specific Category

```bash
curl -X POST http://localhost:4321/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"category": "trading", "to": "your.email@gmail.com"}'
```

### Check Metrics

```bash
curl http://localhost:4321/api/email/metrics
```

---

## 🔐 Security

- ✅ API keys stored in environment variables
- ✅ Zod validation for all inputs
- ✅ HTML content sanitization
- ✅ SPF, DKIM, DMARC configured
- ✅ Rate limiting with queue system
- ✅ Comprehensive error handling

---

## 📊 Monitoring

### Built-in Metrics

- Total emails sent/failed
- Success rate by category
- Success rate by provider
- Recent errors log
- Health status

### Access Metrics

```bash
# Via API
curl http://localhost:4321/api/email/metrics

# Via code
import { emailMonitor } from '@/lib/email';
console.log(emailMonitor.generateReport());
```

---

## 🚨 Troubleshooting

### Emails Not Sending

1. Check API keys in `.env`
2. Verify domains in provider dashboards
3. Check rate limits (Brevo: 300/day, Resend: 100/day)
4. Review provider status pages

### Emails in Spam

1. Verify SPF/DKIM/DMARC records
2. Check domain reputation in dashboards
3. Warm up domains gradually
4. Avoid spam trigger words

### DNS Not Propagating

1. Wait 24-48 hours
2. Ensure records are "DNS only" (not proxied in Cloudflare)
3. Use `dig` to verify:
   ```bash
   dig TXT auth.leadtrade.app
   dig MX leadtrade.app
   ```

---

## 📈 Rate Limits

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

### Handling Rate Limits

The system includes:
- Automatic retry with exponential backoff
- Email queue for failed sends
- Batch sending with delays
- Monitoring and alerts

---

## 🔄 Integration Checklist

- [ ] Add API keys to `.env`
- [ ] Configure domains in Brevo/Resend
- [ ] Set up DNS records in Cloudflare
- [ ] Configure Gmail forwarding
- [ ] Set up Supabase custom SMTP
- [ ] Test email delivery
- [ ] Integrate into signup flow
- [ ] Add trade notifications
- [ ] Add copy trade notifications
- [ ] Create support form
- [ ] Set up monitoring
- [ ] Deploy to production

---

## 📞 Support

### Documentation
- Complete guide: `docs/EMAIL_SETUP_GUIDE.md`
- Quick start: `QUICK_START_EMAIL.md`
- API docs: `src/lib/email/README.md`
- Examples: `docs/EMAIL_INTEGRATION_EXAMPLES.md`

### Provider Support
- Brevo: https://help.brevo.com/
- Resend: https://resend.com/support
- Cloudflare: https://support.cloudflare.com/

### LeadTrade Support
- Email: support@leadtrade.app
- Check metrics: `/api/email/metrics`
- Review logs in provider dashboards

---

## 🎉 What's Included

✅ **Complete Email Infrastructure**
- Automatic routing to Brevo/Resend
- Professional HTML templates
- Plain text fallbacks
- Error handling and retries

✅ **Monitoring & Analytics**
- Real-time metrics tracking
- Success rate monitoring
- Error logging
- Health checks

✅ **Developer Experience**
- TypeScript with strict types
- Comprehensive documentation
- Integration examples
- Test endpoints

✅ **Production Ready**
- Queue system for failed emails
- Rate limit handling
- Security best practices
- Scalable architecture

---

## 🚀 Next Steps

1. **Complete Setup** (50 minutes)
   - Follow `docs/EMAIL_SETUP_CHECKLIST.md`

2. **Test Thoroughly**
   - Use `/api/email/test` endpoint
   - Verify all email categories

3. **Integrate**
   - Add to signup flow
   - Add to trading notifications
   - Add to support system

4. **Monitor**
   - Check `/api/email/metrics` regularly
   - Review provider dashboards
   - Set up alerts for failures

5. **Scale**
   - Upgrade providers when needed
   - Optimize templates
   - Add more email types

---

**Built for LeadTrade** | Last Updated: February 2026
