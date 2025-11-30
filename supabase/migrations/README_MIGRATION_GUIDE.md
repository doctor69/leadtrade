# Database Schema Migration Guide

## Overview

This migration consolidates the database schema to focus on essential MVP functionality:
- User profiles and preferences
- Alpaca account references (no trade data storage)
- Copy trading relationships
- Application settings

## What's Removed

The following tables have been removed as trade data will be fetched from Alpaca APIs:
- `trade_executions` - Trade data now fetched from Alpaca
- `copied_trades` - Copy trading execution tracked via Alpaca
- `user_positions` - Position data fetched from Alpaca
- `orders` - Order data fetched from Alpaca
- `user_portfolios` - Portfolio data fetched from Alpaca
- `portfolio_history` - Historical data fetched from Alpaca
- `account_activities` - Activity data fetched from Alpaca
- `watchlists` - Watchlist data managed via Alpaca
- `trade_notifications` - Notifications handled in-app
- `funding_transactions` - Funding handled via Alpaca
- `user_details` - KYC data stored in Alpaca

## What's Kept

Essential tables for MVP functionality:
- `profiles` - User profiles with copy trading preferences
- `alpaca_accounts` - References to Alpaca accounts (IDs only)
- `copy_trading_subscriptions` - Leader-follower relationships
- `app_settings` - Application configuration

## Migration Steps

1. **Backup existing data** (if needed):
   ```sql
   -- Export any essential data before migration
   COPY public.profiles TO '/tmp/profiles_backup.csv' WITH CSV HEADER;
   COPY public.copy_trading_subscriptions TO '/tmp/subscriptions_backup.csv' WITH CSV HEADER;
   ```

2. **Apply the migration**:
   ```bash
   supabase db reset --linked
   ```

3. **Verify the schema**:
   ```sql
   -- Check that essential tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

## Key Features

### Optimized Schema
- Minimal data storage focused on user relationships
- All trade data fetched from Alpaca APIs in real-time
- Proper indexes for performance
- Row Level Security (RLS) policies

### Copy Trading Support
- Leader-follower relationships with allocation percentages
- Validation to prevent over-allocation (max 100%)
- Public profile visibility for leaders who share trades

### Theme Management
- Theme preferences stored in profiles (backup to cookies)
- Cookie-first approach for theme persistence

## Functions Available

- `get_leaderboard_data()` - Returns public leaders with follower counts
- `validate_total_allocation()` - Ensures allocation doesn't exceed 100%
- `handle_new_user()` - Creates profile for new users

## RLS Policies

All tables have proper Row Level Security:
- Users can only access their own data
- Public profiles visible for copy trading leaders
- App settings readable by all, writable by service role

## Performance Optimizations

- Indexes on frequently queried columns
- Partial indexes for boolean filters
- Optimized queries for leaderboard functionality