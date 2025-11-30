# Database Schema Verification Report

**Date:** November 15, 2025  
**Database:** https://bfbqlzpbkivyrnjkvqgl.supabase.co  
**Status:** ⚠️ INCOMPLETE - 15 tables missing

## Summary

- **Total Expected Tables:** 20
- **Existing Tables:** 5 (25%)
- **Missing Tables:** 15 (75%)

## Existing Tables ✅

The following core MVP tables exist and are functional:

1. **profiles** - User profiles with copy trading preferences
2. **alpaca_accounts** - Alpaca account references
3. **copy_trading_subscriptions** - Leader-follower relationships
4. **app_settings** - Application configuration
5. **securities_cache** - Cached securities/assets data

## Missing Tables ❌

The following tables are missing and need to be created via migrations:

### Documents & KYC (4 tables)
- **account_documents** - Document metadata for KYC uploads
- **kyc_submissions** - KYC/CIP verification submissions
- **onfido_sdk_tokens** - Onfido SDK token tracking
- **corporate_actions** - Corporate action announcements

### Banking & Transfers (3 tables)
- **ach_relationships** - ACH bank account linking
- **bank_relationships** - Wire transfer bank relationships
- **transfers** - Transfer history (ACH, wire, sandbox)

### Trading (3 tables)
- **options_positions** - Options positions with contract details
- **watchlists** - User watchlists
- **watchlist_assets** - Watchlist-to-securities junction table

### Portfolio Management (3 tables)
- **rebalancing_portfolios** - Portfolio definitions with target weights
- **rebalancing_subscriptions** - Account subscriptions to portfolios
- **rebalancing_runs** - Rebalancing execution history

### OAuth (2 tables)
- **oauth_authorizations** - OAuth authorization codes
- **oauth_access_tokens** - OAuth access and refresh tokens

## Migration Files Available

The following migration files exist in `supabase/migrations/` and need to be applied:

1. `20250108_account_documents.sql` - Creates account_documents table
2. `20250109_ach_relationships.sql` - Creates ach_relationships table
3. `20250109_bank_relationships.sql` - Creates bank_relationships table
4. `20250109_corporate_actions.sql` - Creates corporate_actions table
5. `20250109_kyc_submissions.sql` - Creates kyc_submissions and onfido_sdk_tokens tables
6. `20250109_oauth_management.sql` - Creates oauth_authorizations and oauth_access_tokens tables
7. `20250109_options_positions.sql` - Creates options_positions table
8. `20250109_rebalancing.sql` - Creates rebalancing_portfolios, rebalancing_subscriptions, and rebalancing_runs tables
9. `20250109_transfers.sql` - Creates transfers table
10. `20250109_watchlists.sql` - Creates watchlists and watchlist_assets tables

## Impact Analysis

### High Priority Missing Tables
These tables are critical for core functionality:

- **transfers** - Required for funding operations
- **watchlists** / **watchlist_assets** - Required for trade page functionality
- **options_positions** - Required for options trading features

### Medium Priority Missing Tables
These tables support important features:

- **ach_relationships** / **bank_relationships** - Required for bank linking
- **account_documents** / **kyc_submissions** - Required for KYC/compliance
- **corporate_actions** - Required for dividend/split tracking

### Low Priority Missing Tables
These tables support advanced features:

- **rebalancing_*** - Required for portfolio rebalancing features
- **oauth_*** - Required for third-party OAuth integrations
- **onfido_sdk_tokens** - Required for Onfido identity verification

## Recommended Actions

### Immediate (Task 1.3)
1. Apply all missing migrations to the database
2. Verify foreign key constraints and indexes
3. Test with sample data

### Commands to Execute

```bash
# Check migration status
supabase db remote commit

# Apply all pending migrations
supabase db push

# Or apply migrations individually via Supabase Dashboard
# SQL Editor > Run each migration file
```

### Alternative: Manual Application
If Supabase CLI is not available, migrations can be applied manually:

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl
2. Navigate to SQL Editor
3. Copy and paste each migration file content
4. Execute in order (by date in filename)

## Verification Script

A verification script has been created at `scripts/check-database.cjs` that can be run anytime to check database status:

```bash
# Run verification
PUBLIC_SUPABASE_URL=https://bfbqlzpbkivyrnjkvqgl.supabase.co \
PUBLIC_SUPABASE_SERVICE_ROLE_KEY="your_key_here" \
node scripts/check-database.cjs
```

## Next Steps

1. ✅ **Task 1.2 Complete** - Database schema verified and documented
2. ⏭️ **Task 1.3 Next** - Apply missing migrations
3. ⏭️ **Task 1.3 Verify** - Run verification script again to confirm all tables exist

---

**Report Generated:** November 15, 2025  
**Script Used:** `scripts/check-database.cjs`  
**Documentation:** `.kiro/specs/bug-fixes-pre-copy-trading/expected-tables.md`
