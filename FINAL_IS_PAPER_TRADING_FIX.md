# Final is_paper_trading Column Fix

## Problem
The signup process was failing with:
```
❌ Profile creation error: {
  code: "PGRST204",
  details: null,
  hint: null,
  message: "Could not find the 'is_paper_trading' column of 'profiles' in the schema cache"
}
```

## Root Cause
Multiple files across the codebase were still referencing the old `is_paper_trading` column instead of the new `trading_mode` column.

## Files Fixed

### 1. Edge Functions
- **`supabase/functions/_shared/auth.ts`**
  - Changed `.select('is_paper_trading')` to `.select('trading_mode')`
  - Changed `profile.is_paper_trading ? 'paper' : 'live'` to `profile.trading_mode || 'paper'`

- **`supabase/functions/signup-with-alpaca/index.ts`**
  - Removed `is_paper_trading: true` from profile creation
  - Kept only `trading_mode: 'paper'`

### 2. Database Files
- **`supabase/seed_data.sql`**
  - Changed column name in INSERT statements from `is_paper_trading` to `trading_mode`
  - Changed boolean values (`true`) to string values (`'paper'`)
  - Fixed ON CONFLICT UPDATE clauses

### 3. New Migration
- **`supabase/migrations/20241209_final_schema_cleanup.sql`**
  - Force drops `is_paper_trading` column if it exists
  - Ensures `trading_mode` column exists with proper constraints
  - Recreates `handle_new_user` function with correct column names
  - Includes schema verification to ensure fix is complete
  - Forces PostgREST schema cache refresh

## Migration Details

The final migration performs these operations:

1. **Force Column Removal**: `ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_paper_trading;`
2. **Ensure Correct Column**: Adds `trading_mode` with proper constraints
3. **Data Migration**: Updates any NULL values to 'paper'
4. **Function Recreation**: Recreates `handle_new_user` with correct column names
5. **Trigger Recreation**: Ensures trigger uses the updated function
6. **Cache Refresh**: Forces PostgREST to reload schema cache
7. **Verification**: Confirms the old column is gone and new column exists

## Expected Results After Migration

✅ `is_paper_trading` column completely removed from database  
✅ `trading_mode` column exists with proper constraints  
✅ `handle_new_user` function uses correct column names  
✅ PostgREST schema cache refreshed  
✅ No more "Could not find the 'is_paper_trading' column" errors  
✅ Signup process completes successfully  

## Testing Steps

1. **Apply Migration**: Run `20241209_final_schema_cleanup.sql`
2. **Verify Schema**: Check that `is_paper_trading` column is gone
3. **Test Signup**: Create a new user account
4. **Check Profile**: Verify profile is created with `trading_mode` column
5. **Monitor Logs**: Ensure no more column errors

## Database Verification Commands

```sql
-- Verify column structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check function definition
SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- Test profile creation (should work without errors)
SELECT * FROM public.profiles LIMIT 1;
```

## Files That Still Reference is_paper_trading (Documentation Only)

These files contain references in documentation/comments only and don't affect functionality:
- `DATABASE_SETUP.md`
- `COMPREHENSIVE_ALPACA_PERSISTENCE_FIX.md`
- `DATABASE_SCHEMA_FIX.md`
- Various backup migration files
- `README.md`

## Success Criteria

The fix is successful when:
1. No SQL errors about missing `is_paper_trading` column
2. User signup completes without profile creation errors
3. New users have `trading_mode` set to 'paper' by default
4. Database schema shows only `trading_mode` column, not `is_paper_trading`

This comprehensive fix addresses all remaining references to the old column and ensures the schema is completely migrated to use `trading_mode`.