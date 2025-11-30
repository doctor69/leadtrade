# OAuth Client Management

Complete implementation of OAuth 2.0 authorization flow for third-party integrations with LeadTrade via Alpaca Broker API.

## Overview

The OAuth implementation allows third-party applications to access LeadTrade user accounts with explicit user authorization. It follows the OAuth 2.0 Authorization Code flow with support for refresh tokens.

## Requirements Coverage

- **14.1**: Get OAuth client details for authorization page
- **14.2**: Authorize OAuth requests and generate authorization codes
- **14.3**: Issue OAuth access tokens via authorization code grant
- **14.4**: Refresh OAuth access tokens using refresh tokens
- **14.5**: Revoke OAuth access tokens and enforce scope validation

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Third-Party│         │   LeadTrade  │         │   Alpaca    │
│     App     │────────▶│   OAuth API  │────────▶│  Broker API │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                        │
      │  1. Authorization      │                        │
      │     Request            │                        │
      │◀───────────────────────│                        │
      │                        │                        │
      │  2. User Consent       │                        │
      │────────────────────────▶                        │
      │                        │                        │
      │  3. Authorization      │  4. Validate Client    │
      │     Code               │────────────────────────▶
      │◀───────────────────────│◀───────────────────────│
      │                        │                        │
      │  5. Token Request      │  6. Issue Token        │
      │────────────────────────▶────────────────────────▶
      │                        │                        │
      │  7. Access Token       │                        │
      │◀───────────────────────│◀───────────────────────│
```

## Implementation

### 1. Edge Function

**Location**: `supabase/functions/alpaca-oauth/index.ts`

Handles all OAuth operations:
- Get client details
- Authorize requests
- Issue tokens
- Revoke tokens

### 2. Frontend Library

**Location**: `src/lib/alpaca-oauth.ts`

Provides client-side functions that call Supabase Edge Functions:
- `getOAuthClient(clientId)` - Get client metadata
- `authorizeOAuth(request)` - Generate authorization code
- `issueOAuthToken(request)` - Exchange code for token
- `refreshOAuthToken(...)` - Refresh access token
- `revokeOAuthToken(token)` - Revoke token
- `validateOAuthScope(scope)` - Validate scope string
- `hasOAuthPermission(granted, required)` - Check permissions

All functions use the Supabase client to call Edge Functions with proper authentication.

### 4. Database Schema

**Location**: `supabase/migrations/20250109_oauth_management.sql`

Tables:
- `oauth_authorizations` - Authorization codes
- `oauth_access_tokens` - Access and refresh tokens

## OAuth Scopes

| Scope | Description | Required |
|-------|-------------|----------|
| `account:read` | View account information and balances | No |
| `account:write` | Modify account settings | No |
| `trading:read` | View positions and order history | No |
| `trading:write` | Place and manage trades | No |
| `data:read` | Access market data | No |
| `funding:read` | View funding sources | No |
| `funding:write` | Initiate deposits/withdrawals | No |

## Usage Examples

### 1. Get OAuth Client Details

```typescript
import { getOAuthClient } from '@/lib/alpaca-oauth'

const result = await getOAuthClient('client_123')

if (result.success) {
  console.log('Client:', result.client)
  // {
  //   id: 'client_123',
  //   name: 'My Trading App',
  //   redirect_uris: ['https://app.example.com/callback'],
  //   logo_uri: 'https://app.example.com/logo.png',
  //   description: 'A trading application'
  // }
}
```

### 2. Authorize OAuth Request

```typescript
import { authorizeOAuth } from '@/lib/alpaca-oauth'

const result = await authorizeOAuth({
  client_id: 'client_123',
  redirect_uri: 'https://app.example.com/callback',
  response_type: 'code',
  scope: 'account:read trading:read trading:write',
  state: 'random_state_string'
})

if (result.success) {
  console.log('Authorization code:', result.authorization.code)
  // Redirect user to: redirect_uri?code={code}&state={state}
}
```

### 3. Exchange Authorization Code for Token

```typescript
import { issueOAuthToken } from '@/lib/alpaca-oauth'

const result = await issueOAuthToken({
  grant_type: 'authorization_code',
  code: 'auth_code_from_redirect',
  client_id: 'client_123',
  client_secret: 'client_secret_xyz',
  redirect_uri: 'https://app.example.com/callback'
})

if (result.success) {
  console.log('Access token:', result.token.access_token)
  console.log('Refresh token:', result.token.refresh_token)
  console.log('Expires in:', result.token.expires_in, 'seconds')
}
```

### 4. Refresh Access Token

```typescript
import { refreshOAuthToken } from '@/lib/alpaca-oauth'

const result = await refreshOAuthToken(
  'client_123',
  'client_secret_xyz',
  'refresh_token_abc'
)

if (result.success) {
  console.log('New access token:', result.token.access_token)
}
```

### 5. Revoke Token

```typescript
import { revokeOAuthToken } from '@/lib/alpaca-oauth'

const result = await revokeOAuthToken(
  'access_token_to_revoke',
  'access_token'
)

if (result.success) {
  console.log('Token revoked successfully')
}
```

### 6. Validate Scopes

```typescript
import { validateOAuthScope, hasOAuthPermission } from '@/lib/alpaca-oauth'

// Validate scope string
const validation = validateOAuthScope('account:read trading:write invalid:scope')
if (!validation.valid) {
  console.log('Invalid scopes:', validation.invalidScopes)
  // ['invalid:scope']
}

// Check permissions
const hasPermission = hasOAuthPermission(
  'account:read trading:read',
  'trading:read'
)
console.log('Has permission:', hasPermission) // true
```

## Authorization Flow

### Step 1: Client Requests Authorization

Third-party app redirects user to LeadTrade authorization page:

```
https://leadtrade.app/oauth/authorize?
  client_id=client_123&
  redirect_uri=https://app.example.com/callback&
  response_type=code&
  scope=account:read trading:write&
  state=random_state
```

### Step 2: User Grants Permission

User reviews requested scopes and approves/denies access.

### Step 3: Authorization Code Issued

LeadTrade redirects back to client with authorization code:

```
https://app.example.com/callback?
  code=auth_code_xyz&
  state=random_state
```

### Step 4: Client Exchanges Code for Token

Client makes server-side request to Supabase Edge Function:

```bash
POST https://your-project.supabase.co/functions/v1/alpaca-oauth/token
Content-Type: application/json
Authorization: Bearer YOUR_SUPABASE_TOKEN

{
  "grant_type": "authorization_code",
  "code": "auth_code_xyz",
  "client_id": "client_123",
  "client_secret": "client_secret_abc",
  "redirect_uri": "https://app.example.com/callback"
}
```

Response:

```json
{
  "success": true,
  "token": {
    "access_token": "eyJhbGc...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "refresh_token": "refresh_xyz",
    "scope": "account:read trading:write"
  }
}
```

### Step 5: Client Uses Access Token

Client makes API requests with access token to Alpaca API endpoints via Edge Functions.

### Step 6: Refresh Token When Expired

When access token expires, use refresh token via Edge Function:

```bash
POST https://your-project.supabase.co/functions/v1/alpaca-oauth/token
Content-Type: application/json
Authorization: Bearer YOUR_SUPABASE_TOKEN

{
  "grant_type": "refresh_token",
  "refresh_token": "refresh_xyz",
  "client_id": "client_123",
  "client_secret": "client_secret_abc"
}
```

## Security Considerations

### Authorization Code Security

- Codes expire in 10 minutes
- Codes can only be used once
- Codes are tied to specific redirect URI
- State parameter prevents CSRF attacks

### Token Security

- Access tokens expire (typically 1 hour)
- Refresh tokens are long-lived but can be revoked
- Tokens are stored encrypted in database
- RLS policies ensure users can only access their own tokens

### Scope Validation

- Scopes are validated on authorization
- API endpoints check token scopes before allowing access
- Invalid scopes result in 403 Forbidden errors

### Client Authentication

- Client secret required for token issuance
- Client credentials never exposed to user
- Redirect URIs must be pre-registered

## Error Handling

### OAuth Errors

Standard OAuth 2.0 error responses:

```json
{
  "error": "invalid_request",
  "error_description": "Missing required parameter: code"
}
```

Common error codes:
- `invalid_request` - Missing or invalid parameters
- `invalid_client` - Invalid client credentials
- `invalid_grant` - Invalid or expired authorization code
- `unauthorized_client` - Client not authorized for grant type
- `unsupported_grant_type` - Grant type not supported
- `invalid_scope` - Invalid or unknown scope

### API Errors

```json
{
  "success": false,
  "error": "Failed to authorize OAuth request"
}
```

## Database Cleanup

Expired authorizations and revoked tokens are automatically cleaned up:

```sql
-- Clean up expired authorizations (older than 1 day)
SELECT cleanup_expired_oauth_authorizations();

-- Clean up revoked tokens (older than 30 days)
SELECT cleanup_expired_oauth_tokens();
```

## Testing

### Manual Testing

1. Get client details:
```bash
curl -X GET \
  https://your-project.supabase.co/functions/v1/alpaca-oauth/clients/client_123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. Authorize request:
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/alpaca-oauth/authorize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client_123",
    "redirect_uri": "https://app.example.com/callback",
    "response_type": "code",
    "scope": "account:read trading:write"
  }'
```

3. Issue token:
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/alpaca-oauth/token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTH_CODE",
    "client_id": "client_123",
    "client_secret": "client_secret_xyz",
    "redirect_uri": "https://app.example.com/callback"
  }'
```

## Integration with Alpaca

The OAuth implementation proxies requests to Alpaca's OAuth endpoints:

- `GET /v1/oauth/clients/{client_id}` → Alpaca Broker API
- `POST /v1/oauth/authorize` → Alpaca Broker API
- `POST /v1/oauth/token` → Alpaca Broker API
- `POST /v1/oauth/revoke` → Alpaca Broker API

All OAuth operations are performed on behalf of the authenticated user's Alpaca account.

## Next Steps

1. Create UI components for OAuth authorization page
2. Implement OAuth client registration (if needed)
3. Add OAuth token management to user settings
4. Create developer documentation for third-party integrations
5. Implement rate limiting for OAuth endpoints
