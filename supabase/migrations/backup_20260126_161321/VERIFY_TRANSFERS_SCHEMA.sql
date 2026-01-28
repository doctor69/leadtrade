-- Verification Script for Transfers Schema
-- This script verifies that the transfers table and all related objects are properly created
-- Run this after applying migration 20250109_transfers.sql

-- Verify table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'transfers'
) AS transfers_table_exists;

-- Verify all columns exist with correct types
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'transfers'
ORDER BY ordinal_position;

-- Verify CHECK constraints
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
AND rel.relname = 'transfers'
AND con.contype = 'c'
ORDER BY con.conname;

-- Verify indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'transfers'
ORDER BY indexname;

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'transfers';

-- Verify RLS policies
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
AND tablename = 'transfers'
ORDER BY policyname;

-- Verify triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'transfers'
ORDER BY trigger_name;

-- Verify foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name = 'transfers';

-- Expected Results Summary:
-- ✓ Table 'transfers' exists
-- ✓ 17 columns with correct types (id, user_id, account_id, alpaca_transfer_id, transfer_type, direction, amount, status, timing, relationship_id, bank_id, additional_information, fee_payment_method, expires_at, created_at, updated_at, completed_at)
-- ✓ CHECK constraints for transfer_type, direction, status, amount, timing, fee_payment_method
-- ✓ 8 indexes (user_id, account_id, alpaca_id, status, direction, type, created_at, composite)
-- ✓ RLS enabled
-- ✓ 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)
-- ✓ 1 trigger (update updated_at)
-- ✓ 2 foreign key constraints (user_id -> auth.users, account_id -> user_profiles)
