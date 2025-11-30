# Streamlined Signup Solution

## Problem Summary
The signup process was overly complex with multiple Edge Functions, database triggers, and schema conflicts causing the `is_paper_trading` error and preventing Alpaca account persistence.

## Solution: Single Streamlined Function

### New Approach: `streamlined-signup` Edge Function

**One function handles everything:**

1. ✅ **Create Supabase User** - Using admin API
2. ✅ **Create User Profile** - Direct database insertion with correct schema
3. ✅ **Create Alpaca Account** - Using Broker API with test data
4. ✅ **Save Alpaca Account** - Store in `alpaca_accounts` table
5. ✅ **Fund Account** - $1000 for testing (sandbox limitations handled gracefully)

### Key Benefits

- **Single Point of Failure**: If any step fails, everything rolls back
- **No Schema Conflicts**: Uses correct column names (`trading_mode` not `is_paper_trading`)
- **No Trigger Conflicts**: Direct database operations, no competing processes
- **Test-Friendly**: Includes default test data for required fields
- **Comprehensive Logging**: Clear step-by-step logging for debugging

## Files Created/Modified

### New Edge Function
- **`supabase/functions/streamlined-signup/index.ts`** - Complete signup process

### Updated Frontend
- **`src/components/SupabaseSignUpForm.tsx`** - Uses streamlined-signup instead of multiple functions

### Database Migration
- **`supabase/migrations/20241209_streamlined_setup.sql`** - Ensures clean database schema

### Cleanup Documentation
- **`CLEANUP_UNNECESSARY_FUNCTIONS.md`** - Lists functions to remove

## Streamlined Function Flow

```typescript
// 1. Create Supabase user
const { data: authData } = await supabase.auth.admin.createUser({
  email, password, email_confirm: true
})

// 2. Create profile with correct schema
await supabase.from('profiles').insert({
  id: userId,
  trading_mode: 'paper', // ✅ Correct column name
  // ... other fields
})

// 3. Create Alpaca account
const alpacaResponse = await fetch(alpacaAPI, {
  method: 'POST',
  body: JSON.stringify(alpacaPayload)
})

// 4. Save to database
await supabase.from('alpaca_accounts').insert({
  user_id: userId,
  alpaca_account_id: alpacaAccount.id,
  // ... other fields
})

// 5. Fund account (testing)
// Handles sandbox limitations gracefully
```

## Test Data Defaults

For testing, the function provides sensible defaults:
- **Phone**: `+15551234567`
- **Address**: `123 Test St, Test City, CA 12345`
- **Date of Birth**: `1990-01-01`
- **Tax ID**: `078051120` (valid test SSN for Alpaca sandbox)

## Error Handling

- **Rollback on Failure**: If any step fails, cleans up created resources
- **Clear Error Messages**: Specific error messages for each step
- **Graceful Degradation**: Funding failures don't break signup

## Database Schema

Clean, simple schema:
```sql
-- profiles table
trading_mode TEXT NOT NULL CHECK (trading_mode IN ('paper', 'live'))

-- alpaca_accounts table  
alpaca_account_id TEXT NOT NULL UNIQUE
user_id UUID REFERENCES auth.users(id)
```

## Frontend Integration

Simple one-call signup:
```typescript
const signupResponse = await edgeFunctionClient.post('streamlined-signup', {
  email: 'user@example.com',
  password: 'password123',
  given_name: 'John',
  family_name: 'Doe',
  // Optional fields with defaults
})
```

## Testing Steps

1. **Apply Migration**: `20241209_streamlined_setup.sql`
2. **Deploy Function**: Deploy `streamlined-signup` Edge Function
3. **Test Signup**: Create new account through signup form
4. **Verify Results**:
   - User created in Supabase
   - Profile created with `trading_mode: 'paper'`
   - Alpaca account created
   - Alpaca account saved to database
   - $1000 funding attempted

## Success Criteria

✅ No more `is_paper_trading` column errors  
✅ User account created successfully  
✅ Profile created with correct schema  
✅ Alpaca account created and saved  
✅ Account funded for testing  
✅ Single function handles entire process  
✅ Clear error messages and rollback  

## Cleanup Next Steps

After confirming this works:
1. Remove old signup functions (see `CLEANUP_UNNECESSARY_FUNCTIONS.md`)
2. Remove unused Edge Functions
3. Simplify to core MVP functionality

This streamlined approach eliminates complexity and provides a reliable, single-step signup process that handles all requirements.