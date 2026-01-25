# Funding Buttons Fix - Complete

## Issue
ACH, Bank, and Funding Wallet buttons were not working - they were calling Alpaca API directly instead of using Supabase Edge Functions, causing authentication and CORS errors.

## Root Cause
Three client libraries were bypassing the authentication layer:
- `src/lib/alpaca-ach-relationships.ts` - Direct Alpaca API calls
- `src/lib/alpaca-bank-relationships.ts` - Wrong environment variable
- `src/lib/alpaca-funding-wallets.ts` - Direct Alpaca API calls

## Solution
Updated all three libraries to use Supabase Edge Functions with proper authentication.

## Files Changed

### 1. `src/lib/alpaca-ach-relationships.ts`
- Removed direct Alpaca Broker API calls
- Updated to use `/functions/v1/alpaca-ach-relationships` edge function
- Functions fixed: `createACHRelationship()`, `listACHRelationships()`, `deleteACHRelationship()`

### 2. `src/lib/alpaca-bank-relationships.ts`
- Fixed environment variable: `SUPABASE_URL` → `PUBLIC_SUPABASE_URL`
- All functions now properly call edge functions

### 3. `src/lib/alpaca-funding-wallets.ts`
- Replaced `makeAlpacaRequest()` with `makeEdgeFunctionRequest()`
- Updated all 8 functions to use `/functions/v1/alpaca-funding-wallets` edge function

## Testing Required

Users should now be able to:
- ✅ Add ACH relationships (bank accounts)
- ✅ Add bank relationships (for wire transfers)
- ✅ Create funding wallets
- ✅ View payment instructions
- ✅ Manage recipient banks
- ✅ Create withdrawals

## Status
✅ All fixes applied and verified - no TypeScript errors
