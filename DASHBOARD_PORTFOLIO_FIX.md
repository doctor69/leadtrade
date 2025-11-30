# Dashboard Portfolio Data Fix

## Problem
Dashboard showing "Unable to load portfolio data - Please check your connection to Alpaca" even though Alpaca account data is saved in the database.

## Root Cause Analysis

The issue was in the **authentication flow** for Edge Functions:

1. **Dashboard** calls `apiService.getAccount()`
2. **apiService** calls `alpaca-account` Edge Function
3. **alpaca-account** uses `withAuth()` to get user's Alpaca account ID
4. **withAuth()** queries `alpaca_accounts` table but uses wrong column name ❌

### The Column Name Mismatch

**Auth function was selecting:**
```sql
SELECT alpaca_account_id, alpaca_account_number, alpaca_account_status
FROM alpaca_accounts 
WHERE user_id = ?
```

**But the actual database column is:**
```sql
-- Correct column name is 'account_status', not 'alpaca_account_status'
SELECT alpaca_account_id, alpaca_account_number, account_status
FROM alpaca_accounts 
WHERE user_id = ?
```

## The Fix

**Fixed in `supabase/functions/_shared/auth.ts`:**

**Before (Broken):**
```typescript
.select('alpaca_account_id, alpaca_account_number, alpaca_account_status')
// ...
alpacaAccountStatus: alpacaAccount.alpaca_account_status
```

**After (Fixed):**
```typescript
.select('alpaca_account_id, alpaca_account_number, account_status')
// ...
alpacaAccountStatus: alpacaAccount.account_status
```

## Why This Caused the Error

1. **Database query failed** due to non-existent column `alpaca_account_status`
2. **Auth function returned error** "Alpaca account not found"
3. **Edge Function failed** with authentication error
4. **Dashboard showed** "Unable to load portfolio data"

## Expected Result After Fix

Now the complete flow should work:

1. ✅ **User logs in** with Alpaca account in database
2. ✅ **Dashboard loads** and calls `apiService.getAccount()`
3. ✅ **Auth function** successfully finds Alpaca account with correct column name
4. ✅ **Edge Function** gets user's Alpaca account ID and makes API call
5. ✅ **Portfolio data loads** and displays in dashboard
6. ✅ **User sees** their account balance, positions, and trading data

## Files Modified

- **`supabase/functions/_shared/auth.ts`**: Fixed column name from `alpaca_account_status` to `account_status`

## Testing

After this fix, the dashboard should:
- ✅ Load portfolio data successfully
- ✅ Show account balance and buying power
- ✅ Display positions (if any)
- ✅ Show trading history
- ✅ Allow placing orders

This was another instance of the `is_paper_trading` → `trading_mode` column rename issue, but this time affecting the `account_status` column in the authentication flow.