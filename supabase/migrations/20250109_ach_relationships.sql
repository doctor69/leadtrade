-- Migration: ACH Relationships
-- Description: Create tables and policies for managing ACH relationships
-- Requirements: 3.2, 3.4, 3.5

-- Create ach_relationships table
CREATE TABLE IF NOT EXISTS ach_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_ach_id TEXT UNIQUE NOT NULL,
  account_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'approved', 'pending', 'sent_to_clearing', 'rejected', 'canceled')),
  account_owner_name TEXT NOT NULL,
  bank_account_type TEXT NOT NULL CHECK (bank_account_type IN ('checking', 'savings')),
  bank_account_number_last4 TEXT,
  bank_routing_number TEXT NOT NULL,
  nickname TEXT,
  processor_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ach_relationships_user_id ON ach_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_ach_relationships_account_id ON ach_relationships(account_id);
CREATE INDEX IF NOT EXISTS idx_ach_relationships_alpaca_ach_id ON ach_relationships(alpaca_ach_id);
CREATE INDEX IF NOT EXISTS idx_ach_relationships_status ON ach_relationships(status);
CREATE INDEX IF NOT EXISTS idx_ach_relationships_bank_routing_number ON ach_relationships(bank_routing_number);

-- Enable Row Level Security
ALTER TABLE ach_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ach_relationships

-- Users can view their own ACH relationships
CREATE POLICY "Users can view own ACH relationships"
  ON ach_relationships
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own ACH relationships
CREATE POLICY "Users can insert own ACH relationships"
  ON ach_relationships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own ACH relationships
CREATE POLICY "Users can update own ACH relationships"
  ON ach_relationships
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own ACH relationships
CREATE POLICY "Users can delete own ACH relationships"
  ON ach_relationships
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ach_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ach_relationships_updated_at
  BEFORE UPDATE ON ach_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_ach_relationships_updated_at();

-- Add comments to table
COMMENT ON TABLE ach_relationships IS 'Stores ACH relationship information for user accounts';
COMMENT ON COLUMN ach_relationships.alpaca_ach_id IS 'Unique identifier from Alpaca API';
COMMENT ON COLUMN ach_relationships.status IS 'Status of the ACH relationship (queued, approved, pending, sent_to_clearing, rejected, canceled)';
COMMENT ON COLUMN ach_relationships.bank_account_type IS 'Type of bank account: checking or savings';
COMMENT ON COLUMN ach_relationships.bank_account_number_last4 IS 'Last 4 digits of account number for display purposes';
COMMENT ON COLUMN ach_relationships.bank_routing_number IS '9-digit ABA routing number';
COMMENT ON COLUMN ach_relationships.processor_token IS 'Plaid processor token for integration';
COMMENT ON COLUMN ach_relationships.nickname IS 'User-friendly name for the ACH relationship';
