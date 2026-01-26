-- Verification script for bank and ACH relationships schema
-- This script verifies that all tables, indexes, and policies are properly created

-- Verify bank_relationships table exists
SELECT 
  'bank_relationships table' AS check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'bank_relationships'
    ) THEN 'PASS' 
    ELSE 'FAIL' 
  END AS status;

-- Verify ach_relationships table exists
SELECT 
  'ach_relationships table' AS check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'ach_relationships'
    ) THEN 'PASS' 
    ELSE 'FAIL' 
  END AS status;

-- Verify bank_relationships columns
SELECT 
  'bank_relationships columns' AS check_name,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'bank_relationships'
      AND column_name IN (
        'id', 'user_id', 'alpaca_bank_id', 'account_id', 'name', 
        'bank_code', 'bank_code_type', 'account_number_last4', 
        'country', 'state_province', 'postal_code', 'city', 
        'street_address', 'status', 'created_at', 'updated_at'
      )
    ) = 16 THEN 'PASS' 
    ELSE 'FAIL' 
  END AS status;

-- Verify ach_relationships columns
SELECT 
  'ach_relationships columns' AS check_name,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'ach_relationships'
      AND column_name IN (
        'id', 'user_id', 'alpaca_ach_id', 'account_id', 'status',
        'account_owner_name', 'bank_account_type', 'bank_account_number_last4',
        'bank_routing_number', 'nickname', 'processor_token',
        'created_at', 'updated_at'
      )
    ) = 13 THEN 'PASS' 
    ELSE 'FAIL' 
  END AS status;

-- Verify bank_relationships indexes
SELECT 
  'bank_relationships indexes' AS check_name,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'bank_relationships'
      AND indexname IN (
        'idx_bank_relationships_user_id',
        'idx_bank_relationships_account_id',
        'idx_bank_relationships_alpaca_bank_id',
        'idx_bank_relationships_status'
      )
    ) >= 4 THEN 'PASS' 
    ELSE 'FAIL' 
  END AS status;

-- Verify ach_relationships indexes
SELECT 
  'ach_relationships indexes' AS check_name,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'ach_relationships'
      AND indexname IN (
        'idx_ach_relationships_user_id',
        'idx_ach_relationships_account_id',
        'idx_ach_relationships_alpaca_ach_id',
        'idx_ach_relationships_status',
        'idx_ach_relationships_bank_routing_number'
      )
    ) >= 5 THEN 'PASS' 
    ELSE 'FAIL' 
  END AS status;

-- Verify RLS is enabled on bank_relationships
SELECT 
  'bank_relationships RLS enabled' AS check_name,
  CASE 
    WHEN (
      SELECT relrowsecurity FROM pg_class 
      WHERE relname = 'bank_relationships'
    ) THEN 'PASS' 
    ELSE 'FAIL' 
  END AS status;

-- Verify RLS is enabled on ach_relationships
SELECT 
  'ach_relationships RLS enabled' AS check_name,
  CASE 
    WHEN (
      SELECT relrowsecurity FROM pg_class 
      WHERE relname = 'ach_relationships'
    ) THEN 'PASS' 
    ELSE 'FAIL' 
  END AS status;

-- Verify bank_relationships RLS policies
SELECT 
  'bank_relationships RLS policies' AS check_name,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'bank_relationships'
    ) >= 4 THEN 'PASS' 
    ELSE 'FAIL' 
  END AS status;

-- Verify ach_relationships RLS policies
SELECT 
  'ach_relationships RLS policies' AS check_name,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'ach_relationships'
    ) >= 4 THEN 'PASS' 
    ELSE 'FAIL' 
  END AS status;

-- Verify bank_relationships trigger exists
SELECT 
  'bank_relationships trigger' AS check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE event_object_schema = 'public' 
      AND event_object_table = 'bank_relationships'
      AND trigger_name = 'bank_relationships_updated_at'
    ) THEN 'PASS' 
    ELSE 'FAIL' 
  END AS status;

-- Verify ach_relationships trigger exists
SELECT 
  'ach_relationships trigger' AS check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE event_object_schema = 'public' 
      AND event_object_table = 'ach_relationships'
      AND trigger_name = 'ach_relationships_updated_at'
    ) THEN 'PASS' 
    ELSE 'FAIL' 
  END AS status;
