# Alpaca-First Signup Process

## Problem
Creating Supabase account first, then Alpaca account creates orphaned Supabase accounts when Alpaca creation fails. Since Alpaca account creation is more likely to fail (external API, validation requirements), it should be done first.

## Solution: Alpaca-First Process

### New Order (Fail-Fast Approach):

1. **🏦 Create Alpaca Account** - Most likely to fail, do this first
2. **📝 Create Supabase User** - Only if Alpaca succeeds
3. **👤 Create User Profile** - Link to Supabase user
4. **💾 Save Alpaca Account** - Store Alpaca ID in database
5. **💰 Fund Account** - Add $1000 for testing

### Benefits:

- **No Orphaned Accounts**: If Alpaca fails, no Supabase account is created
- **Fail-Fast**: Most error-prone step happens first
- **Clean Rollback**: Only need to clean up Supabase if later steps fail
- **Better UX**: User gets clear error if Alpaca requirements aren't met

## Process Flow:

### Step 1: Create Alpaca Account
```typescript
// Create Alpaca account with user data
const alpacaResponse = await fetch(alpacaAPI, {
  method: 'POST',
  body: JSON.stringify(alpacaPayload)
})

if (!alpacaResponse.ok) {
  // FAIL FAST - No cleanup needed
  return createErrorResponse('Failed to create Alpaca account')
}
```

### Step 2: Create Supabase User (Only if Alpaca succeeds)
```typescript
const { data: authData } = await supabase.auth.admin.createUser({
  email: body.email,
  password: body.password,
  user_metadata: {
    alpaca_account_id: alpacaAccount.id // Store Alpaca ID
  }
})
```

### Step 3: Create Profile & Save Data
```typescript
// Create profile
await supabase.from('profiles').insert({ ... })

// Save Alpaca account reference
await supabase.from('alpaca_accounts').insert({
  user_id: userId,
  alpaca_account_id: alpacaAccount.id,
  // ... other fields
})
```

## Error Handling:

### Alpaca Creation Fails (Step 1):
- ✅ No cleanup needed
- ✅ Clear error message to user
- ✅ No orphaned accounts

### Supabase Creation Fails (Step 2):
- ⚠️ Alpaca account exists but can be reused
- ✅ No Supabase account created
- ✅ User can retry with same data

### Profile/Database Fails (Steps 3-4):
- 🧹 Clean up Supabase user account
- ⚠️ Alpaca account remains (acceptable)
- ✅ Clear error message

## Advantages:

1. **Reduced Orphaned Accounts**: Most failures happen before Supabase creation
2. **Better Error Messages**: Alpaca validation errors are clearer
3. **Easier Debugging**: Alpaca issues are identified immediately
4. **Resource Efficiency**: Don't create Supabase resources if Alpaca will fail

## Updated Function Structure:

```typescript
serve(async (req: Request) => {
  // Step 1: Create Alpaca account (fail-fast)
  const alpacaAccount = await createAlpacaAccount(userData)
  if (!alpacaAccount) return error()
  
  // Step 2: Create Supabase user (only if Alpaca succeeds)
  const supabaseUser = await createSupabaseUser(userData, alpacaAccount.id)
  if (!supabaseUser) return error() // Alpaca account remains
  
  // Step 3: Create profile and save data
  await createProfile(supabaseUser.id)
  await saveAlpacaAccount(supabaseUser.id, alpacaAccount)
  
  // Step 4: Fund account
  await fundAccount(alpacaAccount.id)
  
  return success()
})
```

## Testing Scenarios:

### Invalid Alpaca Data:
- ❌ Alpaca creation fails immediately
- ✅ No Supabase account created
- ✅ User gets clear validation error

### Valid Alpaca, Invalid Supabase:
- ✅ Alpaca account created
- ❌ Supabase creation fails
- ⚠️ Alpaca account can be reused in retry

### Database Issues:
- ✅ Alpaca account created
- ✅ Supabase user created
- ❌ Database save fails
- 🧹 Supabase user cleaned up

This approach minimizes orphaned accounts and provides better error handling by doing the most failure-prone operation first.