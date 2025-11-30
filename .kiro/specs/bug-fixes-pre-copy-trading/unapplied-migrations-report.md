# Unapplied Migrations Report

**Date:** November 15, 2025  
**Task:** 1.3 - Identify unapplied migrations  
**Status:** ✅ COMPLETE

## Summary

Based on the database verification from Task 1.2, we have identified **10 unapplied migration files** that need to be applied to create the **15 missing database tables**.

## Current Database State

### Existing Tables (5)
- ✅ profiles
- ✅ alpaca_accounts
- ✅ copy_trading_subscriptions
- ✅ app_settings
- ✅ securities_cache

### Missing Tables (15)
These tables are defined in migration files but not yet applied to the database:

1. account_documents
2. kyc_submissions
3. onfido_sdk_tokens
4. corporate_actions
5. ach_relationships
6. bank_relationships
7. transfers
8. options_positions
9. watchlists
10. watchlist_assets
11. rebalancing_portfolios
12. rebalancing_subscriptions
13. rebalancing_runs
14. oauth_authorizations
15. oauth_access_tokens

## Unapplied Migrations

All migration files exist in `supabase/migrations/` and are ready to be applied:

### 1. 20250108_account_documents.sql
**Creates:** `account_documents`  
**Purpose:** Document metadata for KYC uploads  
**Priority:** HIGH - Required for account verification

### 2. 20250109_ach_relationships.sql
**Creates:** `ach_relationships`  
**Purpose:** ACH bank account linking  
**Priority:** HIGH - Required for funding operations

### 3. 20250109_bank_relationships.sql
**Creates:** `bank_relationships`  
**Purpose:** Wire transfer bank relationships  
**Priority:** HIGH - Required for funding operations

### 4. 20250109_corporate_actions.sql
**Creates:** `corporate_actions`  
**Purpose:** Corporate action announcements (dividends, splits)  
**Priority:** MEDIUM - Required for portfolio tracking

### 5. 20250109_kyc_submissions.sql
**Creates:** `kyc_submissions`, `onfido_sdk_tokens`  
**Purpose:** KYC/CIP verification submissions and Onfido integration  
**Priority:** HIGH - Required for compliance

### 6. 20250109_oauth_management.sql
**Creates:** `oauth_authorizations`, `oauth_access_tokens`  
**Purpose:** OAuth authorization codes and access tokens  
**Priority:** MEDIUM - Required for third-party integrations

### 7. 20250109_options_positions.sql
**Creates:** `options_positions`  
**Purpose:** Options positions with contract details  
**Priority:** HIGH - Required for options trading features

### 8. 20250109_rebalancing.sql
**Creates:** `rebalancing_portfolios`, `rebalancing_subscriptions`, `rebalancing_runs`  
**Purpose:** Portfolio rebalancing functionality  
**Priority:** LOW - Advanced feature

### 9. 20250109_transfers.sql
**Creates:** `transfers`  
**Purpose:** Transfer history (ACH, wire, sandbox)  
**Priority:** HIGH - Required for funding page and dashboard

### 10. 20250109_watchlists.sql
**Creates:** `watchlists`, `watchlist_assets`  
**Purpose:** User watchlists for tracking securities  
**Priority:** HIGH - Required for trade page functionality

## Migration Application Order

Migrations should be applied in chronological order (by date in filename):

1. 20250108_account_documents.sql
2. 20250109_ach_relationships.sql
3. 20250109_bank_relationships.sql
4. 20250109_corporate_actions.sql
5. 20250109_kyc_submissions.sql
6. 20250109_oauth_management.sql
7. 20250109_options_positions.sql
8. 20250109_rebalancing.sql
9. 20250109_transfers.sql
10. 20250109_watchlists.sql

## Application Methods

### Option 1: Supabase CLI (Recommended)
```bash
# Install Supabase CLI if not already installed
# brew install supabase/tap/supabase  # macOS
# npm install -g supabase              # npm

# Link to remote project
supabase link --project-ref bfbqlzpbkivyrnjkvqgl

# Push all pending migrations
supabase db push
```

### Option 2: Manual Application via Dashboard
1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl)
2. Navigate to SQL Editor
3. For each migration file (in order):
   - Open the file in `supabase/migrations/`
   - Copy the entire SQL content
   - Paste into SQL Editor
   - Click "Run"
4. Verify no errors occurred

### Option 3: Use Apply Script
```bash
# Use the provided script (requires manual execution per migration)
bash scripts/apply-migrations.sh
```

## Impact Analysis

### High Priority (Must Apply)
These migrations are critical for core functionality:
- **transfers** - Funding operations will fail without this
- **watchlists** - Trade page functionality depends on this
- **options_positions** - Options trading features require this
- **ach_relationships** / **bank_relationships** - Bank linking won't work
- **account_documents** / **kyc_submissions** - KYC/compliance features blocked

### Medium Priority (Should Apply)
These migrations support important features:
- **corporate_actions** - Portfolio tracking and dividend information
- **oauth_management** - Third-party integrations

### Low Priority (Can Apply Later)
These migrations support advanced features:
- **rebalancing_*** - Portfolio rebalancing is an advanced feature

## Expected Outcomes

After applying all migrations:
- ✅ All 20 expected tables will exist in the database
- ✅ Foreign key constraints will be properly established
- ✅ Row Level Security (RLS) policies will be in place
- ✅ Indexes will be created for optimal query performance
- ✅ All features requiring these tables will function correctly

## Verification

After applying migrations, verify success by running:

```bash
# Check database schema
node scripts/check-database.cjs

# Or check migration status
node scripts/check-migrations-simple.cjs
```

Expected result: All 20 tables should exist with no missing tables.

## Next Steps

1. ✅ **Task 1.3.1 Complete** - Identified all unapplied migrations
2. ⏭️ **Task 1.3.2 Next** - Apply migrations in order
3. ⏭️ **Task 1.3.3 Next** - Verify foreign keys and indexes
4. ⏭️ **Task 1.3.4 Next** - Test with sample data

## Files Created

- `scripts/check-applied-migrations.cjs` - Script to check applied migrations
- `scripts/check-migrations-simple.cjs` - Simple migration analysis script
- `.kiro/specs/bug-fixes-pre-copy-trading/unapplied-migrations-report.md` - This report

---

**Report Generated:** November 15, 2025  
**Analysis Tool:** `scripts/check-migrations-simple.cjs`  
**Database:** https://bfbqlzpbkivyrnjkvqgl.supabase.co
