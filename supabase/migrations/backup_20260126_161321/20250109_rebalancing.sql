-- ============================================================================
-- Alpaca Rebalancing API Schema
-- ============================================================================
-- This migration creates tables for managing portfolio rebalancing:
-- - rebalancing_portfolios: Portfolio definitions with target weights
-- - rebalancing_subscriptions: Account subscriptions to portfolios
-- - rebalancing_runs: Execution history of rebalancing operations
-- ============================================================================

-- ============================================================================
-- Table: rebalancing_portfolios
-- ============================================================================
-- Stores portfolio definitions with target asset weights and rebalancing rules
CREATE TABLE IF NOT EXISTS rebalancing_portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  alpaca_portfolio_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  weights JSONB NOT NULL, -- Target weights as { "symbol": weight }
  cooldown_days INTEGER NOT NULL DEFAULT 0,
  rebalance_conditions JSONB, -- Conditions for automatic rebalancing
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient portfolio lookups
CREATE INDEX IF NOT EXISTS idx_rebalancing_portfolios_account_id 
  ON rebalancing_portfolios(account_id);
CREATE INDEX IF NOT EXISTS idx_rebalancing_portfolios_alpaca_id 
  ON rebalancing_portfolios(alpaca_portfolio_id);
CREATE INDEX IF NOT EXISTS idx_rebalancing_portfolios_status 
  ON rebalancing_portfolios(status);

-- ============================================================================
-- Table: rebalancing_subscriptions
-- ============================================================================
-- Links accounts to portfolios for automatic rebalancing
CREATE TABLE IF NOT EXISTS rebalancing_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES rebalancing_portfolios(id) ON DELETE CASCADE,
  account_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  alpaca_subscription_id TEXT UNIQUE,
  allocation_percentage DECIMAL(5,2) NOT NULL CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(portfolio_id, account_id)
);

-- Index for efficient subscription lookups
CREATE INDEX IF NOT EXISTS idx_rebalancing_subscriptions_portfolio_id 
  ON rebalancing_subscriptions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_rebalancing_subscriptions_account_id 
  ON rebalancing_subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_rebalancing_subscriptions_alpaca_id 
  ON rebalancing_subscriptions(alpaca_subscription_id);
CREATE INDEX IF NOT EXISTS idx_rebalancing_subscriptions_active 
  ON rebalancing_subscriptions(is_active);

-- ============================================================================
-- Table: rebalancing_runs
-- ============================================================================
-- Tracks execution history of rebalancing operations
CREATE TABLE IF NOT EXISTS rebalancing_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES rebalancing_portfolios(id) ON DELETE CASCADE,
  alpaca_run_id TEXT UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('manual', 'automatic', 'scheduled')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'canceled')),
  reason TEXT,
  orders JSONB DEFAULT '[]'::jsonb, -- Array of order IDs created during run
  failed_orders JSONB DEFAULT '[]'::jsonb, -- Array of failed order details
  skipped_orders JSONB DEFAULT '[]'::jsonb, -- Array of skipped order details
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient run lookups
CREATE INDEX IF NOT EXISTS idx_rebalancing_runs_portfolio_id 
  ON rebalancing_runs(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_rebalancing_runs_alpaca_id 
  ON rebalancing_runs(alpaca_run_id);
CREATE INDEX IF NOT EXISTS idx_rebalancing_runs_status 
  ON rebalancing_runs(status);
CREATE INDEX IF NOT EXISTS idx_rebalancing_runs_type 
  ON rebalancing_runs(type);
CREATE INDEX IF NOT EXISTS idx_rebalancing_runs_created_at 
  ON rebalancing_runs(created_at DESC);

-- ============================================================================
-- Automatic Timestamp Updates
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rebalancing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for rebalancing_portfolios
DROP TRIGGER IF EXISTS update_rebalancing_portfolios_updated_at ON rebalancing_portfolios;
CREATE TRIGGER update_rebalancing_portfolios_updated_at
  BEFORE UPDATE ON rebalancing_portfolios
  FOR EACH ROW
  EXECUTE FUNCTION update_rebalancing_updated_at();

-- Trigger for rebalancing_subscriptions
DROP TRIGGER IF EXISTS update_rebalancing_subscriptions_updated_at ON rebalancing_subscriptions;
CREATE TRIGGER update_rebalancing_subscriptions_updated_at
  BEFORE UPDATE ON rebalancing_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_rebalancing_updated_at();

-- Trigger for rebalancing_runs
DROP TRIGGER IF EXISTS update_rebalancing_runs_updated_at ON rebalancing_runs;
CREATE TRIGGER update_rebalancing_runs_updated_at
  BEFORE UPDATE ON rebalancing_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_rebalancing_updated_at();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE rebalancing_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE rebalancing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rebalancing_runs ENABLE ROW LEVEL SECURITY;

-- Policies for rebalancing_portfolios
-- Users can view their own portfolios
CREATE POLICY "Users can view own portfolios"
  ON rebalancing_portfolios FOR SELECT
  USING (auth.uid() = account_id);

-- Users can create their own portfolios
CREATE POLICY "Users can create own portfolios"
  ON rebalancing_portfolios FOR INSERT
  WITH CHECK (auth.uid() = account_id);

-- Users can update their own portfolios
CREATE POLICY "Users can update own portfolios"
  ON rebalancing_portfolios FOR UPDATE
  USING (auth.uid() = account_id);

-- Users can delete their own portfolios
CREATE POLICY "Users can delete own portfolios"
  ON rebalancing_portfolios FOR DELETE
  USING (auth.uid() = account_id);

-- Policies for rebalancing_subscriptions
-- Users can view subscriptions for their portfolios or their own subscriptions
CREATE POLICY "Users can view related subscriptions"
  ON rebalancing_subscriptions FOR SELECT
  USING (
    auth.uid() = account_id OR
    EXISTS (
      SELECT 1 FROM rebalancing_portfolios
      WHERE rebalancing_portfolios.id = rebalancing_subscriptions.portfolio_id
      AND rebalancing_portfolios.account_id = auth.uid()
    )
  );

-- Users can create subscriptions to any portfolio for their own account
CREATE POLICY "Users can create own subscriptions"
  ON rebalancing_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = account_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
  ON rebalancing_subscriptions FOR UPDATE
  USING (auth.uid() = account_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions"
  ON rebalancing_subscriptions FOR DELETE
  USING (auth.uid() = account_id);

-- Policies for rebalancing_runs
-- Users can view runs for their portfolios
CREATE POLICY "Users can view portfolio runs"
  ON rebalancing_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rebalancing_portfolios
      WHERE rebalancing_portfolios.id = rebalancing_runs.portfolio_id
      AND rebalancing_portfolios.account_id = auth.uid()
    )
  );

-- Users can create runs for their portfolios
CREATE POLICY "Users can create portfolio runs"
  ON rebalancing_runs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rebalancing_portfolios
      WHERE rebalancing_portfolios.id = rebalancing_runs.portfolio_id
      AND rebalancing_portfolios.account_id = auth.uid()
    )
  );

-- Users can update runs for their portfolios
CREATE POLICY "Users can update portfolio runs"
  ON rebalancing_runs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rebalancing_portfolios
      WHERE rebalancing_portfolios.id = rebalancing_runs.portfolio_id
      AND rebalancing_portfolios.account_id = auth.uid()
    )
  );

-- Users can delete runs for their portfolios
CREATE POLICY "Users can delete portfolio runs"
  ON rebalancing_runs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rebalancing_portfolios
      WHERE rebalancing_portfolios.id = rebalancing_runs.portfolio_id
      AND rebalancing_portfolios.account_id = auth.uid()
    )
  );

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE rebalancing_portfolios IS 'Portfolio definitions with target asset weights and rebalancing rules';
COMMENT ON TABLE rebalancing_subscriptions IS 'Account subscriptions to rebalancing portfolios';
COMMENT ON TABLE rebalancing_runs IS 'Execution history of rebalancing operations';

COMMENT ON COLUMN rebalancing_portfolios.weights IS 'Target portfolio weights as JSON object with symbol keys';
COMMENT ON COLUMN rebalancing_portfolios.cooldown_days IS 'Minimum days between rebalancing runs';
COMMENT ON COLUMN rebalancing_portfolios.rebalance_conditions IS 'Conditions that trigger automatic rebalancing';
COMMENT ON COLUMN rebalancing_subscriptions.allocation_percentage IS 'Percentage of account allocated to this portfolio (0-100)';
COMMENT ON COLUMN rebalancing_runs.orders IS 'Array of order IDs created during this run';
COMMENT ON COLUMN rebalancing_runs.failed_orders IS 'Array of orders that failed during execution';
COMMENT ON COLUMN rebalancing_runs.skipped_orders IS 'Array of orders that were skipped';
