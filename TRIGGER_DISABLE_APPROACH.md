# Trigger Disable Approach to Fix is_paper_trading Error

## Problem
The `is_paper_trading` column error persists despite fixing all code references, suggesting the database trigger `handle_new_user` still has cached references to the old column.

## Solution: Temporary Trigger Disable

### 1. Migration: `20241209_disable_trigger_temporarily.sql`
- **Drops the trigger**: Removes `on_auth_user_created` trigger
- **Drops the function**: Removes `handle_new_user` function (clears any cached references)
- **Force drops old column**: Ensures `is_paper_trading` is completely removed
- **Ensures new column**: Adds `trading_mode` with proper constraints
- **Refreshes schema cache**: Forces PostgREST to reload schema

### 2. Updated Signup Edge Function
- **Manual profile creation**: Edge Function now creates profiles directly
- **Uses correct column names**: References `trading_mode` instead of `is_paper_trading`
- **Comprehensive error handling**: Better error reporting for profile creation

## Why This Approach Works

1. **Eliminates trigger conflicts**: No more competing profile creation processes
2. **Clears cached references**: Dropping and recreating removes any cached column references
3. **Direct control**: Edge Function has full control over profile creation
4. **Immediate feedback**: Any remaining column issues will be clearly visible in Edge Function logs

## Migration Steps

### Apply Migration
```sql
-- 1. Drop trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Fix schema
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_paper_trading;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trading_mode TEXT DEFAULT 'paper';

-- 3. Refresh cache
NOTIFY pgrst, 'reload schema';
```

### Updated Edge Function Flow
```typescript
// Create profile manually with correct column names
const { error: profileError } = await supabase
  .from('profiles')
  .insert({
    id: userId,
    username: body.username || body.email.split('@')[0],
    full_name: body.full_name,
    email: body.email,
    trading_mode: 'paper', // ✅ Correct column name
    share_trades: body.share_trades || false,
    show_asset_amounts: body.show_asset_amounts || false,
  })
```

## Expected Results

✅ No more "Could not find the 'is_paper_trading' column" errors  
✅ Profile creation handled entirely by Edge Function  
✅ Clear error messages if any issues remain  
✅ Signup process completes successfully  
✅ Users get proper `trading_mode` values  

## Testing Process

1. **Apply Migration**: Run `20241209_disable_trigger_temporarily.sql`
2. **Test Signup**: Create a new user account
3. **Check Logs**: Monitor Edge Function logs for profile creation
4. **Verify Database**: Confirm profile is created with `trading_mode` column
5. **No Errors**: Should see no more `is_paper_trading` references

## Future Considerations

Once the issue is resolved, we can:
1. **Recreate the trigger** with correct column names
2. **Revert Edge Function** to use trigger-based profile creation
3. **Add the trigger back** for automatic profile creation

This approach provides immediate resolution by eliminating the source of the cached column reference and giving us direct control over profile creation.