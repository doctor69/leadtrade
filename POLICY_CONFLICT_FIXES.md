# Policy Conflict Fixes

## Issue Description
The migration was failing with the error:
```
ERROR: 42710: policy "Users can insert their own profile" for table "profiles" already exists
```

This indicates that the migration was trying to create RLS policies that already existed in the database.

## Root Cause
The migration file was not properly dropping existing policies before creating new ones. This caused conflicts when the migration was run on a database that already had some of these policies in place.

## Solution Applied
Added comprehensive `DROP POLICY IF EXISTS` statements for all policies being created in the migration.

### Policies Fixed

#### Profiles Table
- ✅ Added DROP for "Users can insert their own profile"
- ✅ Added DROP for "Public profiles viewable for copy trading"
- ✅ Existing DROPs for view and update policies were already present

#### Alpaca Accounts Table
- ✅ Added DROP for "Users can update their own Alpaca accounts"
- ✅ Added DROP for "Users can insert their own Alpaca accounts"
- ✅ Existing DROP for view policy was already present

#### Copy Trading Subscriptions Table
- ✅ Added DROP for "Users can view subscriptions as follower"
- ✅ Added DROP for "Users can view subscriptions as leader"
- ✅ Added DROP for "Users can create subscriptions as follower"
- ✅ Added DROP for "Users can update subscriptions as follower"
- ✅ Added DROP for "Users can delete subscriptions as follower"

#### App Settings Table
- ✅ Added DROP for "Anyone can read app settings"
- ✅ Added DROP for "Service role can manage app settings"

### Triggers Fixed
Added `DROP TRIGGER IF EXISTS` statements for all triggers:
- ✅ update_profiles_updated_at
- ✅ update_alpaca_accounts_updated_at
- ✅ update_copy_trading_subscriptions_updated_at
- ✅ update_app_settings_updated_at
- ✅ validate_allocation_percentage

### Functions Fixed
Added DROP for update_modified_column function to ensure clean recreation.

## Migration Pattern Applied
The migration now follows this safe pattern:
```sql
-- 1. Drop existing objects
DROP POLICY IF EXISTS "policy_name" ON table_name;
DROP TRIGGER IF EXISTS trigger_name ON table_name;
DROP FUNCTION IF EXISTS function_name() CASCADE;

-- 2. Create new objects
CREATE POLICY "policy_name" ON table_name ...;
CREATE TRIGGER trigger_name ...;
CREATE FUNCTION function_name() ...;
```

## Benefits
1. **Idempotent Migration**: Can be run multiple times safely
2. **No Conflicts**: Eliminates policy/trigger/function already exists errors
3. **Clean State**: Ensures all objects are recreated with current definitions
4. **Reliable Deployment**: Works on both fresh databases and existing ones

## Verification
The migration should now run successfully without any "already exists" errors, whether applied to:
- A fresh database
- A database with existing policies from previous migrations
- A database being reset and reapplied

The migration is now robust and handles all potential conflicts gracefully.