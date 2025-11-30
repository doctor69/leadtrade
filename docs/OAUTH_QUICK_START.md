# OAuth Quick Start Guide

## For Frontend Developers

### Installation

No installation needed - OAuth library is already included in the project.

### Import

```typescript
import {
  getOAuthClient,
  authorizeOAuth,
  issueOAuthToken,
  refreshOAuthToken,
  revokeOAuthToken,
  validateOAuthScope,
  hasOAuthPermission
} from '@/lib/alpaca-oauth'
```

### Basic Usage

#### 1. Get Client Information

```typescript
const result = await getOAuthClient('client_id_here')

if (result.success) {
  console.log('Client name:', result.client.name)
  console.log('Redirect URIs:', result.client.redirect_uris)
} else {
  console.error('Error:', result.error)
}
```

#### 2. Authorize User

```typescript
const result = await authorizeOAuth({
  client_id: 'client_id_here',
  redirect_uri: 'https://yourapp.com/callback',
  response_type: 'code',
  scope: 'account:read trading:write',
  state: 'random_state_string' // For CSRF protection
})

if (result.success) {
  // Redirect user with code
  const redirectUrl = `${redirect_uri}?code=${result.authorization.code}&state=${result.authorization.state}`
  window.location.href = redirectUrl
}
```

#### 3. Exchange Code for Token

```typescript
const result = await issueOAuthToken({
  grant_type: 'authorization_code',
  code: 'code_from_redirect',
  client_id: 'client_id_here',
  client_secret: 'client_secret_here',
  redirect_uri: 'https://yourapp.com/callback'
})

if (result.success) {
  // Store tokens securely
  const accessToken = result.token.access_token
  const refreshToken = result.token.refresh_token
  const expiresIn = result.token.expires_in // seconds
}
```

#### 4. Refresh Expired Token

```typescript
const result = await refreshOAuthToken(
  'client_id_here',
  'client_secret_here',
  'refresh_token_here'
)

if (result.success) {
  // Use new access token
  const newAccessToken = result.token.access_token
}
```

#### 5. Revoke Token

```typescript
const result = await revokeOAuthToken(
  'access_token_here',
  'access_token' // or 'refresh_token'
)

if (result.success) {
  console.log('Token revoked successfully')
}
```

### Scope Validation

#### Check if Scope is Valid

```typescript
const validation = validateOAuthScope('account:read trading:write invalid:scope')

if (!validation.valid) {
  console.log('Invalid scopes:', validation.invalidScopes)
  // ['invalid:scope']
}
```

#### Check if User Has Permission

```typescript
const grantedScope = 'account:read trading:read'
const hasPermission = hasOAuthPermission(grantedScope, 'trading:read')

if (hasPermission) {
  // User can perform trading read operations
}
```

### Available Scopes

```typescript
import { OAUTH_SCOPE_DESCRIPTIONS } from '@/lib/alpaca-oauth'

// Display scope descriptions to user
Object.entries(OAUTH_SCOPE_DESCRIPTIONS).forEach(([scope, description]) => {
  console.log(`${scope}: ${description}`)
})
```

| Scope | Description |
|-------|-------------|
| `account:read` | View account information and balances |
| `account:write` | Modify account settings and configurations |
| `trading:read` | View trading positions and order history |
| `trading:write` | Place and manage trades |
| `data:read` | Access market data and quotes |
| `funding:read` | View funding sources and transfer history |
| `funding:write` | Initiate deposits and withdrawals |

### Error Handling

All functions return a result object with `success` boolean:

```typescript
const result = await getOAuthClient('client_id')

if (result.success) {
  // Use result.client or result.token or result.authorization
} else {
  // Handle result.error
  console.error('Error:', result.error)
}
```

### OAuth Errors

OAuth-specific errors follow the OAuth 2.0 spec:

```typescript
const result = await authorizeOAuth(request)

if (!result.success && typeof result.error === 'object') {
  console.error('OAuth Error:', result.error.error)
  console.error('Description:', result.error.error_description)
}
```

Common OAuth error codes:
- `invalid_request` - Missing or invalid parameters
- `invalid_client` - Invalid client credentials
- `invalid_grant` - Invalid or expired authorization code
- `unauthorized_client` - Client not authorized
- `unsupported_grant_type` - Grant type not supported
- `invalid_scope` - Invalid or unknown scope

### TypeScript Types

All types are exported from `@/types/oauth`:

```typescript
import type {
  OAuthClient,
  OAuthAuthorizeRequest,
  OAuthAuthorizeResponse,
  OAuthTokenRequest,
  OAuthTokenResponse,
  OAuthError,
  OAuthScope
} from '@/types/oauth'
```

### Complete Example

```typescript
import { 
  getOAuthClient, 
  authorizeOAuth, 
  issueOAuthToken,
  validateOAuthScope 
} from '@/lib/alpaca-oauth'

async function handleOAuthFlow() {
  // Step 1: Validate scope
  const scopeValidation = validateOAuthScope('account:read trading:write')
  if (!scopeValidation.valid) {
    console.error('Invalid scopes:', scopeValidation.invalidScopes)
    return
  }

  // Step 2: Get client details
  const clientResult = await getOAuthClient('client_123')
  if (!clientResult.success) {
    console.error('Failed to get client:', clientResult.error)
    return
  }

  console.log('Authorizing with:', clientResult.client.name)

  // Step 3: Authorize
  const authResult = await authorizeOAuth({
    client_id: 'client_123',
    redirect_uri: 'https://app.example.com/callback',
    response_type: 'code',
    scope: 'account:read trading:write',
    state: crypto.randomUUID() // Generate random state
  })

  if (!authResult.success) {
    console.error('Authorization failed:', authResult.error)
    return
  }

  // Step 4: Exchange code for token
  const tokenResult = await issueOAuthToken({
    grant_type: 'authorization_code',
    code: authResult.authorization.code,
    client_id: 'client_123',
    client_secret: 'secret_abc',
    redirect_uri: 'https://app.example.com/callback'
  })

  if (!tokenResult.success) {
    console.error('Token issuance failed:', tokenResult.error)
    return
  }

  // Success! Store tokens securely
  console.log('Access token:', tokenResult.token.access_token)
  console.log('Expires in:', tokenResult.token.expires_in, 'seconds')
  
  // Store in secure storage (not localStorage for production!)
  sessionStorage.setItem('oauth_access_token', tokenResult.token.access_token)
  if (tokenResult.token.refresh_token) {
    sessionStorage.setItem('oauth_refresh_token', tokenResult.token.refresh_token)
  }
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react'
import { getOAuthClient } from '@/lib/alpaca-oauth'
import type { OAuthClient } from '@/types/oauth'

export function useOAuthClient(clientId: string) {
  const [client, setClient] = useState<OAuthClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClient() {
      setLoading(true)
      const result = await getOAuthClient(clientId)
      
      if (result.success) {
        setClient(result.client!)
        setError(null)
      } else {
        setError(result.error!)
        setClient(null)
      }
      
      setLoading(false)
    }

    fetchClient()
  }, [clientId])

  return { client, loading, error }
}

// Usage in component
function OAuthClientInfo({ clientId }: { clientId: string }) {
  const { client, loading, error } = useOAuthClient(clientId)

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!client) return null

  return (
    <div>
      <h2>{client.name}</h2>
      <p>{client.description}</p>
      {client.logo_uri && <img src={client.logo_uri} alt={client.name} />}
    </div>
  )
}
```

### Testing

The OAuth library includes comprehensive tests:

```bash
npm run test -- src/lib/__tests__/alpaca-oauth.test.ts --run
```

### Need Help?

- **Documentation**: See `docs/OAUTH_CLIENT_MANAGEMENT.md`
- **Types**: Check `src/types/oauth.ts`
- **Examples**: Look at `src/lib/__tests__/alpaca-oauth.test.ts`
- **Edge Function**: Review `supabase/functions/alpaca-oauth/index.ts`

### Security Best Practices

1. **Never expose client secrets** in frontend code
2. **Always use HTTPS** for redirect URIs
3. **Validate state parameter** to prevent CSRF attacks
4. **Store tokens securely** (not in localStorage for production)
5. **Implement token refresh** before expiration
6. **Revoke tokens** when user logs out
7. **Use minimal scopes** - only request what you need
8. **Validate scopes** before making API calls

### Common Pitfalls

❌ **Don't** store client secrets in frontend  
✅ **Do** keep secrets on server-side only

❌ **Don't** use HTTP redirect URIs  
✅ **Do** use HTTPS for all redirect URIs

❌ **Don't** skip state parameter validation  
✅ **Do** always validate state matches

❌ **Don't** store tokens in localStorage  
✅ **Do** use secure storage (httpOnly cookies, sessionStorage)

❌ **Don't** request all scopes  
✅ **Do** request only needed scopes

❌ **Don't** ignore token expiration  
✅ **Do** implement automatic token refresh
