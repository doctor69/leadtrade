# Auth Debug Steps

## Problem
Getting 401 Unauthorized error when calling Edge Functions from the dashboard, even though signup completed successfully.

## Debugging Steps

### 1. Check Session After Signup
- Removed manual localStorage token storage
- Let Supabase handle session management automatically
- Added debugging to edgeFunctionClient to see session status

### 2. Verify Session Persistence
The issue might be that the session isn't persisting properly after signup. Check:
- Is the user actually signed in after signup?
- Is the session token valid?
- Is the session being passed correctly to Edge Functions?

### 3. Debug Output to Check
After signup, check browser console for:
```
🔍 EdgeFunction auth debug: {
  hasSession: true/false,
  hasAccessToken: true/false,
  tokenPreview: "eyJ...",
  expiresAt: timestamp
}
```

If `hasSession: false`, the issue is with session establishment.
If `hasSession: true` but still getting 401, the issue is with the Edge Function auth validation.

## Potential Issues

### Issue 1: Session Not Established
**Symptoms**: `hasSession: false` in debug output
**Cause**: Auto sign-in after signup not working properly
**Fix**: Ensure `supabase.auth.signInWithPassword()` is successful

### Issue 2: Session Not Persisting
**Symptoms**: Session works initially but disappears on page refresh
**Cause**: Session storage configuration issue
**Fix**: Check Supabase client configuration

### Issue 3: Edge Function Auth Validation
**Symptoms**: `hasSession: true` but still 401 error
**Cause**: Edge Function `withAuth()` not recognizing the session
**Fix**: Check if session token format is correct

## Quick Test

Add this to dashboard to test auth status:
```typescript
const testAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Dashboard auth test:', {
    hasSession: !!session,
    userId: session?.user?.id,
    email: session?.user?.email
  });
};
```

## Expected Flow

1. **Signup completes** ✅
2. **Auto sign-in successful** ✅
3. **Session established** ✅
4. **Dashboard loads** ✅
5. **Edge Function calls include valid auth header** ✅
6. **Portfolio data loads** ✅

The fix should resolve the 401 error by ensuring proper session management.