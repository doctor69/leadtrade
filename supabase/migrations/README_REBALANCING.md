# Rebalancing API Database Schema

This migration creates the database schema for the Alpaca Rebalancing API integration.

## Overview

The rebalancing system allows users to create portfolio templates with target asset weights and automatically rebalance accounts to maintain those allocations.

## Tables Created

### `rebalancing_portfolios`

Stores portfolio definitions with target weights and rebalancing rules.

**Columns:**
- `id` (UUID): Primary key
- `account_id` (UUID): Reference to user_profiles
- `alpaca_portfolio_id` (TEXT): Unique Alpaca portfolio ID
- `name` (TEXT): Portfolio name
- `description` (TEXT): Optional description
- `weights` (JSONB): Target asset weights as `{ "symbol": weight }`
- `cooldown_days` (INTEGER): Minimum days between rebalancing runs
- `rebalance_conditions` (JSONB): Conditions for automatic rebalancing
- `status` (TEXT): Portfolio status (active, inactive, deleted)
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Indexes:**
- `idx_rebalancing_portfolios_account_id`: For user portfolio lookups
- `idx_rebalancing_portfolios_alpaca_id`: For Alpaca ID lookups
- `idx_rebalancing_portfolios_status`: For status filtering

**Constraints:**
- Weights must be valid JSONB
- Status must be one of: active, inactive, deleted
- Cooldown days must be non-negative

### `rebalancing_subscriptions`

Links accounts to portfolios for automatic rebalancing.

**Columns:**
- `id` (UUID): Primary key
- `portfolio_id` (UUID): Reference to rebalancing_portfolios
- `account_id` (UUID): Reference to user_profiles
- `alpaca_subscription_id` (TEXT): Unique Alpaca subscription ID
- `allocation_percentage` (DECIMAL): Percentage of account allocated (0-100)
- `is_active` (BOOLEAN): Whether subscription is active
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Indexes:**
- `idx_rebalancing_subscriptions_portfolio_id`: For portfolio subscription lookups
- `idx_rebalancing_subscriptions_account_id`: For account subscription lookups
- `idx_rebalancing_subscriptions_alpaca_id`: For Alpaca ID lookups
- `idx_rebalancing_subscriptions_active`: For active subscription filtering

**Constraints:**
- Allocation percentage must be between 0 and 100
- Unique constraint on (portfolio_id, account_id)

### `rebalancing_runs`

Tracks execution history of rebalancing operations.

**Columns:**
- `id` (UUID): Primary key
- `portfolio_id` (UUID): Reference to rebalancing_portfolios
- `alpaca_run_id` (TEXT): Unique Alpaca run ID
- `type` (TEXT): Run type (manual, automatic, scheduled)
- `status` (TEXT): Run status (pending, in_progress, completed, failed, canceled)
- `reason` (TEXT): Optional reason for rebalancing
- `orders` (JSONB): Array of order IDs created during run
- `failed_orders` (JSONB): Array of failed order details
- `skipped_orders` (JSONB): Array of skipped order details
- `error_message` (TEXT): Error message if failed
- `started_at` (TIMESTAMP): Run start time
- `completed_at` (TIMESTAMP): Run completion time
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Indexes:**
- `idx_rebalancing_runs_portfolio_id`: For portfolio run lookups
- `idx_rebalancing_runs_alpaca_id`: For Alpaca ID lookups
- `idx_rebalancing_runs_status`: For status filtering
- `idx_rebalancing_runs_type`: For type filtering
- `idx_rebalancing_runs_created_at`: For chronological ordering

**Constraints:**
- Type must be one of: manual, automatic, scheduled
- Status must be one of: pending, in_progress, completed, failed, canceled

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

### Portfolio Policies
- Users can view their own portfolios
- Users can create portfolios for their own account
- Users can update their own portfolios
- Users can delete their own portfolios

### Subscription Policies
- Users can view subscriptions for their portfolios or their own subscriptions
- Users can create subscriptions for their own account
- Users can update their own subscriptions
- Users can delete their own subscriptions

### Run Policies
- Users can view runs for their portfolios
- Users can create runs for their portfolios
- Users can update runs for their portfolios
- Users can delete runs for their portfolios

## Automatic Timestamp Updates

All tables have triggers that automatically update the `updated_at` column on any UPDATE operation.

## Usage Example

```sql
-- Create a portfolio
INSERT INTO rebalancing_portfolios (account_id, name, weights, cooldown_days)
VALUES (
  'user-uuid',
  'Balanced Growth',
  '{"SPY": 0.6, "AGG": 0.4}'::jsonb,
  30
);

-- Subscribe an account to the portfolio
INSERT INTO rebalancing_subscriptions (portfolio_id, account_id, allocation_percentage)
VALUES (
  'portfolio-uuid',
  'account-uuid',
  75.00
);

-- Create a rebalancing run
INSERT INTO rebalancing_runs (portfolio_id, type, status)
VALUES (
  'portfolio-uuid',
  'manual',
  'pending'
);
```

## Migration File

**File:** `20250109_rebalancing.sql`

**Applied:** January 2025

## Related Documentation

- [Rebalancing API Documentation](../../docs/REBALANCING_API.md)
- [Alpaca Rebalancing API](https://alpaca.markets/docs/broker/api-references/rebalancing/)

## Verification

To verify the schema was created correctly:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'rebalancing_%';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'rebalancing_%';

-- Check policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename LIKE 'rebalancing_%';
```

## Rollback

To rollback this migration:

```sql
-- Drop tables (will cascade to related data)
DROP TABLE IF EXISTS rebalancing_runs CASCADE;
DROP TABLE IF EXISTS rebalancing_subscriptions CASCADE;
DROP TABLE IF EXISTS rebalancing_portfolios CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_rebalancing_updated_at() CASCADE;
```

## Notes

- Portfolio weights must sum to 1.0 (100%) - this is validated in the application layer
- Cooldown periods prevent excessive rebalancing and transaction costs
- Drift thresholds in rebalance_conditions determine when automatic rebalancing triggers
- Failed and skipped orders are tracked for audit and debugging purposes
