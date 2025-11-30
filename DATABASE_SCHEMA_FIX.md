# Database Schema Column Fix

## Problem Identified

The application was throwing the error:
```
{"success": false,"error": "Failed to fetch user profile: column profiles.is_paper_trading does not exist","code": "DATABASE_ERROR"}
```

## Root Cause Analysis

There was a **database schema inconsistency** between:

1. **Database Schema**: Uses `trading_mode` column with values `'paper' | 'live'`
2. **Application Code**: Was referencing `is_paper_trading` boolean column

### Database Schema (Correct)
```sql
CREATE TABLE public.profiles (
  -- ... other columns
  trading_mode TEXT DEFAULT 'paper' CHECK (trading_mode IN ('paper', 'live')),
  -- ... other columns
);
```

### Application Code (Incorrect)
```typescript
// BEFORE (BROKEN)
const { data: profile } = await supabase
  .from('profiles')
  .select('is_paper_trading')  // ❌ Column doesn't exist
  .eq('id', userId)
  .single();

const tradingMode = profile?.is_paper_trading ? 'paper' : 'live';
```

## Files Fixed

### 1. `src/lib/portfolio-calculator.ts`
**Before:**
```typescript
.select('is_paper_trading')
const tradingMode = profile?.is_paper_trading ? 'paper' : 'live';
```

**After:**
```typescript
.select('trading_mode')
const tradingMode = profile?.trading_mode || 'paper';
```

### 2. `src/lib/auth.ts`
**Before:**
```typescript
isPaperTrading: profile?.is_paper_trading,
```

**After:**
```typescript
isPaperTrading: profile?.trading_mode === 'paper',
```

### 3. `src/hooks/useTradingMode.ts`
**Before:**
```typescript
if (payload.new && 'is_paper_trading' in payload.new) {
  const newMode: TradingMode = payload.new.is_paper_trading ? 'paper' : 'live';
}
```

**After:**
```typescript
if (payload.new && 'trading_mode' in payload.new) {
  const newMode: TradingMode = payload.new.trading_mode || 'paper';
}
```

### 4. `src/types/trading.ts`
**Before:**
```typescript
interface UserProfile {
  is_paper_trading: boolean;
}
```

**After:**
```typescript
interface UserProfile {
  trading_mode: 'paper' | 'live';
}
```

### 5. Test Files Updated
- `src/lib/__tests__/test-utils.ts`
- `src/lib/__tests__/database.test.ts`
- `src/lib/__tests__/trade-execution-engine.test.ts`
- `src/lib/__tests__/integration-api.test.ts`

All changed from:
```typescript
is_paper_trading: true/false
```

To:
```typescript
trading_mode: 'paper'/'live'
```

## Database Schema Consistency

The fix ensures consistency with the actual database schema:

### Current Schema (Correct)
```sql
-- profiles table
trading_mode TEXT DEFAULT 'paper' CHECK (trading_mode IN ('paper', 'live'))

-- alpaca_accounts table  
account_type TEXT DEFAULT 'paper' CHECK (account_type IN ('paper', 'live'))
```

### Application Logic (Now Fixed)
```typescript
// Consistent with database schema
const tradingMode: 'paper' | 'live' = profile?.trading_mode || 'paper';
const isPaperTrading = tradingMode === 'paper';
```

## Benefits of the Fix

1. **✅ Eliminates Database Errors**: No more "column does not exist" errors
2. **✅ Type Safety**: Proper TypeScript types matching database schema
3. **✅ Consistency**: All code now uses the same column names as database
4. **✅ Maintainability**: Single source of truth for trading mode representation
5. **✅ Test Coverage**: All tests updated to use correct schema

## Verification

After this fix:
- ✅ User profiles load correctly
- ✅ Trading mode detection works
- ✅ Portfolio calculations function properly
- ✅ Real-time updates work via WebSocket subscriptions
- ✅ All tests pass with correct schema

## Summary

The fix resolves the database schema mismatch by:
1. **Updating all code references** from `is_paper_trading` to `trading_mode`
2. **Maintaining backward compatibility** in the application logic
3. **Ensuring type safety** with proper TypeScript interfaces
4. **Updating all test files** to use the correct schema

This ensures the application works correctly with the actual database schema and eliminates the "column does not exist" errors.