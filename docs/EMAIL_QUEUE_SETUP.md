# Email Queue Setup Guide

Quick setup guide for the centralized email queue system.

## What It Does

Prevents Resend rate limit errors (2 req/sec) by queueing trading emails and processing them in a controlled manner. Auth, support, and marketing emails are sent immediately via Brevo (1000 req/sec limit).

## Setup Steps

### 1. Apply Database Migration

```bash
cd supabase
supabase db push
```

This creates the `email_queue` table.

### 2. Deploy Edge Function

```bash
supabase functions deploy email-queue
```

### 3. Set Up Cron Job

Choose one option:

#### Option A: GitHub Actions (Easiest)

1. Add repository secrets:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

2. The workflow file `.github/workflows/email-queue-processor.yml` is already configured and will run automatically every minute.

#### Option B: Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to Database > Cron Jobs
3. Click "Create a new cron job"
4. Schedule: `* * * * *` (every minute)
5. SQL:
```sql
SELECT net.http_post(
  url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/email-queue',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
);
```

#### Option C: External Cron Service

Use cron-job.org, EasyCron, or similar:
- URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/email-queue`
- Method: POST
- Headers: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
- Schedule: Every minute

### 4. Test It

```bash
# Queue a test email
curl -X POST http://localhost:54321/functions/v1/execute-copy-trades \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Check queue
psql $DATABASE_URL -c "SELECT * FROM email_queue ORDER BY created_at DESC LIMIT 5;"

# Manually trigger processor
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/email-queue \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## Verification

After setup, verify it's working:

1. **Check queue table exists:**
```sql
SELECT COUNT(*) FROM email_queue;
```

2. **Trigger a copy trade** and check that emails are queued:
```sql
SELECT * FROM email_queue WHERE status = 'pending';
```

3. **Wait 30-60 seconds** and verify emails are sent:
```sql
SELECT * FROM email_queue WHERE status = 'sent' ORDER BY sent_at DESC LIMIT 5;
```

4. **Check logs** in Supabase Dashboard > Edge Functions > email-queue

## Monitoring

### Quick Health Check

```sql
SELECT 
  status,
  COUNT(*) as count,
  MAX(created_at) as newest,
  MIN(created_at) as oldest
FROM email_queue
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;
```

### Failed Emails

```sql
SELECT 
  id,
  to,
  subject,
  error,
  attempts,
  created_at
FROM email_queue
WHERE status = 'failed'
ORDER BY updated_at DESC
LIMIT 10;
```

## Troubleshooting

### Emails stuck in "pending"

**Cause**: Cron job not running

**Fix**: 
1. Check GitHub Actions workflow runs
2. Or manually trigger: `curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/email-queue -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"`

### High failure rate

**Cause**: Resend API issues or invalid email addresses

**Fix**:
1. Check error messages: `SELECT DISTINCT error FROM email_queue WHERE status = 'failed';`
2. Verify Resend API key in edge function secrets
3. Check email addresses are valid

### Queue growing too large

**Cause**: Processing slower than queueing

**Fix**:
1. Increase cron frequency (every 30 seconds instead of 60)
2. Increase batch size in `email-queue/index.ts` (currently 10)

## Configuration

### Adjust Rate Limiting

Edit `supabase/functions/email-queue/index.ts`:

```typescript
const RESEND_RATE_LIMIT = 2 // requests per second
const RESEND_DELAY = 600 // ms between requests
```

### Adjust Batch Size

```typescript
.limit(10) // Process 10 at a time
```

### Adjust Retry Logic

Edit `supabase/migrations/20260203_create_email_queue.sql`:

```sql
max_attempts INTEGER NOT NULL DEFAULT 3,
```

## Need Help?

Check the full documentation: `supabase/functions/email-queue/README.md`
