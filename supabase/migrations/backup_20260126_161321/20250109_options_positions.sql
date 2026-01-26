-- Create options_positions table for tracking options positions
CREATE TABLE IF NOT EXISTS options_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_position_id TEXT,
  contract_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  underlying_symbol TEXT NOT NULL,
  option_type TEXT NOT NULL CHECK (option_type IN ('call', 'put')),
  strike_price DECIMAL(15,4) NOT NULL,
  expiration_date DATE NOT NULL,
  quantity DECIMAL(10,4) NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  avg_entry_price DECIMAL(15,4),
  current_price DECIMAL(15,4),
  market_value DECIMAL(15,2),
  cost_basis DECIMAL(15,2),
  unrealized_pl DECIMAL(15,2),
  unrealized_pl_percent DECIMAL(8,4),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired', 'exercised', 'assigned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_options_positions_account_id ON options_positions(account_id);
CREATE INDEX IF NOT EXISTS idx_options_positions_alpaca_id ON options_positions(alpaca_position_id) WHERE alpaca_position_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_options_positions_contract_id ON options_positions(contract_id);
CREATE INDEX IF NOT EXISTS idx_options_positions_symbol ON options_positions(symbol);
CREATE INDEX IF NOT EXISTS idx_options_positions_underlying ON options_positions(underlying_symbol);
CREATE INDEX IF NOT EXISTS idx_options_positions_status ON options_positions(status);
CREATE INDEX IF NOT EXISTS idx_options_positions_expiration ON options_positions(expiration_date);
CREATE INDEX IF NOT EXISTS idx_options_positions_account_status ON options_positions(account_id, status);
CREATE INDEX IF NOT EXISTS idx_options_positions_account_underlying ON options_positions(account_id, underlying_symbol);
CREATE INDEX IF NOT EXISTS idx_options_positions_updated_at ON options_positions(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE options_positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own options positions
CREATE POLICY "Users can view their own options positions"
  ON options_positions
  FOR SELECT
  USING (auth.uid() = account_id);

-- Users can insert their own options positions
CREATE POLICY "Users can insert their own options positions"
  ON options_positions
  FOR INSERT
  WITH CHECK (auth.uid() = account_id);

-- Users can update their own options positions
CREATE POLICY "Users can update their own options positions"
  ON options_positions
  FOR UPDATE
  USING (auth.uid() = account_id)
  WITH CHECK (auth.uid() = account_id);

-- Users can delete their own options positions
CREATE POLICY "Users can delete their own options positions"
  ON options_positions
  FOR DELETE
  USING (auth.uid() = account_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_options_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER options_positions_updated_at
  BEFORE UPDATE ON options_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_options_positions_updated_at();

-- Add comment
COMMENT ON TABLE options_positions IS 'Stores options positions for user accounts with detailed contract information';
COMMENT ON COLUMN options_positions.contract_id IS 'Alpaca options contract identifier';
COMMENT ON COLUMN options_positions.symbol IS 'Full options symbol (e.g., AAPL250117C00150000)';
COMMENT ON COLUMN options_positions.underlying_symbol IS 'Underlying stock symbol (e.g., AAPL)';
COMMENT ON COLUMN options_positions.option_type IS 'Call or Put option';
COMMENT ON COLUMN options_positions.strike_price IS 'Strike price of the option contract';
COMMENT ON COLUMN options_positions.expiration_date IS 'Expiration date of the option contract';
COMMENT ON COLUMN options_positions.side IS 'Long (bought) or Short (sold) position';
COMMENT ON COLUMN options_positions.status IS 'Current status of the position';
