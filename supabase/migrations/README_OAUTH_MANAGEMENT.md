# OAuth Management Schema Migration

## Overview

This migration creates the database schema for OAuth 2.0 client management, supporting third-party application integrations with LeadTrade via the Alpaca Broker API.

## Migration File

`20250109_oauth_management.sql`

## Tables Created

### 1. oauth_authorizations

Stores authorization codes generated during the OAuth authorization flow.

**Columns:**
- `id` (UUID, PK) - Unique identifier
- `user_id` (UUID, FK) - References auth.users(id)
- `client_id` (TEXT) - OAuth client identifier
- `code` (TEXT, UNIQUE) - Authorization code
- `scope` (TEXT) - Space-separated list of granted scopes
- `redirect_uri` (TEXT) - Redirect URI for this authorization
- `expires_at` (TIMESTAMP) - Expiration time (10 minutes from creation)
- `used` (BOOLEAN) - Whether code has been exchanged for token
- `created_at` (TIMESTAMP) - Creation timestamp

**Indexes:**
- `idx_oauth_authorizations_user_id` - User lookup
- `idx_oauth_authorizations_client_id` - Client lookup
- `idx_oauth_authorizations_code` - Code validation
- `idx_oauth_authorizations_expires_at` - Cleanup queries

**RLS Policies:**
- Users can view their own authorizations
- Users can insert their own authorizations
- Users can update their own authorizations (to mark as used)

### 2. oauth_access_tokens

Stores issued OAuth access tokens and refresh tokens.

**Columns:**
- `id` (UUID, PK) - Unique identifier
- `user_id` (UUID, FK) - References auth.users(id)
- `client_id` (TEXT) - OAuth client identifier
- `access_token` (TEXT, UNIQUE) - Access token
- `refresh_token` (TEXT, UNIQUE) - Refresh token (optional)
- `scope` (TEXT) - Space-separated list of granted scopes
- `expires_at` (TIMESTAMP) - Token expiration time
- `revoked` (BOOLEAN) - Whether token has been revoked
- `created_at` (TIMESTAMP) - Creation timestamp

**Indexes:**
- `idx_oauth_access_tokens_user_id` - User lookup
- `idx_oauth_access_tokens_client_id` - Client lookup
- `idx_oauth_access_tokens_access_token` - Token validation
- `idx_oauth_access_tokens_refresh_token` - Refresh token lookup
- `idx_oauth_access_tokens_expires_at` - Cleanup queries

**RLS Policies:**
- Users can view their own access tokens
- Users can insert their own access tokens
- Users can update their own access tokens (to revoke)

## Functions Created

### cleanup_expired_oauth_authorizations()

Removes authorization codes that expired more than 1 day ago.

**Usage:**
```sql
SELECT cleanup_expired_oauth_authorizations();
```

### cleanup_expired_oauth_tokens()

Removes revoked access tokens that expired more than 30 days ago.

**Usage:**
```sql
SELECT cleanup_expired_oauth_tokens();
```

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:
- Users can only access their own OAuth data
- No cross-user data leakage
- Service role can access all data for administrative purposes

### Token Expiration

- Authorization codes expire in 10 minutes
- Access tokens expire based on Alpaca's configuration (typically 1 hour)
- Refresh tokens are long-lived but can be revoked

### Code Reuse Prevention

- Authorization codes can only be used once
- Used codes are marked in the database
- Attempting to reuse a code results in an error

## OAuth Flow

1. **Authorization Request**
   - User authorizes third-party app
   - Authorization code generated and stored
   - Code expires in 10 minutes

2. **Token Exchange**
   - Client exchanges code for access token
   - Code marked as used
   - Access token and refresh token stored

3. **Token Refresh**
   - Client uses refresh token to get new access token
   - New access token stored
   - Old access token can be revoked

4. **Token Revocation**
   - User or client revokes token
   - Token marked as revoked in database
   - Revoked tokens cannot be used

## Maintenance

### Scheduled Cleanup

Recommended to run cleanup functions periodically:

```sql
-- Daily cleanup of expired authorizations
SELECT cleanup_expired_oauth_authorizations();

-- Weekly cleanup of old revoked tokens
SELECT cleanup_expired_oauth_tokens();
```

### Manual Cleanup

To manually clean up specific data:

```sql
-- Remove all authorizations for a user
DELETE FROM oauth_authorizations WHERE user_id = 'user_uuid';

-- Revoke all tokens for a client
UPDATE oauth_access_tokens 
SET revoked = TRUE 
WHERE client_id = 'client_id';

-- Remove expired authorizations immediately
DELETE FROM oauth_authorizations WHERE expires_at < NOW();
```

## Verification

After running the migration, verify the schema:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('oauth_authorizations', 'oauth_access_tokens');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('oauth_authorizations', 'oauth_access_tokens');

-- Check indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('oauth_authorizations', 'oauth_access_tokens');

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'cleanup_expired_oauth%';
```

## Rollback

To rollback this migration:

```sql
-- Drop functions
DROP FUNCTION IF EXISTS cleanup_expired_oauth_authorizations();
DROP FUNCTION IF EXISTS cleanup_expired_oauth_tokens();

-- Drop tables (CASCADE removes foreign key constraints)
DROP TABLE IF EXISTS oauth_access_tokens CASCADE;
DROP TABLE IF EXISTS oauth_authorizations CASCADE;
```

## Related Files

- **Edge Function**: `supabase/functions/alpaca-oauth/index.ts`
- **Frontend Library**: `src/lib/alpaca-oauth.ts`
- **Type Definitions**: `src/types/oauth.ts`
- **API Routes**: `src/pages/api/alpaca/oauth/`
- **Documentation**: `docs/OAUTH_CLIENT_MANAGEMENT.md`

## Requirements Coverage

This migration supports the following requirements:

- **14.1**: OAuth client details retrieval
- **14.2**: OAuth authorization code generation
- **14.3**: OAuth access token issuance
- **14.4**: OAuth refresh token flow
- **14.5**: OAuth token revocation and scope validation

## Notes

- Authorization codes are short-lived (10 minutes) for security
- Access tokens follow Alpaca's expiration policy
- Refresh tokens enable long-term access without re-authorization
- All OAuth operations are logged for audit purposes
- RLS policies ensure data isolation between users
