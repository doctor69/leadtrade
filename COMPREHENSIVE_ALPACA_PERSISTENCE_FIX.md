# Comprehensive Alpaca Persistence Fix

## Problem Summary
Alpaca credentials were not being saved to the `alpaca_accounts` table after signup, even though the data appeared in logs.

## Root Causes Identified & Fixed

### 1. Database Schema Mismatch
**Issue**: Edge Functions were trying to access non-existent tables and columns
**Fixes**:
- Removed `user_portfolios` table creation from signup Edge Function (table doesn't exist)
- Changed `is_paper_trading` to `trading_mode` in profile creation
- Fixed column name from `alpaca_account_status` to `account_status`

### 2. Missing RLS Policy
**Issue**: Service role couldn't insert into `alpaca_accounts` table
**Fix**: Added service role policy in migration `20241209_fix_alpaca_accounts_rls.sql`

### 3. Manual Timestamp Conflicts
**Issue**: Manual timestamp setting conflicted with database triggers
**Fix**: Removed manual `created_at` and `updated_at` setting

## Files Modified

### 1. `supabase/functions/signup/index.ts`
- ✅ Removed non-existent `user_portfolios` table operations
- ✅ Fixed profile creation to use `trading_mode` instead of `is_paper_trading`
- ✅ Removed manual timestamp setting
- ✅ Added environment variable logging
- ✅ Added Supabase client initialization confirmation

### 2. `supabase/functions/create-alpaca-account/index.ts`
- ✅ Fixed column name from `alpaca_account_status` to `account_status`
- ✅ Added comprehensive debugging logs
- ✅ Added user_id presence check
- ✅ Added Alpaca account creation details logging
- ✅ Added database insertion data logging
- ✅ Added fallback logging when user_id is missing
- ✅ Enhanced error reporting

### 3. `src/components/SupabaseSignUpForm.tsx`
- ✅ Enhanced error handling for database insertion failures
- ✅ Added specific error messages for database issues
- ✅ Added success confirmation for database storage

### 4. `supabase/schema.sql`
- ✅ Added service role policy for `alpaca_accounts` table

### 5. `supabase/migrations/20241209_fix_alpaca_accounts_rls.sql`
- ✅ Created migration to add service role policy

## Debugging Added

### Environment & Initialization Checks
```javascript
console.log('🔧 Environment check:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  supabaseUrl: supabaseUrl
})
console.log('✅ Supabase client initialized with service role')
```

### User ID Validation
```javascript
console.log('🔍 Checking if user_id is provided for database storage:', {
  user_id: body.user_id,
  hasUserId: !!body.user_id
})
```

### Database Insertion Tracking
```javascript
console.log('💾 Storing Alpaca account info in database...')
console.log('Database insert data:', { user_id, alpaca_account_id, ... })
console.log('✅ Alpaca account info stored successfully:', insertData)
```

### Error Categorization
- Validation errors (user can fix)
- Database errors (system issue)
- General system errors

## Expected Log Flow

### 1. Signup Edge Function
```
Creating account for: user@example.com
✅ Supabase user created: [user-id]
✅ User profile created
✅ User profile created - portfolio data will be fetched from Alpaca API
✅ KYC data stored successfully
```

### 2. Create-Alpaca-Account Edge Function
```
🔧 Environment check: { hasSupabaseUrl: true, hasServiceKey: true }
✅ Supabase client initialized with service role
Creating Alpaca account for user: user@example.com
✅ Alpaca account created successfully: [alpaca-id]
🔍 Checking if user_id is provided: { user_id: "[user-id]", hasUserId: true }
💾 Storing Alpaca account info in database...
✅ Alpaca account info stored successfully: [data]
```

### 3. Frontend Success
```
✅ Account created successfully via Edge Function
✅ User signed in successfully
✅ Alpaca brokerage account created successfully
✅ Trading account information saved to database
```

## Testing Checklist

1. **Apply Migration**: Run `20241209_fix_alpaca_accounts_rls.sql`
2. **Test Signup**: Create new account through signup form
3. **Monitor Logs**: Check browser console and Supabase Edge Function logs
4. **Verify Database**: Check `alpaca_accounts` table for new records
5. **Test Trading**: Verify user can access trading features

## Database Verification

After successful signup, this query should return the user's Alpaca account:
```sql
SELECT 
  aa.user_id,
  aa.alpaca_account_id,
  aa.alpaca_account_number,
  aa.account_status,
  aa.kyc_status,
  p.email,
  p.full_name
FROM public.alpaca_accounts aa
JOIN public.profiles p ON aa.user_id = p.id
ORDER BY aa.created_at DESC
LIMIT 5;
```

## Potential Remaining Issues

If the issue persists, check:

1. **Migration Applied**: Verify the service role policy exists
2. **Environment Variables**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
3. **Edge Function Deployment**: Ensure latest code is deployed
4. **Network Issues**: Check for any network/timeout errors
5. **Alpaca API**: Verify Alpaca account creation is actually succeeding

## Success Indicators

✅ User account created in Supabase  
✅ User profile created with correct data  
✅ Alpaca account created via API  
✅ Alpaca account data saved to `alpaca_accounts` table  
✅ User can access trading dashboard  
✅ No error messages during signup  

This comprehensive fix addresses all identified issues and provides extensive debugging to help identify any remaining problems.