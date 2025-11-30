-- Migration: Watchlist Management Schema
-- Description: Creates tables and policies for managing user watchlists and tracked securities
-- Requirements: 9.1, 9.5
-- Date: 2025-01-09

-- Create watchlists table
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  alpaca_watchlist_id TEXT UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT watchlist_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Create watchlist_assets junction table
CREATE TABLE IF NOT EXISTS watchlist_assets (
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (watchlist_id, symbol),
  CONSTRAINT symbol_not_empty CHECK (length(trim(symbol)) > 0)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_account_id ON watchlists(account_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_alpaca_id ON watchlists(alpaca_watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_name ON watchlists(name);
CREATE INDEX IF NOT EXISTS idx_watchlist_assets_symbol ON watchlist_assets(symbol);
CREATE INDEX IF NOT EXISTS idx_watchlist_assets_watchlist_id ON watchlist_assets(watchlist_id);

-- Enable Row Level Security
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for watchlists

-- Users can view their own watchlists
CREATE POLICY "Users can view own watchlists"
  ON watchlists
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own watchlists
CREATE POLICY "Users can insert own watchlists"
  ON watchlists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own watchlists
CREATE POLICY "Users can update own watchlists"
  ON watchlists
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own watchlists
CREATE POLICY "Users can delete own watchlists"
  ON watchlists
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for watchlist_assets

-- Users can view assets in their own watchlists
CREATE POLICY "Users can view own watchlist assets"
  ON watchlist_assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_assets.watchlist_id
      AND watchlists.user_id = auth.uid()
    )
  );

-- Users can insert assets into their own watchlists
CREATE POLICY "Users can insert own watchlist assets"
  ON watchlist_assets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_assets.watchlist_id
      AND watchlists.user_id = auth.uid()
    )
  );

-- Users can update assets in their own watchlists
CREATE POLICY "Users can update own watchlist assets"
  ON watchlist_assets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_assets.watchlist_id
      AND watchlists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_assets.watchlist_id
      AND watchlists.user_id = auth.uid()
    )
  );

-- Users can delete assets from their own watchlists
CREATE POLICY "Users can delete own watchlist assets"
  ON watchlist_assets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_assets.watchlist_id
      AND watchlists.user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp on watchlists
CREATE OR REPLACE FUNCTION update_watchlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER watchlists_updated_at
  BEFORE UPDATE ON watchlists
  FOR EACH ROW
  EXECUTE FUNCTION update_watchlists_updated_at();

-- Add comments to tables and columns
COMMENT ON TABLE watchlists IS 'Stores user watchlists for tracking securities of interest';
COMMENT ON COLUMN watchlists.alpaca_watchlist_id IS 'Unique identifier from Alpaca API';
COMMENT ON COLUMN watchlists.name IS 'User-defined name for the watchlist';
COMMENT ON COLUMN watchlists.user_id IS 'Reference to the user who owns this watchlist';
COMMENT ON COLUMN watchlists.account_id IS 'Optional reference to user profile';

COMMENT ON TABLE watchlist_assets IS 'Junction table linking watchlists to securities (symbols)';
COMMENT ON COLUMN watchlist_assets.watchlist_id IS 'Reference to the parent watchlist';
COMMENT ON COLUMN watchlist_assets.symbol IS 'Stock or asset symbol (e.g., AAPL, GOOGL)';
COMMENT ON COLUMN watchlist_assets.added_at IS 'Timestamp when the symbol was added to the watchlist';
