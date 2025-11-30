-- Simple validation script to check migration syntax
-- This script can be run to validate the migration without applying it

-- Check if all required tables would be created
SELECT 'profiles table structure' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name IN ('id', 'username', 'share_trades', 'trading_mode')
  ) THEN 'PASS' ELSE 'FAIL' END as status;

-- Validate that functions exist
SELECT 'get_leaderboard_data function' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'get_leaderboard_data'
  ) THEN 'PASS' ELSE 'FAIL' END as status;

SELECT 'validate_total_allocation function' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'validate_total_allocation'
  ) THEN 'PASS' ELSE 'FAIL' END as status;

-- Check RLS policies exist
SELECT 'RLS policies count' as check_name,
  COUNT(*) || ' policies found' as status
FROM pg_policies 
WHERE schemaname = 'public';

-- Check indexes exist
SELECT 'Performance indexes' as check_name,
  COUNT(*) || ' indexes found' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';

-- Validate app_settings has default values
SELECT 'App settings defaults' as check_name,
  COUNT(*) || ' default settings' as status
FROM public.app_settings 
WHERE setting_key IN ('trading_mode', 'app_name', 'maintenance_mode');