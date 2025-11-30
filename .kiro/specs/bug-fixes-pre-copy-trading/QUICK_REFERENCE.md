# Quick Reference Guide - Database Schema Verification

## 🎯 Current Status

**Task 1.2: ✅ COMPLETE**
- Connected to Supabase database
- Verified schema against expected tables
- Documented 15 missing tables
- Created verification and migration scripts

## 📊 Database Status

- **Existing Tables:** 5/20 (25%)
- **Missing Tables:** 15/20 (75%)
- **Database URL:** https://bfbqlzpbkivyrnjkvqgl.supabase.co

## 🔧 Quick Commands

### Check Database Schema
```bash
# Run verification script
PUBLIC_SUPABASE_URL=https://bfbqlzpbkivyrnjkvqgl.supabase.co \
PUBLIC_SUPABASE_SERVICE_ROLE_KEY="your_key" \
node scripts/check-database.cjs
```

### Apply Migrations (if Supabase CLI installed)
```bash
# Apply all pending migrations
./scripts/apply-migrations.sh

# Or manually
supabase db push
```

### Manual Migration Application
1. Open Supabase Dashboard: https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl
2. Go to SQL Editor
3. Copy/paste each migration file from `supabase/migrations/`
4. Execute in order by date

## 📁 Key Files

### Scripts
- `scripts/check-database.cjs` - Database verification script
- `scripts/apply-migrations.sh` - Migration application script
- `scripts/verify-schema.sql` - SQL verification queries

### Documentation
- `.kiro/specs/bug-fixes-pre-copy-trading/database-verification-report.md` - Full report
- `.kiro/specs/bug-fixes-pre-copy-trading/expected-tables.md` - Table specifications
- `TASK_1.2_COMPLETE.md` - Task completion summary

## 🚨 Missing Tables (Priority Order)

### High Priority
1. `transfers` - Required for funding operations
2. `watchlists` - Required for trade page
3. `watchlist_assets` - Required for trade page
4. `options_positions` - Required for options trading

### Medium Priority
5. `ach_relationships` - Bank linking
6. `bank_relationships` - Wire transfers
7. `account_documents` - KYC documents
8. `kyc_submissions` - KYC verification
9. `onfido_sdk_tokens` - Identity verification
10. `corporate_actions` - Dividends/splits

### Low Priority
11. `rebalancing_portfolios` - Portfolio rebalancing
12. `rebalancing_subscriptions` - Rebalancing subscriptions
13. `rebalancing_runs` - Rebalancing history
14. `oauth_authorizations` - OAuth codes
15. `oauth_access_tokens` - OAuth tokens

## 📋 Migration Files to Apply

```
supabase/migrations/20250108_account_documents.sql
supabase/migrations/20250109_ach_relationships.sql
supabase/migrations/20250109_bank_relationships.sql
supabase/migrations/20250109_corporate_actions.sql
supabase/migrations/20250109_kyc_submissions.sql
supabase/migrations/20250109_oauth_management.sql
supabase/migrations/20250109_options_positions.sql
supabase/migrations/20250109_rebalancing.sql
supabase/migrations/20250109_transfers.sql
supabase/migrations/20250109_watchlists.sql
```

## ⏭️ Next Steps

**Task 1.3: Apply Missing Migrations**
1. Choose migration method (CLI or manual)
2. Apply migrations in order
3. Verify foreign keys and indexes
4. Run verification script to confirm
5. Test with sample data

## 🔗 Related Bug Fixes

These missing tables are likely causing:
- ❌ Transfers 401 Error (Task 5)
- ❌ Portfolio History 404 (Task 4)
- ❌ Market quotes issues (Task 2)

## 📞 Support

If you encounter issues:
1. Check Supabase Dashboard for error messages
2. Review migration file syntax
3. Verify database permissions
4. Check RLS policies

---

**Last Updated:** November 15, 2025  
**Status:** Task 1.2 Complete, Ready for Task 1.3
