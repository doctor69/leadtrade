-- Create funding_transactions table for tracking deposits and withdrawals

CREATE TABLE IF NOT EXISTS funding_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_account_id TEXT NOT NULL,
  transfer_id TEXT NOT NULL, -- Alpaca transfer ID
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, cancelled
  transfer_type TEXT NOT NULL, -- deposit, withdrawal
  funding_source TEXT DEFAULT 'ach', -- ach, wire, check
  description TEXT,
  alpaca_response JSONB, -- Store full Alpaca response
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT funding_transactions_amount_positive CHECK (amount > 0),
  CONSTRAINT funding_transactions_currency_valid CHECK (currency IN ('USD')),
  CONSTRAINT funding_transactions_status_valid CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  CONSTRAINT funding_transactions_type_valid CHECK (transfer_type IN ('deposit', 'withdrawal')),
  CONSTRAINT funding_transactions_source_valid CHECK (funding_source IN ('ach', 'wire', 'check'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_funding_transactions_user_id ON funding_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_funding_transactions_alpaca_account_id ON funding_transactions(alpaca_account_id);
CREATE INDEX IF NOT EXISTS idx_funding_transactions_transfer_id ON funding_transactions(transfer_id);
CREATE INDEX IF NOT EXISTS idx_funding_transactions_status ON funding_transactions(status);
CREATE INDEX IF NOT EXISTS idx_funding_transactions_created_at ON funding_transactions(created_at);

-- Enable Row Level Security
ALTER TABLE funding_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own funding transactions" ON funding_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own funding transactions" ON funding_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own funding transactions" ON funding_transactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_funding_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER funding_transactions_updated_at
  BEFORE UPDATE ON funding_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_funding_transactions_updated_at();

-- Add helpful comments
COMMENT ON TABLE funding_transactions IS 'Tracks all funding transactions (deposits/withdrawals) for user accounts';
COMMENT ON COLUMN funding_transactions.transfer_id IS 'Alpaca transfer ID for tracking';
COMMENT ON COLUMN funding_transactions.alpaca_response IS 'Full response from Alpaca API for debugging';