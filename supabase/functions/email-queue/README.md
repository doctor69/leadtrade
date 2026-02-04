# Email Queue System

Centralized email queue for handling rate-limited email delivery across the entire LeadTrade application.

## Overview

The email queue system solves the problem of Resend's rate limit (2 requests/second) when multiple concurrent trades trigger email notifications. Instead of sending emails immediately, trading emails are queued and processed in a controlled manner.

## Architecture

```
Trading Event → Queue Email → Database (email_queue table)
                                    ↓
                            Cron Job (every 30s)
                                    ↓
                            Email Queue Processor
                                    ↓
                            Send with Rate Limiting
```

## Components

### 1. Database Table (`email_queue`)
- Stores pending, processing, sent, and failed emails
- Tracks attempts and errors for retry logic
- Auto-cleanup of old emails (7 days)

### 2. Queue Helper (`_shared/email-queue-helper.ts`)
- `queueEmail()` - Add email to queue
- `sendOrQueueEmail()` - Smart routing (queue trading, send others immediately)

### 3. Queue Processor (`email-queue/index.ts`)
- Processes up to 10 emails per run
- Enforces 600ms delay between Resend emails
- Automatic retry with exponential backoff
- Marks failed emails after 3 attempts

### 4. Cron Job
- Runs every 30 seconds (GitHub Actions)
- Calls the queue processor edge function
- Ensures timely delivery while respecting rate limits

## Usage

### Queue an Email (Recommended for Trading)

```typescript
import { queueEmail } from '../_shared/email-queue-helper.ts'

const result = await queueEmail({
  category: 'trading',
  to: 'user@example.com',
  subject: 'Trade Executed',
  html: '<p>Your trade was executed</p>',
  text: 'Your trade was executed'
})

if (result.success) {
  console.log(`Email queued: ${result.queueId}`)
}
```

### Smart Routing (Auto-Queue Trading Emails)

```typescript
import { sendOrQueueEmail } from '../_shared/email-queue-helper.ts'
import { sendEmail } from '../_shared/email-helper.ts'

const result = await sendOrQueueEmail(
  {
    category: 'trading', // Will be queued
    to: 'user@example.com',
    subject: 'Trade Executed',
    html: '<p>Your trade was executed</p>'
  },
  sendEmail
)

if (result.queued) {
  console.log(`Email queued: ${result.queueId}`)
} else {
  console.log(`Email sent immediately: ${result.messageId}`)
}
```

## Rate Limits

| Provider | Category | Rate Limit | Strategy |
|----------|----------|------------|----------|
| Resend | Trading | 2 req/sec | Queued with 600ms delay |
| Brevo | Auth, Support, Marketing | 1000 req/sec | Sent immediately |

## Setup

### 1. Run Migrations

```bash
supabase db push
```

This creates the `email_queue` table and cleanup function.

### 2. Configure Cron Job

#### Option A: GitHub Actions (Recommended)
The `.github/workflows/email-queue-processor.yml` workflow is already configured. Just add these secrets to your GitHub repository:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

#### Option B: Supabase Dashboard
1. Go to Database > Cron Jobs
2. Create new job with schedule: `*/30 * * * *` (every 30 seconds)
3. SQL command:
```sql
SELECT net.http_post(
  url := 'YOUR_SUPABASE_URL/functions/v1/email-queue',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
);
```

#### Option C: External Cron Service
Use a service like cron-job.org or EasyCron to call:
```
POST https://YOUR_PROJECT.supabase.co/functions/v1/email-queue
Authorization: Bearer YOUR_SERVICE_ROLE_KEY
```

### 3. Manual Testing

```bash
# Local development
curl -X POST http://localhost:54321/functions/v1/email-queue \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Production
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/email-queue \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## Monitoring

### Check Queue Status

```sql
-- Pending emails
SELECT COUNT(*) FROM email_queue WHERE status = 'pending';

-- Failed emails
SELECT * FROM email_queue WHERE status = 'failed' ORDER BY updated_at DESC;

-- Recent activity
SELECT 
  status,
  COUNT(*) as count,
  MAX(updated_at) as last_updated
FROM email_queue
GROUP BY status;
```

### View Logs

Check the edge function logs in Supabase Dashboard under Edge Functions > email-queue.

## Troubleshooting

### Emails Not Being Sent

1. Check if cron job is running:
   - GitHub Actions: Check workflow runs
   - Supabase: Check cron job logs

2. Check queue status:
```sql
SELECT * FROM email_queue WHERE status = 'pending' ORDER BY created_at;
```

3. Manually trigger processor:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/email-queue \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### High Failure Rate

Check failed emails for error patterns:
```sql
SELECT error, COUNT(*) 
FROM email_queue 
WHERE status = 'failed' 
GROUP BY error;
```

Common issues:
- Invalid email addresses
- Resend API key issues
- Rate limit exceeded (increase delay)

### Queue Backlog

If queue is growing:
1. Increase cron frequency (e.g., every 15 seconds)
2. Increase batch size in processor (currently 10)
3. Check for failed emails blocking the queue

## Performance

- **Throughput**: ~100 emails/minute (with 600ms delay)
- **Latency**: 0-30 seconds (depending on cron schedule)
- **Retry Logic**: 3 attempts with 1-minute delay
- **Cleanup**: Auto-delete after 7 days

## Future Enhancements

- [ ] Priority queue for urgent emails
- [ ] Batch sending for multiple recipients
- [ ] Email templates with variables
- [ ] Delivery status webhooks
- [ ] Analytics dashboard
