-- Create account_documents table for storing document metadata
CREATE TABLE IF NOT EXISTS account_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_document_id TEXT UNIQUE,
  document_type TEXT NOT NULL CHECK (document_type IN ('identity_verification', 'address_verification', 'w8ben', 'other')),
  document_sub_type TEXT,
  mime_type TEXT CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
  file_size_bytes INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'verified', 'rejected', 'failed')),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT file_size_limit CHECK (file_size_bytes IS NULL OR file_size_bytes <= 10485760)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_account_documents_account_id ON account_documents(account_id);
CREATE INDEX IF NOT EXISTS idx_account_documents_alpaca_id ON account_documents(alpaca_document_id) WHERE alpaca_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_documents_type ON account_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_account_documents_status ON account_documents(status);
CREATE INDEX IF NOT EXISTS idx_account_documents_account_type ON account_documents(account_id, document_type);
CREATE INDEX IF NOT EXISTS idx_account_documents_uploaded_at ON account_documents(uploaded_at DESC);

-- Enable Row Level Security
ALTER TABLE account_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own documents
CREATE POLICY "Users can view their own documents"
  ON account_documents
  FOR SELECT
  USING (auth.uid() = account_id);

-- Users can insert their own documents
CREATE POLICY "Users can insert their own documents"
  ON account_documents
  FOR INSERT
  WITH CHECK (auth.uid() = account_id);

-- Users can update their own documents
CREATE POLICY "Users can update their own documents"
  ON account_documents
  FOR UPDATE
  USING (auth.uid() = account_id)
  WITH CHECK (auth.uid() = account_id);

-- Users can delete their own documents
CREATE POLICY "Users can delete their own documents"
  ON account_documents
  FOR DELETE
  USING (auth.uid() = account_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_account_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_documents_updated_at
  BEFORE UPDATE ON account_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_account_documents_updated_at();

-- Add comment
COMMENT ON TABLE account_documents IS 'Stores metadata for documents uploaded to Alpaca for KYC and compliance';
