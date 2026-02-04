# Email Queue Testing Guide

Quick tests to verify the email queue system is working correctly.

## 1. Test Queue Function Directly

```bash
# Test queueing an email
curl -X POST "https://bfbqlzpbkivyrnjkvqgl.supabase.co/functions/v1/email-queue" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "processed": 0,
  "message": "No emails to process"
}
```

## 2. Check Database

```sql
-- Check if table exists and is empty
SELECT COUNT(*) FROM email_queue;

-- View table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'email_queue';
```

## 3. Queue a Test Email

You can queue a test email by executing a copy trade or by inserting directly:

```sql
-- Insert a test email
INSERT INTO email_queue (category, "to", subject, html, text)
VALUES (
  'trading',
  'test@example.com',
  'Test Email',
  '<p>This is a test email</p>',
  'This is a test email'
);

-- Check it was inserted
SELECT * FROM email_queue WHERE status = 'pending';
```

## 4. Process the Queue

```bash
# Manually trigger the processor
curl -X POST "https://bfbqlzpbkivyrnjkvqgl.supabase.co/functions/v1/email-queue" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

Expected response:
```json
{
  "success": true,
  "processed": 1,
  "failed": 0,
  "total": 1
}
```

## 5. Verify Email Was Sent

```sql
-- Check email status changed to 'sent'
SELECT id, "to", subject, status, sent_at 
FROM email_queue 
WHERE status = 'sent' 
ORDER BY sent_at DESC 
LIMIT 5;
```

## 6. Test with Real Copy Trade

1. Execute a copy trade through the app
2. Check that emails were queued:

```sql
SELECT * FROM email_queue 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

3. Wait 30-60 seconds for cron to run
4. Verify emails were sent:

```sql
SELECT status, COUNT(*) 
FROM email_queue 
WHERE created_at > NOW() - INTERVAL '5 minutes'
GROUP BY status;
```

## 7. Test Rate Limiting

Queue multiple emails and watch them process with delays:

```sql
-- Insert 5 test emails
INSERT INTO email_queue (category, "to", subject, html)
SELECT 
  'trading',
  'test' || generate_series || '@example.com',
  'Test Email ' || generate_series,
  '<p>Test email ' || generate_series || '</p>'
FROM generate_series(1, 5);

-- Check they're pending
SELECT COUNT(*) FROM email_queue WHERE status = 'pending';
```

Then trigger the processor and watch the logs:

```bash
curl -X POST "https://bfbqlzpbkivyrnjkvqgl.supabase.co/functions/v1/email-queue" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -v
```

Check Supabase Dashboard → Edge Functions → email-queue → Logs to see the 600ms delays between sends.

## 8. Test Retry Logic

Insert an email with invalid recipient to test retry:

```sql
-- Insert email that will fail
INSERT INTO email_queue (category, "to", subject, html)
VALUES (
  'trading',
  'invalid-email',
  'Test Retry',
  '<p>This should fail and retry</p>'
);
```

Process and check it retries:

```sql
-- After processing, check attempts
SELECT id, "to", status, attempts, error 
FROM email_queue 
WHERE "to" = 'invalid-email';
```

## 9. Monitor Queue Health

```sql
-- Overall queue status
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM email_queue
GROUP BY status;

-- Failed emails
SELECT "to", subject, error, attempts
FROM email_queue
WHERE status = 'failed'
ORDER BY updated_at DESC;

-- Processing time
SELECT 
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_seconds
FROM email_queue
WHERE status = 'sent'
AND created_at > NOW() - INTERVAL '1 hour';
```

## 10. Test GitHub Actions

1. Go to GitHub → Actions
2. Find "Email Queue Processor" workflow
3. Click "Run workflow"
4. Check logs for success
5. Verify it processes any pending emails

## Expected Behavior

✅ **Working correctly:**
- Emails queue instantly (< 100ms)
- Processor runs every minute via GitHub Actions
- Emails send with 600ms delay between each
- Failed emails retry up to 3 times
- Old emails cleanup after 7 days

❌ **Issues to watch for:**
- Emails stuck in "pending" (cron not running)
- High failure rate (check error messages)
- Queue growing (increase cron frequency)
- Rate limit errors (increase delay)

## Cleanup Test Data

```sql
-- Remove test emails
DELETE FROM email_queue 
WHERE "to" LIKE 'test%@example.com';
```
