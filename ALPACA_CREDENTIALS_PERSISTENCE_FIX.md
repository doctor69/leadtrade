# Alpaca Credentials Persistence Fix

## Problem
Alpaca credentials were not being saved to the database after signup, even though the data appeared in logs.

## Root Causes Identified

### 1. Column Name Mismatch
- **Issue**: Edge Function was trying to insert `alpaca_account_status` 
- **Fix**: Changed to `account_status` to match database schema

### 2. Missing Required Columns
- **Issue**: Database insertion was missing `kyc_status` and `kyc_data`
- **Fix**: Added both columns with appropriate data

### 3. RLS Policy Gap
- **Issue**: No service role policy for `alpaca_accounts` table
- **Fix**: Added service role policy to allow Edge Functions to insert data

### 4. Invalid Profile Update
- **Issue**: Edge Function tried to update non-existent `alpaca_account_id` column in profiles
- **Fix**: Removed invalid profile update

### 5. Manual Timestamp Issues
- **Issue**: Manually setting timestamps that are handled by database triggers
- **Fix**: Removed manual timestamp setting

## Files Modified

### 1. `supabase/functions/create-alpaca-account/index.ts`
- Fixed column name from `alpaca_account_status` to `account_status`
- Added `kyc_status` and `kyc_data` fields
- Removed invalid profile update
- Added detailed logging for debugging
- Added `.select()` to return inserted data

### 2. `src/lib/signup-service.ts`
- Removed manual timestamp setting (let database triggers handle it)
- Added detailed logging for debugging
- Added `.select()` to return inserted data
- Fixed both regular and OAuth signup flows

### 3. `supabase/schema.sql`
- Added service role policy for `alpaca_accounts` table

### 4. `supabase/migrations/20241209_fix_alpaca_accounts_rls.sql`
- Migration to add service role policy to existing databases

## Database Schema Verification

The `alpaca_accounts` table structure:
```sql
CREATE TABLE public.alpaca_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alpaca_account_id TEXT NOT NULL UNIQUE,
  alpaca_account_number TEXT,
  account_status TEXT DEFAULT 'ACTIVE',
  account_type TEXT DEFAULT 'paper' CHECK (account_type IN ('paper', 'live')),
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  kyc_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, account_type)
);
```

## RLS Policies Added
```sql
CREATE POLICY "Service role can manage Alpaca accounts" ON public.alpaca_accounts
  FOR ALL USING (auth.role() = 'service_role');
```

## Testing Steps

1. **Apply Migration**: Run the new migration to add the service role policy
2. **Test Signup**: Create a new account through the signup form
3. **Check Logs**: Monitor browser console and Supabase Edge Function logs
4. **Verify Database**: Check `alpaca_accounts` table for new records

## Expected Behavior

After signup completion:
1. Alpaca account created via API ✅
2. Supabase user account created ✅
3. **NEW**: Alpaca credentials saved to `alpaca_accounts` table ✅
4. User profile updated with trading preferences ✅
5. User can access trading features ✅

## Debugging Added

Enhanced logging in both signup service and Edge Function:
- Database insert data logged before insertion
- Detailed error logging with full error objects
- Success confirmation with inserted data
- Clear distinction between regular and OAuth flows

## Migration Required

Run this migration on your database:
```sql
-- Add service role policy for alpaca_accounts
CREATE POLICY "Service role can manage Alpaca accounts" ON public.alpaca_accounts
  FOR ALL USING (auth.role() = 'service_role');
```

This fix ensures that Alpaca credentials are properly persisted to the database, enabling trading functionality for all users.