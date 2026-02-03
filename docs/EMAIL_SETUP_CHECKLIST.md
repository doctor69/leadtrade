# Email Setup Checklist

Quick checklist for setting up LeadTrade email delivery.

## Prerequisites
- [ ] Cloudflare account with leadtrade.app domain
- [ ] Access to DNS settings
- [ ] Personal Gmail for receiving forwarded emails

---

## Step 1: Brevo Setup (15 minutes)

- [ ] Create Brevo account at https://www.brevo.com/
- [ ] Get API key from Settings → SMTP & API
- [ ] Add to `.env`: `BREVO_API_KEY=xkeysib-...`
- [ ] Add domains:
  - [ ] auth.leadtrade.app
  - [ ] leadtrade.app
  - [ ] marketing.leadtrade.app
- [ ] Note down DNS records for each domain (TXT, DKIM, MX)
- [ ] Add sender addresses:
  - [ ] no-reply@auth.leadtrade.app
  - [ ] support@leadtrade.app
  - [ ] hello@leadtrade.app
  - [ ] hello@marketing.leadtrade.app

---

## Step 2: Resend Setup (10 minutes)

- [ ] Create Resend account at https://resend.com/
- [ ] Get API key from API Keys section
- [ ] Add to `.env`: `RESEND_API_KEY=re_...`
- [ ] Add domain: trade.leadtrade.app
- [ ] Note down DNS records (TXT, DKIM, MX)

---

## Step 3: Cloudflare DNS (20 minutes)

### Brevo DNS Records

For **auth.leadtrade.app**:
- [ ] Add TXT record (verification)
- [ ] Add TXT record (DKIM)
- [ ] Add MX record
- [ ] Set all to "DNS only" (gray cloud)

For **leadtrade.app**:
- [ ] Add TXT record (verification)
- [ ] Add TXT record (DKIM)
- [ ] Add MX record
- [ ] Add SPF record: `v=spf1 include:spf.brevo.com include:resend.com ~all`
- [ ] Set all to "DNS only"

For **marketing.leadtrade.app**:
- [ ] Add TXT record (verification)
- [ ] Add TXT record (DKIM)
- [ ] Add MX record
- [ ] Set all to "DNS only"

### Resend DNS Records

For **trade.leadtrade.app**:
- [ ] Add TXT record (verification)
- [ ] Add TXT record (DKIM)
- [ ] Add MX record
- [ ] Set all to "DNS only"

---

## Step 4: Gmail Forwarding (10 minutes)

- [ ] Go to Cloudflare → Email → Email Routing
- [ ] Enable Email Routing
- [ ] Add destination: your.email@gmail.com
- [ ] Verify email in Gmail
- [ ] Create routing rules:
  - [ ] support@leadtrade.app → your.email@gmail.com
  - [ ] hello@leadtrade.app → your.email@gmail.com
- [ ] (Optional) Enable catch-all forwarding

---

## Step 5: Supabase Configuration (15 minutes)

- [ ] Log in to Supabase Dashboard
- [ ] Go to Project Settings → Auth
- [ ] Enable Custom SMTP
- [ ] Configure SMTP settings:
  ```
  Host: smtp-relay.brevo.com
  Port: 587
  Username: [from Brevo dashboard]
  Password: [from Brevo dashboard]
  Sender: no-reply@auth.leadtrade.app
  ```
- [ ] Go to Authentication → Email Templates
- [ ] Update each template sender to: no-reply@auth.leadtrade.app

---

## Step 6: Testing (10 minutes)

- [ ] Wait 10-15 minutes for DNS propagation
- [ ] Verify DNS records:
  ```bash
  dig TXT auth.leadtrade.app
  dig TXT trade.leadtrade.app
  dig MX leadtrade.app
  ```
- [ ] Test email delivery:
  ```bash
  curl -X POST http://localhost:4321/api/email/test \
    -H "Content-Type: application/json" \
    -d '{"category": "all", "to": "your.email@gmail.com"}'
  ```
- [ ] Check Gmail for test emails
- [ ] Verify emails not in spam
- [ ] Test Supabase auth (signup/password reset)
- [ ] Test Gmail forwarding

---

## Step 7: Verification

- [ ] All domains verified in Brevo
- [ ] Domain verified in Resend
- [ ] DNS records propagated (check with dig)
- [ ] Test emails delivered successfully
- [ ] Emails arrive in inbox (not spam)
- [ ] Correct sender addresses displayed
- [ ] Gmail forwarding working
- [ ] Supabase auth emails working

---

## Troubleshooting

**DNS not propagating:**
- Wait 24-48 hours
- Ensure records are "DNS only" (not proxied)
- Use `dig` to verify

**Emails in spam:**
- Check SPF/DKIM/DMARC records
- Warm up domains gradually
- Check domain reputation in provider dashboards

**API errors:**
- Verify API keys are correct
- Check rate limits (Brevo: 300/day, Resend: 100/day)
- Check provider status pages

---

## Quick Commands

### Verify DNS Records
```bash
# Check TXT records
dig TXT auth.leadtrade.app
dig TXT trade.leadtrade.app
dig TXT leadtrade.app

# Check MX records
dig MX leadtrade.app
dig MX auth.leadtrade.app
dig MX trade.leadtrade.app

# Check DKIM
dig TXT mail._domainkey.auth.leadtrade.app
dig TXT resend._domainkey.trade.leadtrade.app
```

### Test Emails
```bash
# Test all categories
npm run dev
curl -X POST http://localhost:4321/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"category": "all", "to": "your.email@gmail.com"}'

# Test specific category
curl -X POST http://localhost:4321/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"category": "trading", "to": "your.email@gmail.com"}'
```

---

## Estimated Total Time: 80 minutes

- Brevo setup: 15 min
- Resend setup: 10 min
- DNS configuration: 20 min
- Gmail forwarding: 10 min
- Supabase config: 15 min
- Testing: 10 min

---

## Next Steps

After setup is complete:
1. Update production environment variables
2. Deploy to production
3. Monitor email delivery in provider dashboards
4. Set up alerts for delivery failures
5. Consider upgrading plans when approaching rate limits

---

## Support Contacts

- **Brevo Support**: https://help.brevo.com/
- **Resend Support**: https://resend.com/support
- **Cloudflare Support**: https://support.cloudflare.com/

For LeadTrade-specific issues, check the full guide: `docs/EMAIL_SETUP_GUIDE.md`
