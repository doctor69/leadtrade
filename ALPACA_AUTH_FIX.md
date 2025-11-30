# Alpaca Authentication Fix

## Problem
Getting 401 Unauthorized errors when calling Alpaca API from Edge Functions, even though user has valid Alpaca account in database.

## Root Cause
The `AlpacaClient` was using **Bearer token authentication** instead of **HTTP Basic authentication** as required by the Alpaca Broker API.

### Alpaca Broker API Requirements (from docs):
- **Authentication Method**: HTTP Basic authentication
- **Format**: `Authorization: Basic base64(API_KEY:API_SECRET)`
- **Paper Trading URL**: `https://broker-api.sandbox.alpaca.markets/v1`

### What We Were Doing (Incorrect):
```typescript
headers: {
  'Authorization': `Bearer ${this.authContext.alpacaAccessToken}`,
  'Content-Type': 'application/json',
}
```

### What We Should Be Doing (Correct):
```typescript
const credentials = `${apiKey}:${apiSecret}`
const encodedCredentials = btoa(credentials)

headers: {
  'Authorization': `Basic ${encodedCredentials}`,
  'Content-Type': 'application/json',
}
```

## Fixes Applied

### 1. Fixed Authentication Method
**File**: `supabase/functions/_shared/alpaca-client.ts`

**Before (Bearer Token)**:
```typescript
'Authorization': `Bearer ${this.authContext.alpacaAccessToken}`
```

**After (HTTP Basic)**:
```typescript
const apiKey = this.authContext.tradingMode === 'paper' 
  ? Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY')
  : Deno.env.get('PUBLIC_ALPACA_BROKER_LIVE_API_KEY')

const apiSecret = this.authContext.tradingMode === 'paper'
  ? Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET') 
  : Deno.env.get('PUBLIC_ALPACA_BROKER_LIVE_API_SECRET')

const credentials = `${apiKey}:${apiSecret}`
const encodedCredentials = btoa(credentials)

'Authorization': `Basic ${encodedCredentials}`
```

### 2. Fixed Base URLs
**Before**:
```typescript
this.baseUrl = 'https://paper-api.alpaca.markets'
```

**After**:
```typescript
this.baseUrl = 'https://broker-api.sandbox.alpaca.markets/v1'
```

### 3. Added Debugging
- Logs API key/secret availability
- Shows authentication method being used
- Helps troubleshoot credential issues

## Environment Variables Required

For paper trading (sandbox):
- `PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY`
- `PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET`

For live trading:
- `PUBLIC_ALPACA_BROKER_LIVE_API_KEY`
- `PUBLIC_ALPACA_BROKER_LIVE_API_SECRET`

## Expected Results

After this fix:
1. ✅ **Edge Functions authenticate correctly** with Alpaca Broker API
2. ✅ **Portfolio data loads** in dashboard
3. ✅ **Account information displays** correctly
4. ✅ **Trading operations work** (orders, positions, etc.)
5. ✅ **No more 401 Unauthorized errors**

## Testing

The dashboard should now:
- Load portfolio summary without errors
- Show account balance and buying power
- Display positions (if any)
- Allow placing orders
- Show portfolio history charts

## Debug Output

Check Edge Function logs for:
```
Alpaca API Request: {
  url: "https://broker-api.sandbox.alpaca.markets/v1/...",
  method: "GET",
  tradingMode: "paper",
  hasApiKey: true,
  hasApiSecret: true,
  authMethod: "Basic"
}
```

This fix aligns our authentication with Alpaca's Broker API requirements and should resolve all 401 authentication errors.