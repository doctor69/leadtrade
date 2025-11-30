# Database Insertion Test

## Issue
The Alpaca account data is not being saved to the `alpaca_accounts` table after signup.

## Debugging Steps Added

### 1. Enhanced Logging in create-alpaca-account Edge Function
- Added environment variable check logging
- Added Supabase client initialization confirmation
- Added user_id presence check
- Added Alpaca account creation details logging
- Added database insertion data logging
- Added fallback logging when user_id is not provided

### 2. Fixed signup Edge Function
- Removed non-existent `user_portfolios` table creation
- Fixed profile creation to use correct `trading_mode` column instead of `is_paper_trading`
- Removed manual timestamp setting (let database triggers handle it)

### 3. Added RLS Policy
- Created service role policy for `alpaca_accounts` table
- Ensured Edge Functions can bypass RLS restrictions

## Testing Process

1. **Check Browser Console**: Look for signup flow logs
2. **Check Supabase Edge Function Logs**: Monitor both `signup` and `create-alpaca-account` functions
3. **Check Database**: Verify if records are being inserted into `alpaca_accounts` table

## Expected Log Flow

### Signup Edge Function Logs:
```
Creating account for: user@example.com
✅ Supabase user created: [user-id]
✅ User profile created
✅ User profile created - portfolio data will be fetched from Alpaca API
✅ KYC data stored successfully
```

### Create-Alpaca-Account Edge Function Logs:
```
🔧 Environment check: { hasSupabaseUrl: true, hasServiceKey: true, supabaseUrl: "..." }
✅ Supabase client initialized with service role
Creating Alpaca account for user: user@example.com
✅ Alpaca account created successfully: [alpaca-account-id]
Alpaca account details: { id: "...", account_number: "...", status: "ACTIVE" }
🔍 Checking if user_id is provided for database storage: { user_id: "[user-id]", hasUserId: true }
💾 Storing Alpaca account info in database...
Database insert data: { user_id: "...", alpaca_account_id: "...", ... }
✅ Alpaca account info stored successfully: [inserted-data]
```

## Potential Issues to Check

1. **Environment Variables**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly
2. **RLS Policy**: Verify the service role policy was applied to the database
3. **User ID Passing**: Confirm `userData.user_id` is being passed correctly from signup to create-alpaca-account
4. **Database Schema**: Ensure `alpaca_accounts` table exists with correct columns

## Manual Database Check

After signup, check the database:
```sql
SELECT * FROM public.alpaca_accounts ORDER BY created_at DESC LIMIT 5;
```

Should show the newly created Alpaca account record.