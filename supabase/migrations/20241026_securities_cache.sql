-- Create securities cache table for Alpaca assets
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

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_securities_cache_symbol ON securities_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_securities_cache_asset_class ON securities_cache(asset_class);
CREATE INDEX IF NOT EXISTS idx_securities_cache_exchange ON securities_cache(exchange);
CREATE INDEX IF NOT EXISTS idx_securities_cache_status ON securities_cache(status);
CREATE INDEX IF NOT EXISTS idx_securities_cache_tradable ON securities_cache(tradable);
CREATE INDEX IF NOT EXISTS idx_securities_cache_last_synced ON securities_cache(last_synced_at);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_securities_cache_tradable_active ON securities_cache(tradable, status) WHERE tradable = true AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_securities_cache_class_status ON securities_cache(asset_class, status);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_securities_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_securities_cache_updated_at
  BEFORE UPDATE ON securities_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_securities_cache_updated_at();

-- Add RLS policies
ALTER TABLE securities_cache ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users (securities data is public)
CREATE POLICY "Allow read access to securities cache" ON securities_cache
  FOR SELECT TO authenticated
  USING (true);

-- Allow insert/update only to service role (for syncing data)
CREATE POLICY "Allow service role to manage securities cache" ON securities_cache
  FOR ALL TO service_role
  USING (true);

-- Create a view for commonly used securities data
CREATE OR REPLACE VIEW tradable_securities AS
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

-- Grant access to the view
GRANT SELECT ON tradable_securities TO authenticated;
GRANT ALL ON tradable_securities TO service_role;

-- Add comments for documentation
COMMENT ON TABLE securities_cache IS 'Cached securities/assets data from Alpaca API';
COMMENT ON COLUMN securities_cache.asset_id IS 'Alpaca asset ID (unique identifier)';
COMMENT ON COLUMN securities_cache.symbol IS 'Trading symbol (e.g., AAPL, TSLA)';
COMMENT ON COLUMN securities_cache.asset_class IS 'Type of asset: us_equity, crypto, or us_option';
COMMENT ON COLUMN securities_cache.tradable IS 'Whether the asset can be traded';
COMMENT ON COLUMN securities_cache.last_synced_at IS 'When this record was last synced with Alpaca API';
COMMENT ON VIEW tradable_securities IS 'View of active, tradable securities for easy querying';