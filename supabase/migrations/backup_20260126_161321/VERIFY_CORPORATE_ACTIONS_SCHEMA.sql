-- Verification Script: Corporate Actions Schema
-- Purpose: Verify the corporate_actions table structure and policies

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'corporate_actions'
) AS table_exists;

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'corporate_actions'
ORDER BY ordinal_position;

-- Check constraints
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'corporate_actions';

-- Check indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'corporate_actions'
ORDER BY indexname;

-- Check RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'corporate_actions';

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'corporate_actions'
ORDER BY policyname;

-- Check triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'corporate_actions';

-- Test data insertion (as service role)
-- Note: This should be run with service role credentials
-- INSERT INTO corporate_actions (
--   alpaca_ca_id,
--   corporate_action_id,
--   ca_type,
--   ca_sub_type,
--   initiating_symbol,
--   initiating_original_cusip,
--   ex_date,
--   record_date,
--   payable_date,
--   cash
-- ) VALUES (
--   'test_ca_001',
--   'CA123456',
--   'dividend',
--   'cash_dividend',
--   'AAPL',
--   '037833100',
--   '2025-01-15',
--   '2025-01-16',
--   '2025-01-30',
--   0.25
-- );

-- Verify the test data
-- SELECT * FROM corporate_actions WHERE alpaca_ca_id = 'test_ca_001';

-- Clean up test data
-- DELETE FROM corporate_actions WHERE alpaca_ca_id = 'test_ca_001';

-- Summary
SELECT 
  'Corporate Actions Schema Verification Complete' AS status,
  COUNT(*) AS total_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'corporate_actions';
