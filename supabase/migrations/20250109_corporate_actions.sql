-- Migration: Corporate Actions
-- Description: Create tables and policies for managing corporate action announcements
-- Requirements: 8.1, 8.2, 8.5

-- Create corporate_actions table
CREATE TABLE IF NOT EXISTS corporate_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alpaca_ca_id TEXT UNIQUE NOT NULL,
  corporate_action_id TEXT NOT NULL,
  ca_type TEXT NOT NULL CHECK (ca_type IN ('dividend', 'merger', 'spinoff', 'split')),
  ca_sub_type TEXT,
  initiating_symbol TEXT NOT NULL,
  initiating_original_cusip TEXT NOT NULL,
  target_symbol TEXT,
  target_cusip TEXT,
  declaration_date DATE,
  ex_date DATE NOT NULL,
  record_date DATE NOT NULL,
  payable_date DATE NOT NULL,
  cash DECIMAL(15,6),
  old_rate DECIMAL(15,6),
  new_rate DECIMAL(15,6),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_corporate_actions_alpaca_ca_id ON corporate_actions(alpaca_ca_id);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_ca_type ON corporate_actions(ca_type);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_initiating_symbol ON corporate_actions(initiating_symbol);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_initiating_cusip ON corporate_actions(initiating_original_cusip);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_target_symbol ON corporate_actions(target_symbol) WHERE target_symbol IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_corporate_actions_declaration_date ON corporate_actions(declaration_date) WHERE declaration_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_corporate_actions_ex_date ON corporate_actions(ex_date);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_record_date ON corporate_actions(record_date);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_payable_date ON corporate_actions(payable_date);

-- Enable Row Level Security
ALTER TABLE corporate_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for corporate_actions

-- All authenticated users can view corporate action announcements
CREATE POLICY "Authenticated users can view corporate actions"
  ON corporate_actions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role can insert corporate actions (populated from Alpaca API)
CREATE POLICY "Service role can insert corporate actions"
  ON corporate_actions
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Only service role can update corporate actions
CREATE POLICY "Service role can update corporate actions"
  ON corporate_actions
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Only service role can delete corporate actions
CREATE POLICY "Service role can delete corporate actions"
  ON corporate_actions
  FOR DELETE
  USING (auth.role() = 'service_role');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_corporate_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER corporate_actions_updated_at
  BEFORE UPDATE ON corporate_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_corporate_actions_updated_at();

-- Add comments to table and columns
COMMENT ON TABLE corporate_actions IS 'Stores corporate action announcements from Alpaca API (dividends, mergers, spinoffs, splits)';
COMMENT ON COLUMN corporate_actions.alpaca_ca_id IS 'Unique identifier from Alpaca API';
COMMENT ON COLUMN corporate_actions.corporate_action_id IS 'Corporate action identifier';
COMMENT ON COLUMN corporate_actions.ca_type IS 'Type of corporate action: dividend, merger, spinoff, or split';
COMMENT ON COLUMN corporate_actions.ca_sub_type IS 'Subtype providing additional classification';
COMMENT ON COLUMN corporate_actions.initiating_symbol IS 'Symbol of the security initiating the corporate action';
COMMENT ON COLUMN corporate_actions.initiating_original_cusip IS 'CUSIP of the initiating security';
COMMENT ON COLUMN corporate_actions.target_symbol IS 'Symbol of the target security (for mergers, spinoffs)';
COMMENT ON COLUMN corporate_actions.target_cusip IS 'CUSIP of the target security';
COMMENT ON COLUMN corporate_actions.declaration_date IS 'Date the corporate action was declared';
COMMENT ON COLUMN corporate_actions.ex_date IS 'Ex-dividend or ex-distribution date';
COMMENT ON COLUMN corporate_actions.record_date IS 'Date of record for determining shareholders';
COMMENT ON COLUMN corporate_actions.payable_date IS 'Date when the corporate action is executed';
COMMENT ON COLUMN corporate_actions.cash IS 'Cash amount per share (for dividends)';
COMMENT ON COLUMN corporate_actions.old_rate IS 'Old rate for splits (e.g., 1 for 1:2 split)';
COMMENT ON COLUMN corporate_actions.new_rate IS 'New rate for splits (e.g., 2 for 1:2 split)';
COMMENT ON COLUMN corporate_actions.details IS 'Additional details stored as JSON';
