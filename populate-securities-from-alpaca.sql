-- Populate securities_cache table with real Alpaca data
-- Run this in Supabase SQL Editor

-- First, create the table and view if they don't exist
CREATE TABLE IF NOT EXISTS securities_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_class TEXT NOT NULL CHECK (asset_class IN ('us_equity', 'crypto', 'us_option')),
  exchange TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  tradable BOOLEAN NOT NULL DEFAULT false,
  marginable BOOLEAN NOT NULL DEFAULT false,
  shortable BOOLEAN NOT NULL DEFAULT false,
  easy_to_borrow BOOLEAN NOT NULL DEFAULT false,
  fractionable BOOLEAN NOT NULL DEFAULT false,
  min_order_size TEXT,
  min_trade_increment TEXT,
  price_increment TEXT,
  maintenance_margin_requirement TEXT,
  attributes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_securities_cache_symbol ON securities_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_securities_cache_asset_class ON securities_cache(asset_class);
CREATE INDEX IF NOT EXISTS idx_securities_cache_status ON securities_cache(status);
CREATE INDEX IF NOT EXISTS idx_securities_cache_tradable ON securities_cache(tradable);
CREATE INDEX IF NOT EXISTS idx_securities_cache_tradable_active ON securities_cache(tradable, status) WHERE tradable = true AND status = 'active';

-- Enable RLS
ALTER TABLE securities_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Allow read access to securities cache" ON securities_cache;
DROP POLICY IF EXISTS "Allow service role to manage securities cache" ON securities_cache;

CREATE POLICY "Allow read access to securities cache" ON securities_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage securities cache" ON securities_cache
  FOR ALL TO service_role USING (true);

-- Create the view
DROP VIEW IF EXISTS tradable_securities;
CREATE VIEW tradable_securities AS
SELECT 
  asset_id,
  symbol,
  name,
  asset_class,
  exchange,
  tradable,
  marginable,
  shortable,
  fractionable,
  min_order_size,
  price_increment,
  last_synced_at
FROM securities_cache
WHERE status = 'active' AND tradable = true
ORDER BY symbol;

-- Grant permissions
GRANT SELECT ON tradable_securities TO authenticated;
GRANT ALL ON tradable_securities TO service_role;

-- Table is now ready for Alpaca data
-- The securities will be populated when the alpaca-securities Edge Function is called
-- This ensures we get real, up-to-date data directly from Alpaca API

-- Verify the table structure is ready
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'securities_cache' 
ORDER BY ordinal_position;

-- Check if the view was created successfully
SELECT 
  table_name,
  view_definition
FROM information_schema.views 
WHERE table_name = 'tradable_securities';

-- Show current record count (should be 0 initially)
SELECT 
  'securities_cache records' as table_name,
  count(*) as record_count
FROM securities_cache
UNION ALL
SELECT 
  'tradable_securities records' as table_name,
  count(*) as record_count
FROM tradable_securities;

-- Comments
COMMENT ON TABLE securities_cache IS 'Cached securities/assets data from Alpaca API';
COMMENT ON VIEW tradable_securities IS 'View of active, tradable securities for easy querying';