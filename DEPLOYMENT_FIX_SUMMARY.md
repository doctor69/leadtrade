# Deployment Fix Summary

## Problem
The application worked locally but showed "Page Not Found" errors in production (Chrome and Safari), with Safari showing cache errors even in private mode.

## Root Cause
1. **API Routes in Static Build**: Astro was building API routes as static files in `dist/api/`, but these routes require server-side execution
2. **Conflicting Redirects**: Netlify redirects were trying to proxy `/api/*` to Supabase, but static API files were interfering
3. **Cache Issues**: Browsers were caching non-functional API route files

## Solution Applied

### 1. Removed Astro API Routes
- Deleted `src/pages/api/alpaca/reports/aggregate-positions.ts`
- Deleted `src/pages/api/alpaca/reports/eod-positions.ts`
- **Reason**: With `output: 'static'`, Astro cannot execute server-side API routes. All API calls should go directly to Supabase Edge Functions.

### 2. Updated Build Process
- Modified `package.json` build script to include cleanup: `"build": "astro build && node scripts/cleanup-api-build.js"`
- Created `scripts/cleanup-api-build.js` to remove any accidentally built API directories

### 3. Fixed Netlify Configuration (`netlify.toml`)
- Added `force = true` to API redirect to ensure it takes precedence
- Removed conflicting admin-only redirect
- Added proper 404 fallback as the last redirect
- Enhanced cache headers for service worker and HTML files

### 4. Updated Cache Headers
```toml
[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"
    Service-Worker-Allowed = "/"

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
```

## Architecture Clarification

### Static Site (Astro)
- All pages are pre-rendered as HTML
- Deployed to Netlify CDN
- No server-side execution

### API Layer (Supabase Edge Functions)
- All API endpoints run on Supabase infrastructure
- Accessed via: `https://bfbqlzpbkivyrnjkvqgl.supabase.co/functions/v1/*`
- Netlify proxies `/api/*` requests to Supabase

### Client-Side Code
- React components make API calls to `/api/*` endpoints
- Netlify redirects these to Supabase Edge Functions
- Authentication handled via HTTP-only cookies

## Deployment Steps

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Verify clean build**:
   ```bash
   ls dist/api  # Should not exist
   ```

3. **Deploy to Netlify**:
   - Push to Git repository
   - Netlify auto-deploys from `main` branch
   - Build command: `npm run build`
   - Publish directory: `dist`

4. **Clear browser cache** (if needed):
   - Chrome: DevTools → Network → Disable cache
   - Safari: Develop → Empty Caches
   - Or use private/incognito mode

## Testing Checklist

- [ ] Homepage loads correctly
- [ ] All navigation links work
- [ ] Sign in/Sign up pages load
- [ ] Dashboard loads (after authentication)
- [ ] API calls to `/api/*` are proxied to Supabase
- [ ] No 404 errors in browser console
- [ ] Service worker registers successfully
- [ ] PWA manifest loads correctly

## Common Issues

### "Page Not Found" on Refresh
- **Cause**: Missing redirect rules
- **Fix**: Ensure Netlify redirects are configured (already done)

### API Calls Failing
- **Cause**: API routes not proxied correctly
- **Fix**: Verify `force = true` on API redirect in `netlify.toml`

### Safari Cache Errors
- **Cause**: Old cached API files
- **Fix**: Clear Safari cache or use private mode

### Service Worker Not Updating
- **Cause**: Aggressive caching
- **Fix**: Updated cache headers to `no-cache, no-store, must-revalidate`

## Files Modified

1. `netlify.toml` - Fixed redirects and cache headers
2. `package.json` - Updated build script
3. `scripts/cleanup-api-build.js` - Created cleanup script
4. Deleted: `src/pages/api/alpaca/reports/*.ts` - Removed non-functional API routes

## Next Steps

1. Deploy to Netlify
2. Test in production
3. Clear browser caches if needed
4. Monitor for any errors in Netlify logs

## Notes

- All API functionality is handled by Supabase Edge Functions
- No changes needed to client-side code
- The fix ensures clean separation between static site and API layer
