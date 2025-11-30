# Bug Fixes - Pre Copy Trading Implementation

## Overview
Critical bug fixes that need to be addressed before implementing copy trading functionality.

## Issues to Fix

### 1. Theme Setting Only Works on Homepage/Dashboard ❌
**Problem:** Theme toggle doesn't persist across all pages

**Investigation Needed:**
- Check if ThemeProvider is wrapping all pages
- Verify cookie/localStorage persistence
- Check if theme script runs on all pages

**Files to Check:**
- `src/layouts/Layout.astro`
- `src/components/ThemeProvider.tsx`
- Theme initialization script

**Expected Behavior:**
- Theme should persist across all pages
- Theme toggle should work from any page
- No flash of wrong theme on page load

---

### 2. Portfolio History API 404 Error ❌
**Problem:** `https://bfbqlzpbkivyrnjkvqgl.supabase.co/functions/v1/alpaca-portfolio-history?period=1W&timeframe=1D` returns 404

**Investigation Needed:**
- Check if Edge Function exists and is deployed
- Verify function name matches the URL
- Check if function is properly configured

**Files to Check:**
- `supabase/functions/alpaca-portfolio-history/index.ts`
- Deployment status of Edge Functions

**Expected Behavior:**
- Function should return portfolio history data
- Should handle authentication properly
- Should proxy to Alpaca API correctly

---

### 3. Market Quotes Using Wrong Endpoint ❌
**Problem:** `https://leadtrade.app/api/market-quotes?symbols=...` should use Alpaca API directly with app credentials

**Current (Wrong):**
```
https://leadtrade.app/api/market-quotes?symbols=AAPL,MSFT...
```

**Should Be:**
```
Direct call to Alpaca API from frontend using edgeFunctionClient
OR
Supabase Edge Function: alpaca-market-data
```

**Investigation Needed:**
- Find where market quotes are being fetched
- Check if using old `/api/` route
- Update to use Alpaca API directly

**Files to Check:**
- Components fetching market data
- `src/lib/apiService.ts`
- `src/components/trading/SmartMarketData.tsx`
- `src/hooks/useMarketDataWithFallback.ts`

**Expected Behavior:**
- Market quotes fetched from Alpaca API
- Use app credentials (not user credentials)
- No `/api/` routes (static CDN deployment)

---

### 4. Funding Page Redirects to Home ❌
**Problem:** Funding page redirects to homepage, but funding options exist in settings

**Investigation Needed:**
- Check if `/funding` route exists
- Verify if funding should be a separate page or part of settings
- Check redirect logic

**Files to Check:**
- `src/pages/funding.astro`
- `src/pages/settings.astro`
- `src/components/account/FundingWalletManager.tsx`
- Navigation/routing logic

**Questions:**
- Should funding be a separate page?
- Or should it only be in settings?
- What's the intended UX?

**Expected Behavior:**
- Clear decision: separate page OR settings tab
- No redirect loops
- Consistent navigation

---

### 5. Alpaca Transfers API 401 Error on Dashboard ❌
**Problem:** `https://bfbqlzpbkivyrnjkvqgl.supabase.co/functions/v1/alpaca-transfers/6ce437b1-...` returns 401 on dashboard page

**Investigation Needed:**
- Why is transfers API being called on dashboard?
- Check authentication headers
- Verify user has Alpaca account linked

**Files to Check:**
- `src/pages/dashboard.astro`
- `src/components/trading/TradingDashboard.tsx`
- `src/components/account/TransferHistory.tsx`
- `supabase/functions/alpaca-transfers/index.ts`

**Expected Behavior:**
- Only call transfers API when needed
- Proper authentication
- Handle 401 gracefully (show "Link Alpaca Account" message)

---

### 6. NaN Error in Trade Page ❌
**Problem:** Trade page shows "NaN" instead of "$0"

**Investigation Needed:**
- Find where NaN is being displayed
- Check number parsing/formatting
- Verify data types

**Files to Check:**
- `src/pages/trade.astro`
- `src/components/trading/TradingInterface.tsx`
- `src/components/trading/TradeForm.tsx`
- Number formatting utilities

**Common Causes:**
- Dividing by zero
- Parsing undefined/null as number
- Missing default values

**Expected Behavior:**
- Show "$0.00" when value is 0 or undefined
- Proper number formatting
- No NaN displayed to users

---

### 7. Missing SQL Tables from Alpaca API Implementation ❌
**Problem:** Need to verify all SQL tables from Alpaca API implementation are created

**Investigation Needed:**
- List all migrations created during Alpaca implementation
- Check which tables exist in database
- Identify missing tables

**Files to Check:**
- `supabase/migrations/` directory
- All `20250109_*.sql` files
- Database schema verification

**Tables to Verify:**
- `alpaca_accounts`
- `alpaca_oauth_tokens`
- `alpaca_kyc_submissions`
- `account_documents`
- `ach_relationships`
- `bank_relationships`
- `corporate_actions`
- `funding_wallets`
- `instant_funding`
- `journals`
- `options_positions`
- `pdt_resets`
- `rebalancing_runs`
- `transfers`
- `watchlists`
- `watchlist_assets`

**Expected Behavior:**
- All tables exist in database
- All migrations applied successfully
- No missing foreign keys or indexes

---

## Priority Order

1. **HIGH:** Issue #7 - Verify SQL tables (blocks everything)
2. **HIGH:** Issue #3 - Market quotes endpoint (affects trading)
3. **HIGH:** Issue #6 - NaN error in trade page (UX issue)
4. **MEDIUM:** Issue #2 - Portfolio history 404 (dashboard feature)
5. **MEDIUM:** Issue #5 - Transfers 401 error (dashboard feature)
6. **MEDIUM:** Issue #4 - Funding page redirect (UX confusion)
7. **LOW:** Issue #1 - Theme persistence (cosmetic)

## Next Steps

1. Create detailed tasks for each issue
2. Investigate and document findings
3. Fix issues in priority order
4. Test fixes
5. Deploy
6. Then proceed with copy trading implementation
