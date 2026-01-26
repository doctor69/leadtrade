-- KYC/CIP Submissions Schema
-- This migration creates tables for tracking KYC/CIP verification submissions and results

-- Create kyc_submissions table
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  alpaca_account_id TEXT,
  provider_name TEXT NOT NULL, -- e.g., 'onfido', 'manual'
  submission_type TEXT NOT NULL, -- 'cip', 'kyc', 'document', 'photo', 'identity', 'watchlist'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'review'
  risk_level TEXT, -- 'low', 'medium', 'high'
  verification_results JSONB, -- Complete verification response from provider
  failure_reasons TEXT[], -- Array of failure reasons if rejected
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB, -- Additional provider-specific metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create onfido_sdk_tokens table for tracking SDK token generation
CREATE TABLE IF NOT EXISTS onfido_sdk_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  alpaca_account_id TEXT,
  sdk_token TEXT NOT NULL,
  applicant_id TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_account_id ON kyc_submissions(account_id);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_alpaca_account_id ON kyc_submissions(alpaca_account_id);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_status ON kyc_submissions(status);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_provider ON kyc_submissions(provider_name);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_submitted_at ON kyc_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_onfido_sdk_tokens_account_id ON onfido_sdk_tokens(account_id);
CREATE INDEX IF NOT EXISTS idx_onfido_sdk_tokens_expires_at ON onfido_sdk_tokens(expires_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_kyc_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kyc_submissions_updated_at
  BEFORE UPDATE ON kyc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_kyc_submissions_updated_at();

-- Enable Row Level Security
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onfido_sdk_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kyc_submissions
-- Users can view their own KYC submissions
CREATE POLICY "Users can view own KYC submissions"
  ON kyc_submissions
  FOR SELECT
  USING (auth.uid() = account_id);

-- Users can insert their own KYC submissions
CREATE POLICY "Users can create own KYC submissions"
  ON kyc_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = account_id);

-- Users can update their own pending KYC submissions
CREATE POLICY "Users can update own pending KYC submissions"
  ON kyc_submissions
  FOR UPDATE
  USING (auth.uid() = account_id AND status = 'pending');

-- Service role can manage all KYC submissions
CREATE POLICY "Service role can manage all KYC submissions"
  ON kyc_submissions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for onfido_sdk_tokens
-- Users can view their own SDK tokens
CREATE POLICY "Users can view own SDK tokens"
  ON onfido_sdk_tokens
  FOR SELECT
  USING (auth.uid() = account_id);

-- Service role can manage all SDK tokens
CREATE POLICY "Service role can manage all SDK tokens"
  ON onfido_sdk_tokens
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE kyc_submissions IS 'Tracks KYC/CIP verification submissions and results';
COMMENT ON TABLE onfido_sdk_tokens IS 'Tracks Onfido SDK token generation for identity verification';
COMMENT ON COLUMN kyc_submissions.provider_name IS 'Identity verification provider (e.g., onfido, manual)';
COMMENT ON COLUMN kyc_submissions.submission_type IS 'Type of verification: cip, kyc, document, photo, identity, watchlist';
COMMENT ON COLUMN kyc_submissions.status IS 'Verification status: pending, approved, rejected, review';
COMMENT ON COLUMN kyc_submissions.risk_level IS 'Risk assessment: low, medium, high';
COMMENT ON COLUMN kyc_submissions.verification_results IS 'Complete verification response from provider';
COMMENT ON COLUMN kyc_submissions.failure_reasons IS 'Array of reasons if verification failed';
