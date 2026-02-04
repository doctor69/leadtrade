-- Email Queue Cron Job Setup
-- This migration prepares the database for scheduled email queue processing

-- Note: Supabase Cloud uses pg_cron for scheduled jobs
-- Configure this in your Supabase Dashboard under Database > Cron Jobs
-- Or use the Supabase CLI to deploy this as a scheduled edge function

-- For Supabase Cloud:
-- 1. Go to Database > Cron Jobs in your Supabase Dashboard
-- 2. Create a new cron job with schedule: */30 * * * * (every 30 seconds)
-- 3. SQL command:
--    SELECT net.http_post(
--      url := 'YOUR_SUPABASE_URL/functions/v1/email-queue',
--      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--    );

-- Alternative: Use GitHub Actions or external cron service to call:
-- POST https://YOUR_PROJECT.supabase.co/functions/v1/email-queue
-- Headers: Authorization: Bearer YOUR_SERVICE_ROLE_KEY

-- For local development, you can manually trigger the queue processor:
-- curl -X POST http://localhost:54321/functions/v1/email-queue \
--   -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

COMMENT ON TABLE email_queue IS 'Email queue with automatic processing via cron job every 30 seconds';
