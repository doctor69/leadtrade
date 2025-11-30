# CORS Debugging Approach

## Problem
CORS preflight request failing with "It does not have HTTP ok status" error when calling the streamlined-signup Edge Function.

## Root Cause Analysis

The error "Response to preflight request doesn't pass access control check: It does not have HTTP ok status" indicates that the OPTIONS request is returning a non-200 status code, which could be caused by:

1. **Edge Function Import Errors** - Shared imports failing during function initialization
2. **Runtime Errors** - Function throwing errors before handling OPTIONS request
3. **Deployment Issues** - Function not properly deployed or accessible
4. **Environment Variables** - Missing environment variables causing function to fail

## Debugging Steps

### Step 1: Test Basic CORS
Created `debug-signup` function with:
- No external imports (except serve)
- Direct CORS header definitions
- Simple success response
- Comprehensive error handling

### Step 2: Test CORS Only
Created `test-cors` function that:
- Only handles CORS preflight
- Returns success for any request
- Minimal dependencies

### Step 3: Simplified Streamlined Signup
Modified `streamlined-signup` to:
- Remove shared imports (`../shared/cors.ts`, `../shared/response.ts`)
- Define CORS headers directly in function
- Define response functions inline
- Add more logging for OPTIONS requests

## Testing Process

1. **Deploy debug-signup function**
2. **Update frontend to use debug-signup**
3. **Test if CORS works with minimal function**
4. **If successful, gradually add complexity back**

## Files Created

### `supabase/functions/debug-signup/index.ts`
- Minimal signup function for CORS testing
- Returns mock success response
- No actual account creation

### `supabase/functions/test-cors/index.ts`
- Pure CORS test function
- Only handles OPTIONS and returns success

### Modified `supabase/functions/streamlined-signup/index.ts`
- Removed shared imports
- Inline CORS headers and response functions
- Enhanced error handling

## Expected Results

### If debug-signup works:
- ✅ CORS is working
- ❌ Issue is with streamlined-signup complexity
- 🔧 Gradually add features back to streamlined-signup

### If debug-signup fails:
- ❌ CORS configuration issue
- ❌ Edge Function deployment issue
- 🔧 Check Supabase project settings and deployment

## Next Steps

1. **Test debug-signup** - Should work without CORS errors
2. **Verify function deployment** - Check Supabase dashboard
3. **Check environment variables** - Ensure all required vars are set
4. **Gradually restore functionality** - Add features back one by one

## Rollback Plan

If CORS continues to fail:
1. **Use original signup function** - Revert to working version
2. **Separate Alpaca creation** - Create Alpaca account in separate step
3. **Client-side orchestration** - Handle multi-step process in frontend

This debugging approach isolates the CORS issue and provides a path to resolution.