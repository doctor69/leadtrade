# Schema Recovery Instructions

## What Happened

The migration `006_consolidated_mvp_schema.sql` was accidentally applied, which dropped and recreated several tables including:
- `profiles` (your profile data was lost)
- `alpaca_accounts` (your Alpaca account link was lost)
- `copy_trading_subscriptions`

## Current State

Your database now has the "clean" schema from that migration, which includes:
- ✅ `profiles` table (empty, needs to be repopulated)
- ✅ `alpaca_accounts` table (empty, needs Alpaca re-link)
- ✅ `copy_trading_subscriptions` table (empty)
- ✅ `app_settings` table
- ✅ `leaderboard_stats` table (newly added)
- ✅ All other tables from previous migrations

## To Get Current Schema

Since Docker is not running, you can get the current schema from Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl/sql/new
2. Run this query to see all tables:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

3. To export the full schema, use the Supabase Dashboard:
   - Go to Database → Backups
   - Or use the SQL Editor to run pg_dump commands

## What You Need to Do

### 1. Re-create Your Profile
Your profile should have been auto-created by the `handle_new_user()` trigger when you logged in. Check:
```sql
SELECT * FROM profiles WHERE email = 'your-email@example.com';
```

### 2. Re-link Your Alpaca Account
You'll need to go through the Alpaca OAuth flow again:
- Visit the account setup page
- Click "Connect Alpaca Account"
- Complete the OAuth flow

### 3. Verify Other Data
Check if any other important data was affected:
```sql
-- Check what tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check if you have any data in key tables
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM alpaca_accounts;
SELECT COUNT(*) FROM securities_cache;
```

## Prevention for Future

1. **Always backup before migrations**: Use Supabase Dashboard → Database → Backups
2. **Test migrations locally first**: Use Docker + local Supabase
3. **Review DROP statements**: Never run migrations with DROP TABLE on production without backup
4. **Use migration repair carefully**: Only repair migrations that haven't been applied yet

## Current Migration Files

All old migration files have been moved to:
`supabase/migrations/backup_20260126_161321/`

You can restore them if needed, but it's better to start fresh with the current schema.
