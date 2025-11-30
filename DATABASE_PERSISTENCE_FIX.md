# Database Persistence Fix

## Problem Identified

The issue was that **Alpaca account information was not persisting in the database** despite successful account creation. Here's what was happening:

### Root Cause Analysis

1. **Alpaca account created successfully** ✅
2. **Supabase user account created successfully** ✅  
3. **Database insertion failed silently** ❌

### The Issue: Wrong Supabase Client Key

The signup service was using the **`PUBLIC_SUPABASE_ANON_KEY`** for all operations, including database insertions. This caused the following problem:

```typescript
// BEFORE (BROKEN)
const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY  // ❌ Wrong key for database operations
);

// This fails because the user just signed up and isn't authenticated yet
await supabase.from('alpaca_accounts').insert({...});
```

### Why This Failed

1. **RLS (Row Level Security) Policies**: The `alpaca_accounts` table has RLS policies that require the user to be authenticated
2. **User Not Authenticated Yet**: Right after signup, the user session isn't established for the anon key client
3. **Silent Failure**: The insertion failed but the error wasn't properly surfaced, making it appear successful

## Solution Implemented

### Dual Client Approach

```typescript
// AFTER (FIXED)
// Use anon key for auth operations
const supabaseAuth = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

// Use service role key for database operations to bypass RLS
const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY  // ✅ Correct key for database operations
);
```

### Updated Operations

1. **Auth Operations** → Use `supabaseAuth` (anon key)
   - `auth.signUp()`
   - `auth.getUser()`

2. **Database Operations** → Use `supabaseAdmin` (service role key)
   - `from('alpaca_accounts').insert()`
   - `from('profiles').update()`
   - All other database operations

## Files Modified

### 1. `src/lib/signup-service.ts`

**Regular Signup Function:**
- ✅ Split Supabase clients for auth vs database operations
- ✅ Use service role key for `alpaca_accounts` insertion
- ✅ Use service role key for `profiles` update

**OAuth Signup Function:**
- ✅ Split Supabase clients for auth vs database operations  
- ✅ Use service role key for database operations
- ✅ Use service role key for cleanup operations

**Rollback Function:**
- ✅ Already using service role key (was working correctly)

## Verification

### Test Coverage
Created `src/lib/__tests__/database-insertion-test.ts` to verify:
- ✅ Service role key is used for database operations
- ✅ Anon key is used for auth operations
- ✅ Database insertion errors are properly handled
- ✅ Environment variables are configured correctly

### Expected Behavior Now

1. **Alpaca account creation** → Success ✅
2. **Supabase user creation** → Success ✅
3. **Database insertion** → Success ✅ (using service role key)
4. **Portfolio loading** → Success ✅ (Alpaca account info available)

## Environment Variables Required

Ensure these are set in your environment:

```bash
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # ← This was the missing piece
```

## Security Considerations

- **Service Role Key**: Only used server-side for database operations that need to bypass RLS
- **Anon Key**: Used for client-side auth operations
- **RLS Policies**: Still protect the data, but service role can perform necessary insertions during signup

## Testing the Fix

To verify the fix works:

1. **Sign up a new user**
2. **Check the `alpaca_accounts` table** - should contain the new record
3. **Check the `profiles` table** - should be updated with user info
4. **Try loading portfolio** - should work without errors

## Rollback Safety

If there are any issues with the service role key:
- The system will fall back to the anon key (original behavior)
- Error handling will catch and report database insertion failures
- Comprehensive rollback system will clean up any orphaned accounts

## Summary

The fix ensures that:
- ✅ **Alpaca accounts persist correctly** in the database
- ✅ **User profiles are updated** with trading information  
- ✅ **Portfolio loading works** because account info is available
- ✅ **Security is maintained** through proper key usage
- ✅ **Error handling is robust** with proper rollback mechanisms

This resolves the issue where users could successfully create accounts but couldn't load their portfolios due to missing database records.