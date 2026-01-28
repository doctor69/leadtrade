-- OAuth Client Management Schema
-- Stores OAuth authorizations and access tokens for third-party integrations
-- Requirements: 14.1, 14.2, 14.3, 14.4, 14.5

-- OAuth Authorizations Table
-- Stores authorization codes generated during OAuth flow
CREATE TABLE IF NOT EXISTS oauth_authorizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth Access Tokens Table
-- Stores issued access tokens and refresh tokens
CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  access_token TEXT NOT NULL UNIQUE,
  refresh_token TEXT UNIQUE,
  scope TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_oauth_authorizations_user_id ON oauth_authorizations(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_authorizations_client_id ON oauth_authorizations(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_authorizations_code ON oauth_authorizations(code);
CREATE INDEX IF NOT EXISTS idx_oauth_authorizations_expires_at ON oauth_authorizations(expires_at);

CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_user_id ON oauth_access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_client_id ON oauth_access_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_access_token ON oauth_access_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_refresh_token ON oauth_access_tokens(refresh_token);
CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_expires_at ON oauth_access_tokens(expires_at);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE oauth_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_access_tokens ENABLE ROW LEVEL SECURITY;

-- OAuth Authorizations Policies
-- Users can only view their own authorizations
CREATE POLICY "Users can view own oauth authorizations"
  ON oauth_authorizations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own authorizations
CREATE POLICY "Users can insert own oauth authorizations"
  ON oauth_authorizations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own authorizations (to mark as used)
CREATE POLICY "Users can update own oauth authorizations"
  ON oauth_authorizations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- OAuth Access Tokens Policies
-- Users can only view their own access tokens
CREATE POLICY "Users can view own oauth access tokens"
  ON oauth_access_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own access tokens
CREATE POLICY "Users can insert own oauth access tokens"
  ON oauth_access_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own access tokens (to revoke)
CREATE POLICY "Users can update own oauth access tokens"
  ON oauth_access_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to clean up expired authorizations
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_authorizations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM oauth_authorizations
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$;

-- Function to clean up expired access tokens
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM oauth_access_tokens
  WHERE expires_at < NOW() - INTERVAL '30 days'
  AND revoked = TRUE;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE oauth_authorizations IS 'Stores OAuth authorization codes for third-party integrations';
COMMENT ON TABLE oauth_access_tokens IS 'Stores OAuth access tokens and refresh tokens';

COMMENT ON COLUMN oauth_authorizations.code IS 'Authorization code for token exchange (expires in 10 minutes)';
COMMENT ON COLUMN oauth_authorizations.scope IS 'Space-separated list of granted scopes';
COMMENT ON COLUMN oauth_authorizations.used IS 'Whether the authorization code has been exchanged for a token';

COMMENT ON COLUMN oauth_access_tokens.access_token IS 'OAuth access token for API authentication';
COMMENT ON COLUMN oauth_access_tokens.refresh_token IS 'OAuth refresh token for obtaining new access tokens';
COMMENT ON COLUMN oauth_access_tokens.scope IS 'Space-separated list of granted scopes';
COMMENT ON COLUMN oauth_access_tokens.revoked IS 'Whether the token has been revoked';
