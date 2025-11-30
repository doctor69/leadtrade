# Database Setup Guide

## Current Issue
Your database is missing several required tables, which is causing the page refresh issues and errors. Here's what needs to be fixed:

## Missing Tables
- ❌ `app_settings` - Stores application configuration
- ❌ `user_portfolios` - Stores user portfolio data  
- ❌ `user_positions` - Stores individual stock positions
- ❌ `copy_trading_subscriptions` - Copy trading relationships
- ❌ `trade_executions` - Leader trade records
- ❌ `copied_trades` - Follower trade records
- ❌ `trade_notifications` - Real-time notifications

## Quick Fix Steps

### Step 1: Apply Database Migrations

1. **Go to your Supabase Dashboard**:
   - Visit https://supabase.com/dashboard
   - Select your project: `bfbqlzpbkivyrnjkvqgl`

2. **Open SQL Editor**:
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Apply Migration 1** (Copy Trading Schema):
   - Copy the entire contents of `supabase/migrations/001_copy_trading_schema.sql`
   - Paste into the SQL editor
   - Click "Run" to execute

4. **Apply Migration 2** (Trade Notifications):
   - Copy the entire contents of `supabase/migrations/002_trade_notifications.sql`
   - Paste into the SQL editor
   - Click "Run" to execute

5. **Apply Migration 3** (Missing Tables):
   - Copy the entire contents of `supabase/migrations/003_missing_tables.sql`
   - Paste into the SQL editor
   - Click "Run" to execute

### Step 2: Verify Tables

Run this command to check if tables were created:
```bash
node check-database.js
```

You should see all tables marked with ✅.

### Step 3: Test the Application

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Visit `/signin` and sign in
3. Go to `/dashboard` - it should load without errors
4. Check the browser console - no more 404 errors

## What Each Migration Does

### Migration 1 (001_copy_trading_schema.sql)
- Adds copy trading fields to `profiles` table
- Creates `copy_trading_subscriptions` table
- Creates `trade_executions` table  
- Creates `copied_trades` table
- Sets up Row Level Security policies
- Creates performance indexes

### Migration 2 (002_trade_notifications.sql)
- Creates `trade_notifications` table
- Sets up RLS policies for notifications
- Creates cleanup function for old notifications

### Migration 3 (003_missing_tables.sql)
- Creates `app_settings` table with default values
- Creates `user_portfolios` table
- Creates `user_positions` table
- Updates `handle_new_user()` function to create initial portfolio
- Adds missing columns to `profiles` table

## Expected Results

After applying all migrations, you should have:

1. **No more 404 errors** for:
   - `/api/alpaca/portfolio-history`
   - Supabase table queries

2. **No more page refreshes** - the dashboard will load smoothly

3. **Working trade functionality** - you can test placing trades

4. **Proper user profiles** - new users get $100k starting balance

## Testing Trade Functionality

Once the database is set up, you can test:

1. **Sign up/Sign in** - Should work without errors
2. **Dashboard loading** - Should show portfolio data
3. **Trade placement** - Try placing a test trade
4. **Copy trading** - Set up leader/follower relationships

## Troubleshooting

If you still see errors after applying migrations:

1. **Check browser console** for specific error messages
2. **Run the database check**: `node check-database.js`
3. **Verify environment variables** are correct
4. **Check Supabase dashboard** for any failed queries

## Manual SQL (If Migrations Fail)

If the migration files don't work, you can run individual SQL commands:

```sql
-- Create app_settings table
CREATE TABLE public.app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.app_settings (setting_key, setting_value, description) VALUES
('trading_mode', 'paper', 'Global trading mode: paper or live'),
('app_name', 'LEADTRADE', 'Application name'),
('maintenance_mode', 'false', 'Enable/disable maintenance mode');
```

Continue with the other tables as needed.