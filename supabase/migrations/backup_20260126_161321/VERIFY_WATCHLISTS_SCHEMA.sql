-- Verification Script for Watchlist Schema
-- This script verifies that the watchlist tables, indexes, and policies are correctly created

-- Verify watchlists table exists with correct columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'watchlists'
ORDER BY ordinal_position;

-- Verify watchlist_assets table exists with correct columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'watchlist_assets'
ORDER BY ordinal_position;

-- Verify indexes on watchlists table
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'watchlists'
ORDER BY indexname;

-- Verify indexes on watchlist_assets table
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'watchlist_assets'
ORDER BY indexname;

-- Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('watchlists', 'watchlist_assets');

-- Verify RLS policies on watchlists
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
  AND tablename = 'watchlists'
ORDER BY policyname;

-- Verify RLS policies on watchlist_assets
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
  AND tablename = 'watchlist_assets'
ORDER BY policyname;

-- Verify foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('watchlists', 'watchlist_assets')
ORDER BY tc.table_name, kcu.column_name;

-- Verify check constraints
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints AS tc
JOIN information_schema.check_constraints AS cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('watchlists', 'watchlist_assets')
ORDER BY tc.table_name, tc.constraint_name;

-- Verify triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('watchlists', 'watchlist_assets')
ORDER BY event_object_table, trigger_name;

-- Test data insertion (will be rolled back)
BEGIN;

-- Insert test watchlist
INSERT INTO watchlists (user_id, name, alpaca_watchlist_id)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Test Watchlist',
  'test-alpaca-id'
);

-- Get the inserted watchlist ID
DO $$
DECLARE
  test_watchlist_id UUID;
BEGIN
  SELECT id INTO test_watchlist_id
  FROM watchlists
  WHERE name = 'Test Watchlist'
  LIMIT 1;

  -- Insert test symbols
  INSERT INTO watchlist_assets (watchlist_id, symbol)
  VALUES 
    (test_watchlist_id, 'AAPL'),
    (test_watchlist_id, 'GOOGL'),
    (test_watchlist_id, 'MSFT');

  RAISE NOTICE 'Test data inserted successfully';
END $$;

-- Verify test data
SELECT 
  w.name,
  w.alpaca_watchlist_id,
  wa.symbol,
  wa.added_at
FROM watchlists w
LEFT JOIN watchlist_assets wa ON w.id = wa.watchlist_id
WHERE w.name = 'Test Watchlist'
ORDER BY wa.symbol;

ROLLBACK;

-- Summary
SELECT 
  'Watchlist Schema Verification Complete' AS status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'watchlists') AS watchlists_table_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'watchlist_assets') AS watchlist_assets_table_exists,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'watchlists') AS watchlists_indexes,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'watchlist_assets') AS watchlist_assets_indexes,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'watchlists') AS watchlists_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'watchlist_assets') AS watchlist_assets_policies;
