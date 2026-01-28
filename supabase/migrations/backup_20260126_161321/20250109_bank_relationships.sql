-- Migration: Bank Relationships
-- Description: Create tables and policies for managing bank relationships
-- Requirements: 3.1, 3.3, 3.4

-- Create bank_relationships table
CREATE TABLE IF NOT EXISTS bank_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_bank_id TEXT UNIQUE NOT NULL,
  account_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  bank_code_type TEXT NOT NULL CHECK (bank_code_type IN ('aba', 'bic')),
  account_number_last4 TEXT,
  country TEXT,
  state_province TEXT,
  postal_code TEXT,
  city TEXT,
  street_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_bank_relationships_user_id ON bank_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_relationships_account_id ON bank_relationships(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_relationships_alpaca_bank_id ON bank_relationships(alpaca_bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_relationships_status ON bank_relationships(status);

-- Enable Row Level Security
ALTER TABLE bank_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bank_relationships

-- Users can view their own bank relationships
CREATE POLICY "Users can view own bank relationships"
  ON bank_relationships
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own bank relationships
CREATE POLICY "Users can insert own bank relationships"
  ON bank_relationships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bank relationships
CREATE POLICY "Users can update own bank relationships"
  ON bank_relationships
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bank relationships
CREATE POLICY "Users can delete own bank relationships"
  ON bank_relationships
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bank_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bank_relationships_updated_at
  BEFORE UPDATE ON bank_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_relationships_updated_at();

-- Add comment to table
COMMENT ON TABLE bank_relationships IS 'Stores bank relationship information for user accounts';
COMMENT ON COLUMN bank_relationships.alpaca_bank_id IS 'Unique identifier from Alpaca API';
COMMENT ON COLUMN bank_relationships.bank_code_type IS 'Type of bank code: aba (US routing number) or bic (SWIFT code)';
COMMENT ON COLUMN bank_relationships.account_number_last4 IS 'Last 4 digits of account number for display purposes';
COMMENT ON COLUMN bank_relationships.status IS 'Status of the bank relationship (pending, approved, rejected, etc.)';
