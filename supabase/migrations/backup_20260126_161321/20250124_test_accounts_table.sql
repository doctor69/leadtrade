-- Create test_accounts table for tracking test accounts created for Alpaca consultants
CREATE TABLE IF NOT EXISTS test_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  alpaca_account_id TEXT UNIQUE NOT NULL,
  alpaca_account_number TEXT,
  purpose TEXT NOT NULL,
  created_for TEXT NOT NULL, -- 'alpaca_consultant' or 'internal_testing'
  funded_amount NUMERIC(10, 2),
  initial_password TEXT, -- Encrypted password for consultant access
  test_scenarios_completed JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE test_accounts ENABLE ROW LEVEL SECURITY;

-- Only service role can access test accounts
CREATE POLICY "Service role can manage test accounts"
  ON test_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_test_accounts_email ON test_accounts(email);
CREATE INDEX IF NOT EXISTS idx_test_accounts_alpaca_id ON test_accounts(alpaca_account_id);
CREATE INDEX IF NOT EXISTS idx_test_accounts_created_for ON test_accounts(created_for);

-- Add comment
COMMENT ON TABLE test_accounts IS 'Tracks test accounts created for Alpaca consultants and internal testing';
