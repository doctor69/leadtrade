-- Verification script for options_positions table schema
-- Run this to verify the table was created correctly

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'options_positions'
) AS table_exists;

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'options_positions'
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
  AND rel.relname = 'options_positions'
ORDER BY con.conname;

-- Check indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'options_positions'
ORDER BY indexname;

-- Check RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'options_positions';

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
  AND tablename = 'options_positions'
ORDER BY policyname;

-- Check triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'options_positions'
ORDER BY trigger_name;

-- Test data insertion (will be rolled back)
BEGIN;

-- Insert a test options position
INSERT INTO options_positions (
  account_id,
  contract_id,
  symbol,
  underlying_symbol,
  option_type,
  strike_price,
  expiration_date,
  quantity,
  side,
  avg_entry_price,
  current_price,
  market_value,
  cost_basis,
  unrealized_pl,
  unrealized_pl_percent,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Test UUID
  'test_contract_123',
  'AAPL250117C00150000',
  'AAPL',
  'call',
  150.00,
  '2025-01-17',
  10.0,
  'long',
  5.50,
  6.25,
  6250.00,
  5500.00,
  750.00,
  13.64,
  'open'
);

-- Verify the insert
SELECT 
  contract_id,
  symbol,
  underlying_symbol,
  option_type,
  strike_price,
  expiration_date,
  quantity,
  side,
  status
FROM options_positions
WHERE contract_id = 'test_contract_123';

-- Rollback the test
ROLLBACK;

-- Summary
SELECT 
  'options_positions table verification complete' AS status,
  COUNT(*) AS total_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'options_positions';
