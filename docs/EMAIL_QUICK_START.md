# Email System - Quick Start

## 3-Minute Setup

### 1. Database (30 seconds)

```bash
cd supabase
supabase db push
```

### 2. GitHub Actions (1 minute)

Add these secrets to your GitHub repository (Settings → Secrets):

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

The cron job is already configured in `.github/workflows/email-queue-processor.yml`

### 3. Deploy Functions (30 seconds)

```bash
supabase functions deploy execute-copy-trades
supabase functions deploy email-queue
```

### 4. Test (1 minute)

Trigger a copy trade and check:

```sql
-- Emails should be queued
SELECT * FROM email_queue ORDER BY created_at DESC LIMIT 5;

-- Wait 60 seconds, then check they're sent
SELECT * FROM email_queue WHERE status = 'sent' ORDER BY sent_at DESC LIMIT 5;
```

## ✅ Done!

Your email system is now:
- Rate-limit safe (no more errors)
- Automatically retrying on failures
- Fully monitored

## Optional: Add Resend Templates (10 minutes)

For professional email designs:

1. Go to https://resend.com/emails/templates
2. Create two templates (copy HTML from `docs/RESEND_TEMPLATES.md`)
3. Update template IDs in `supabase/functions/_shared/email-helper.ts`
4. Redeploy: `supabase functions deploy`

## Need Help?

- Full docs: `docs/EMAIL_SYSTEM_COMPLETE.md`
- Template setup: `docs/RESEND_TEMPLATE_SETUP.md`
- Troubleshooting: `docs/EMAIL_QUEUE_SETUP.md`
