# DNS Fixes Required

## Current Issues

Based on your DNS export, here are the issues preventing emails from working:

### ❌ Issue 1: Incorrect SPF Record

**Current:**
```
leadtrade.app: "v=spf1 include:_spf.mx.cloudflare.net ~all"
```

**Should be:**
```
leadtrade.app: "v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com include:amazonses.com ~all"
```

This allows both Brevo and Resend (via Amazon SES) to send emails on your behalf.

### ❌ Issue 2: Wrong Resend Domain

You configured `send.trade.leadtrade.app` in Resend, but the code uses `trade.leadtrade.app`.

**Current DNS:**
- `resend._domainkey.trade.leadtrade.app` - DKIM configured
- `send.trade.leadtrade.app` - MX and SPF configured

**Problem:** Mismatch between DNS and code configuration.

---

## 🔧 Fix Options

### Option A: Update Resend Domain (Recommended)

1. **In Resend Dashboard:**
   - Go to Domains
   - Remove `send.trade.leadtrade.app`
   - Add `trade.leadtrade.app`
   - Copy the new DNS records

2. **In Cloudflare DNS:**
   - Remove these records:
     ```
     send.trade.leadtrade.app MX 10 feedback-smtp.us-east-1.amazonses.com
     send.trade.leadtrade.app TXT "v=spf1 include:amazonses.com ~all"
     ```
   
   - Add new records (from Resend dashboard):
     ```
     Type: TXT
     Name: trade.leadtrade.app
     Content: [verification code from Resend]
     Proxy: DNS only
     
     Type: MX
     Name: trade.leadtrade.app
     Content: [MX record from Resend]
     Priority: 10
     Proxy: DNS only
     ```

3. **Update SPF Record:**
   ```
   Type: TXT
   Name: leadtrade.app
   Content: v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com include:amazonses.com ~all
   Proxy: DNS only
   ```

### Option B: Update Code to Match DNS (Alternative)

If you want to keep `send.trade.leadtrade.app`:

1. **Update email configuration:**
   ```typescript
   // In src/lib/email/types.ts
   trading: {
     category: 'trading',
     provider: 'resend',
     fromEmail: 'notifications@send.trade.leadtrade.app', // Changed
     fromName: 'LeadTrade Trading',
   },
   ```

2. **Still update SPF:**
   ```
   Type: TXT
   Name: leadtrade.app
   Content: v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com include:amazonses.com ~all
   ```

---

## ✅ Step-by-Step Fix (Option A - Recommended)

### Step 1: Update Resend Domain

1. Log in to [Resend Dashboard](https://resend.com/domains)
2. Click on `send.trade.leadtrade.app`
3. Click "Delete Domain"
4. Click "Add Domain"
5. Enter: `trade.leadtrade.app`
6. Copy the verification TXT record

### Step 2: Update Cloudflare DNS

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select `leadtrade.app` domain
3. Go to DNS → Records

**Delete these records:**
```
send.trade.leadtrade.app MX 10 feedback-smtp.us-east-1.amazonses.com
send.trade.leadtrade.app TXT "v=spf1 include:amazonses.com ~all"
```

**Update SPF record:**
- Find: `leadtrade.app TXT "v=spf1 include:_spf.mx.cloudflare.net ~all"`
- Change to: `v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com include:amazonses.com ~all`

**Add new records from Resend:**
```
Type: TXT
Name: trade.leadtrade.app
Content: [paste verification code from Resend]
Proxy: DNS only (gray cloud)

Type: MX  
Name: trade.leadtrade.app
Content: [paste MX record from Resend]
Priority: 10
Proxy: DNS only (gray cloud)
```

### Step 3: Verify in Resend

1. Go back to Resend dashboard
2. Click "Verify" on `trade.leadtrade.app`
3. Wait for verification (can take a few minutes)

### Step 4: Test Emails

```bash
curl -X POST http://localhost:4321/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"category": "trading", "to": "your.email@gmail.com"}'
```

---

## 🔍 Verify DNS Changes

After making changes, verify with these commands:

```bash
# Check SPF record
dig TXT leadtrade.app +short | grep spf

# Check Resend DKIM
dig TXT resend._domainkey.trade.leadtrade.app +short

# Check Resend verification
dig TXT trade.leadtrade.app +short

# Check MX records
dig MX trade.leadtrade.app +short
```

Expected results:
```
# SPF should include all three:
"v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com include:amazonses.com ~all"

# DKIM should show Resend key:
"p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC2A0p7q47LB6ThGN/EHlHpniJc9gMvAtCLBeFp6sAiyqI6ipfzbUVLl50BmrYtUNpshrR8UA2OERphXxTX1IHNkWrUiTUGKCRBwEmyJNYuo0YLF9rA7uDRx0Vkh8NR2/YmI0h7TnKjNX/uDkkW237YWMe5UvDlAPPaIWCyNmNeswIDAQAB"

# Verification TXT should show Resend code
"resend-verification=..."

# MX should point to Resend
10 feedback-smtp.us-east-1.amazonses.com.
```

---

## 📊 Current DNS Status

### ✅ Working:
- Brevo DKIM for auth.leadtrade.app
- Brevo DKIM for leadtrade.app
- Brevo DKIM for marketing.leadtrade.app
- Brevo verification codes
- Cloudflare Email Routing
- DMARC policy

### ❌ Needs Fixing:
- SPF record (missing Brevo and Resend)
- Resend domain mismatch (send.trade vs trade)
- Missing verification for trade.leadtrade.app

---

## ⏱️ Timeline

- DNS changes: 5-10 minutes
- DNS propagation: 5-30 minutes
- Total time: ~30 minutes

---

## 🆘 If You Need Help

1. **Can't delete Resend domain?**
   - Just add `trade.leadtrade.app` as a new domain
   - Keep both for now, remove old one later

2. **DNS not propagating?**
   - Wait 30 minutes
   - Clear DNS cache: `sudo dscacheutil -flushcache` (Mac)
   - Check with: `dig @8.8.8.8 TXT leadtrade.app`

3. **Still not working?**
   - Check Resend dashboard for domain status
   - Check Brevo dashboard for domain status
   - Run test endpoint with detailed logging

---

## 🎯 Quick Fix Summary

1. Update SPF: Add `include:spf.brevo.com include:amazonses.com`
2. Fix Resend: Use `trade.leadtrade.app` instead of `send.trade.leadtrade.app`
3. Wait 30 minutes for DNS propagation
4. Test emails

After these fixes, emails should work!
