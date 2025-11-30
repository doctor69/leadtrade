-- Database Schema Verification Script
-- This script checks for the existence of all expected tables

-- Create a temporary table to store expected tables
CREATE TEMP TABLE expected_tables (table_name TEXT);

-- Insert all expected tables
INSERT INTO expected_tables (table_name) VALUES
  -- Core MVP tables
  ('profiles'),
  ('alpaca_accounts'),
  ('copy_trading_subscriptions'),
  ('app_settings'),
  
  -- Securities & Market Data
  ('securities_cache'),
  
  -- Documents & KYC
  ('account_documents'),
  ('kyc_submissions'),
  ('onfido_sdk_tokens'),
  ('corporate_actions'),
  
  -- Banking & Transfers
  ('ach_relationships'),
  ('bank_relationships'),
  ('transfers'),
  
  -- Trading
  ('options_positions'),
  ('watchlists'),
  ('watchlist_assets'),
  
  -- Portfolio Management
  ('rebalancing_portfolios'),
  ('rebalancing_subscriptions'),
  ('rebalancing_runs'),
  
  -- OAuth
  ('oauth_authorizations'),
  ('oauth_access_tokens');

-- Show existing tables
SELECT 
  '=== EXISTING TABLES ===' AS status,
  et.table_name,
  CASE 
    WHEN ist.table_name IS NOT NULL THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END AS exists,
  pg_size_pretty(pg_total_relation_size(quote_ident(ist.table_schema) || '.' || quote_ident(ist.table_name))) AS size
FROM expected_tables et
LEFT JOIN information_schema.tables ist 
  ON ist.table_name = et.table_name 
  AND ist.table_schema = 'public'
ORDER BY 
  CASE WHEN ist.table_name IS NOT NULL THEN 0 ELSE 1 END,
  et.table_name;

-- Summary statistics
SELECT 
  '=== SUMMARY ===' AS status,
  COUNT(*) FILTER (WHERE ist.table_name IS NOT NULL) AS existing_tables,
  COUNT(*) FILTER (WHERE ist.table_name IS NULL) AS missing_tables,
  COUNT(*) AS total_expected
FROM expected_tables et
LEFT JOIN information_schema.tables ist 
  ON ist.table_name = et.table_name 
  AND ist.table_schema = 'public';

-- Show missing tables
SELECT 
  '=== MISSING TABLES ===' AS status,
  et.table_name
FROM expected_tables et
LEFT JOIN information_schema.tables ist 
  ON ist.table_name = et.table_name 
  AND ist.table_schema = 'public'
WHERE ist.table_name IS NULL
ORDER BY et.table_name;

-- Show additional tables not in expected list
SELECT 
  '=== ADDITIONAL TABLES ===' AS status,
  ist.table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(ist.table_schema) || '.' || quote_ident(ist.table_name))) AS size
FROM information_schema.tables ist
LEFT JOIN expected_tables et ON et.table_name = ist.table_name
WHERE ist.table_schema = 'public'
  AND ist.table_type = 'BASE TABLE'
  AND et.table_name IS NULL
ORDER BY ist.table_name;

-- Clean up
DROP TABLE expected_tables;
