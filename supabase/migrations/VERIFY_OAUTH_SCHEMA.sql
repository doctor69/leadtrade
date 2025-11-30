-- Verification Script for OAuth Management Schema
-- Run this after applying the migration to verify everything is set up correctly

-- ============================================================================
-- 1. Verify Tables Exist
-- ============================================================================

SELECT 
  'oauth_authorizations' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'oauth_authorizations'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status;

SELECT 
  'oauth_access_tokens' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'oauth_access_tokens'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status;

-- ============================================================================
-- 2. Verify Columns
-- ============================================================================

-- oauth_authorizations columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'oauth_authorizations'
ORDER BY ordinal_position;

-- oauth_access_tokens columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'oauth_access_tokens'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. Verify Indexes
-- ============================================================================

SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('oauth_authorizations', 'oauth_access_tokens')
ORDER BY tablename, indexname;

-- ============================================================================
-- 4. Verify RLS is Enabled
-- ============================================================================

SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✓ ENABLED'
    ELSE '✗ DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('oauth_authorizations', 'oauth_access_tokens');

-- ============================================================================
-- 5. Verify RLS Policies
-- ============================================================================

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
  AND tablename IN ('oauth_authorizations', 'oauth_access_tokens')
ORDER BY tablename, policyname;

-- ============================================================================
-- 6. Verify Functions
-- ============================================================================

SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'cleanup_expired_oauth%'
ORDER BY routine_name;

-- ============================================================================
-- 7. Verify Foreign Key Constraints
-- ============================================================================

SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
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
  AND tc.table_name IN ('oauth_authorizations', 'oauth_access_tokens');

-- ============================================================================
-- 8. Test Insert (will be rolled back)
-- ============================================================================

BEGIN;

-- Test oauth_authorizations insert
INSERT INTO oauth_authorizations (
  user_id,
  client_id,
  code,
  scope,
  redirect_uri,
  expires_at,
  used
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Test UUID
  'test_client_id',
  'test_auth_code_' || gen_random_uuid()::text,
  'account:read trading:read',
  'https://example.com/callback',
  NOW() + INTERVAL '10 minutes',
  FALSE
);

SELECT 'oauth_authorizations insert: ✓ SUCCESS' as test_result;

-- Test oauth_access_tokens insert
INSERT INTO oauth_access_tokens (
  user_id,
  client_id,
  access_token,
  refresh_token,
  scope,
  expires_at,
  revoked
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Test UUID
  'test_client_id',
  'test_access_token_' || gen_random_uuid()::text,
  'test_refresh_token_' || gen_random_uuid()::text,
  'account:read trading:read',
  NOW() + INTERVAL '1 hour',
  FALSE
);

SELECT 'oauth_access_tokens insert: ✓ SUCCESS' as test_result;

ROLLBACK;

-- ============================================================================
-- 9. Test Cleanup Functions
-- ============================================================================

-- Test cleanup_expired_oauth_authorizations
SELECT 
  'cleanup_expired_oauth_authorizations' as function_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'cleanup_expired_oauth_authorizations'
    ) THEN '✓ CALLABLE'
    ELSE '✗ NOT FOUND'
  END as status;

-- Test cleanup_expired_oauth_tokens
SELECT 
  'cleanup_expired_oauth_tokens' as function_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'cleanup_expired_oauth_tokens'
    ) THEN '✓ CALLABLE'
    ELSE '✗ NOT FOUND'
  END as status;

-- ============================================================================
-- 10. Summary
-- ============================================================================

SELECT 
  'OAuth Management Schema Verification' as summary,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('oauth_authorizations', 'oauth_access_tokens')
    ) = 2
    AND (
      SELECT COUNT(*) FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('oauth_authorizations', 'oauth_access_tokens')
    ) >= 10
    AND (
      SELECT COUNT(*) FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename IN ('oauth_authorizations', 'oauth_access_tokens')
    ) >= 6
    AND (
      SELECT COUNT(*) FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name LIKE 'cleanup_expired_oauth%'
    ) = 2
    THEN '✓ ALL CHECKS PASSED'
    ELSE '✗ SOME CHECKS FAILED - Review output above'
  END as result;
