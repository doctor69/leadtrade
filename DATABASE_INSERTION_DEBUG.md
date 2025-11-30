# Database Insertion Debug

## Issue
Alpaca credentials are not being saved to the database after signup, even though the data shows in logs.

## Root Cause Analysis

### 1. Column Name Mismatch
The Edge Function was trying to insert `alpaca_account_status` but the database column is `account_status`.

### 2. Missing Required Columns
The database insertion was missing `kyc_status` and `kyc_data` columns that are required by the schema.

### 3. Timestamp Handling
The database has triggers for `updated_at`, so we don't need to manually set `created_at` and `updated_at`.

## Fixes Applied

### 1. Fixed Edge Function (supabase/functions/create-alpaca-account/index.ts)
- Changed `alpaca_account_status` to `account_status`
- Added `kyc_status: 'approved'`
- Added `kyc_data` with minimal KYC information
- Removed manual timestamp setting (let database triggers handle it)

### 2. Fixed Signup Service (src/lib/signup-service.ts)
- Removed manual `created_at` and `updated_at` timestamps
- Ensured consistent column names

### 3. Removed Invalid Profile Update
- The profiles table doesn't have an `alpaca_account_id` column
- Removed the invalid profile update from the Edge Function

## Database Schema Verification

The `alpaca_accounts` table has these columns:
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to auth.users)
- `alpaca_account_id` (TEXT, unique)
- `alpaca_account_number` (TEXT)
- `account_status` (TEXT, default 'ACTIVE')
- `account_type` (TEXT, default 'paper')
- `kyc_status` (TEXT, default 'pending')
- `kyc_data` (JSONB)
- `created_at` (TIMESTAMP, auto-generated)
- `updated_at` (TIMESTAMP, auto-updated via trigger)

## Testing Steps

1. Try creating a new account through the signup form
2. Check the browser console for any errors
3. Verify the Edge Function logs in Supabase dashboard
4. Check the `alpaca_accounts` table in the database

## Expected Result

After signup, the `alpaca_accounts` table should contain:
- A new row with the user's `user_id`
- The Alpaca account ID from the API response
- Account status and type
- KYC status set to 'approved'
- KYC data with user information