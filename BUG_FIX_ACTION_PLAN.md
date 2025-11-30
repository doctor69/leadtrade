# Bug Fix Action Plan - Immediate Actions

## Summary of Findings

### ✅ Issue #7: SQL Tables
**Status:** VERIFIED - All migrations exist
```
20250109_ach_relationships.sql
20250109_bank_relationships.sql
20250109_corporate_actions.sql
20250109_kyc_submissions.sql
20250109_oauth_management.sql
20250109_options_positions.sql
20250109_rebalancing.sql
20250109_transfers.sql
20250109_watchlists.sql
```
**Action:** Need to verify these are applied to production database

### ❌ Issue #3: Market Quotes
**Status:** FOUND - Using deleted `/api/market-quotes` endpoint
**Files affected:**
- `src/lib/market-data-fallback.ts:201`
- `src/components/trading/TradingInterface.tsx:89`

**Action:** Update to use Supabase Edge Function directly

### ❌ Issue #2: Portfolio History
**Status:** MISSING - Function doesn't exist
**Action:** Need to create `alpaca-portfolio-history` Edge Function

### 🔍 Issue #6: NaN Error
**Status:** INVESTIGATING - Need to check trade page components

### 🔍 Issue #5: Transfers 401
**Status:** INVESTIGATING - Need to check dashboard

### 🔍 Issue #4: Funding Page
**Status:** INVESTIGATING - Need to check routing

### 🔍 Issue #1: Theme
**Status:** INVESTIGATING - Need to test across pages

---

## Immediate Actions (Next 30 minutes)

### Action 1: Fix Market Quotes (CRITICAL)
Update these 2 files to use Edge Function:

**File 1: `src/lib/market-data-fallback.ts`**
```typescript
// Line 201 - BEFORE
const response = await fetch(`/api/market-quotes?symbols=${symbolsParam}&feed=iex`);

// AFTER
import { edgeFunctionClient } from './edgeFunctionClient';
const response = await edgeFunctionClient.get('alpaca-market-data-enhanced', {
  symbols: symbolsParam,
  feed: 'iex'
});
```

**File 2: `src/components/trading/TradingInterface.tsx`**
```typescript
// Line 89 - BEFORE
const response = await fetch(`/api/market-quotes?symbols=${symbol}`);

// AFTER
import { edgeFunctionClient } from '@/lib/edgeFunctionClient';
const response = await edgeFunctionClient.get('alpaca-market-data-enhanced', {
  symbols: symbol
});
```

### Action 2: Create Portfolio History Function
Create `supabase/functions/alpaca-portfolio-history/index.ts`

### Action 3: Check Database Migrations
```bash
# Connect to Supabase and verify tables
supabase db remote commit
supabase db push
```

---

## Priority Order

1. **NOW:** Fix market quotes (blocks trading)
2. **NOW:** Verify SQL tables (blocks everything)
3. **NEXT:** Fix NaN error (UX issue)
4. **NEXT:** Create portfolio history function
5. **LATER:** Fix transfers 401
6. **LATER:** Fix funding page
7. **LATER:** Fix theme persistence

---

## Quick Wins (Can fix in 10 minutes each)

1. Market quotes - 2 file changes
2. NaN error - Add default values
3. Theme - Verify ThemeProvider placement

---

## Need More Investigation

1. Transfers 401 - Why called on dashboard?
2. Funding page - Intended UX?
3. Portfolio history - Full implementation needed

---

Ready to start fixing! Should I begin with market quotes?
