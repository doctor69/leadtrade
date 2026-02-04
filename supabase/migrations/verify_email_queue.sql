-- Email Queue Verification Script
-- Run this to verify the email queue system is set up correctly

-- Check if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_queue') THEN
    RAISE NOTICE '✅ email_queue table exists';
  ELSE
    RAISE EXCEPTION '❌ email_queue table does not exist';
  END IF;
END $$;

-- Check indexes
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'email_queue' AND indexname = 'idx_email_queue_status') THEN
    RAISE NOTICE '✅ Status index exists';
  ELSE
    RAISE WARNING '⚠️ Status index missing';
  END IF;
  
  IF EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'email_queue' AND indexname = 'idx_email_queue_category') THEN
    RAISE NOTICE '✅ Category index exists';
  ELSE
    RAISE WARNING '⚠️ Category index missing';
  END IF;
  
  IF EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'email_queue' AND indexname = 'idx_email_queue_scheduled') THEN
    RAISE NOTICE '✅ Scheduled index exists';
  ELSE
    RAISE WARNING '⚠️ Scheduled index missing';
  END IF;
END $$;

-- Check RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'email_queue' 
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS is enabled';
  ELSE
    RAISE WARNING '⚠️ RLS is not enabled';
  END IF;
END $$;

-- Check cleanup function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'cleanup_old_emails'
  ) THEN
    RAISE NOTICE '✅ Cleanup function exists';
  ELSE
    RAISE WARNING '⚠️ Cleanup function missing';
  END IF;
END $$;

-- Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'email_queue'
ORDER BY ordinal_position;

-- Show current queue status
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM email_queue
GROUP BY status
ORDER BY status;

-- Show recent emails
SELECT 
  id,
  category,
  "to",
  subject,
  status,
  attempts,
  created_at,
  scheduled_for,
  sent_at
FROM email_queue
ORDER BY created_at DESC
LIMIT 10;
