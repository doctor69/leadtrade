-- Migration: Transfer Operations Schema
-- Description: Creates tables and policies for managing ACH, wire, and sandbox transfers
-- Requirements: 4.1, 4.2, 4.3
-- Date: 2025-01-09

-- Create transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  alpaca_transfer_id TEXT UNIQUE,
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('ach', 'wire', 'sandbox')),
  direction TEXT NOT NULL CHECK (direction IN ('INCOMING', 'OUTGOING')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'pending', 'sent_to_clearing', 'approved', 'canceled', 'rejected')),
  timing TEXT CHECK (timing IN ('immediate', 'next_day')),
  relationship_id TEXT, -- ACH relationship ID
  bank_id TEXT, -- Bank relationship ID for wire transfers
  additional_information TEXT, -- Required for wire transfers
  fee_payment_method TEXT CHECK (fee_payment_method IN ('user', 'invoice')), -- Required for wire transfers
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_account_id ON transfers(account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_alpaca_id ON transfers(alpaca_transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_direction ON transfers(direction);
CREATE INDEX IF NOT EXISTS idx_transfers_type ON transfers(transfer_type);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at DESC);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_transfers_user_status_created ON transfers(user_id, status, created_at DESC);

-- Enable Row Level Security
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own transfers
CREATE POLICY "Users can view their own transfers"
  ON transfers
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own transfers
CREATE POLICY "Users can insert their own transfers"
  ON transfers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own transfers (for status updates)
CREATE POLICY "Users can update their own transfers"
  ON transfers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own pending transfers
CREATE POLICY "Users can delete their own pending transfers"
  ON transfers
  FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row updates
DROP TRIGGER IF EXISTS trigger_update_transfers_updated_at ON transfers;
CREATE TRIGGER trigger_update_transfers_updated_at
  BEFORE UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_transfers_updated_at();

-- Add comments for documentation
COMMENT ON TABLE transfers IS 'Stores transfer history for ACH, wire, and sandbox transfers';
COMMENT ON COLUMN transfers.transfer_type IS 'Type of transfer: ach, wire, or sandbox';
COMMENT ON COLUMN transfers.direction IS 'Transfer direction: INCOMING or OUTGOING';
COMMENT ON COLUMN transfers.status IS 'Current status of the transfer';
COMMENT ON COLUMN transfers.relationship_id IS 'ACH relationship ID (required for ACH transfers)';
COMMENT ON COLUMN transfers.bank_id IS 'Bank relationship ID (required for wire transfers)';
COMMENT ON COLUMN transfers.additional_information IS 'Additional information (required for wire transfers)';
COMMENT ON COLUMN transfers.fee_payment_method IS 'Fee payment method for wire transfers: user or invoice';
