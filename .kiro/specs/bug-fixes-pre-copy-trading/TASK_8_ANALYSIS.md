# Task 8: Critical Bug Fixes Analysis

## Date: November 15, 2025

## Issues Reported by User

1. **NaN appearing in Trade page**
2. **Theme settings only work on homepage** (not persisting across pages)
3. **Funding page redirects to homepage**

## Root Cause Analysis

### Issue 1: NaN in Trade Page

**Location:** `src/components/trading/TradeForm.tsx` - Line 169

**Problem:** When calculating estimated cost, if `selectedOption?.premium` is undefined or the calculation fails, it shows NaN instead of $0.00.

**Current Code:**
```typescript
const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(2);
};
```

**Issue:** The `formatCurrency` function returns '0.00' as a string, but when used in template like `${formatCurrency(selectedOption?.premium)}`, it doesn't include the $ sign, and if the value is actually NaN, it still displays.

**Additional Issue:** Line 369 shows:
```typescript
<span className="font-medium">${formatCurrency(selectedOption?.premium)}</span>
```

If `selectedOption` is undefined, `selectedOption?.premium` is undefined, which should be caught, but the display still shows "NaN" in some cases.

### Issue 2: Theme Settings Only Work on Homepage

**Location:** Multiple files - Theme persistence issue

**Problem:** The theme initialization script in `Layout.astro` runs correctly, but the ThemeProvider might not be properly hydrating on all pages.

**Analysis:**
- Layout.astro has inline script that runs immediately (lines 156-267)
- ThemeProvider wraps all pages (line 411)
- Theme should persist via cookies

**Possible Causes:**
1. ThemeProvider not hydrating properly on non-homepage routes
2. Cookie not being read correctly on page navigation
3. Theme state not syncing between inline script and React component

### Issue 3: Funding Page Redirects to Homepage

**Location:** `src/components/ProtectedRoute.tsx`

**Problem:** The ProtectedRoute component is redirecting authenticated users away from the funding page.

**Current Logic:**
```typescript
if (!isAuth && typeof window !== 'undefined') {
  console.log('User not authenticated, redirecting to signin');
  const currentPath = window.location.pathname + window.location.search;
  const returnUrl = encodeURIComponent(currentPath);
  window.location.href = `/signin?returnUrl=${returnUrl}`;
  return;
}
```

**Issue:** The redirect logic might be triggering even for authenticated users, or there's a race condition where `isAuth` is false initially, causing an immediate redirect before the auth check completes.

## Verification Needed

1. Check browser console for errors on Trade page
2. Check if theme cookies are being set/read correctly
3. Check ProtectedRoute auth flow timing
4. Verify FundingPageContent is receiving accountId correctly

## Proposed Fixes

### Fix 1: NaN in Trade Page
- Ensure all numeric values have proper fallbacks
- Add defensive checks for undefined/null before calculations
- Use Number() or parseFloat() with || 0 fallback

### Fix 2: Theme Persistence
- Verify ThemeProvider is client:load on all pages
- Check cookie domain and path settings
- Ensure theme state syncs properly

### Fix 3: Funding Page Redirect
- Add loading state to prevent premature redirects
- Check auth status before any redirect logic
- Ensure ProtectedRoute doesn't redirect during loading

## Next Steps

1. Implement fixes for all three issues
2. Test in both development and production modes
3. Verify fixes work across all pages
4. Deploy and verify in production
