# Alpaca-Related Migrations Inventory

## Overview
This document lists all database migrations related to Alpaca Broker API integration and the tables they create.

## Core Schema Migration

### 006_consolidated_mvp_schema.sql
**Purpose**: Base schema for user profiles and copy trading functionality

**Tables Created**:
- `profiles` - User profiles with copy trading preferences
- `alpaca_accounts` - Alpaca brokerage account information
- `copy_trading_subscriptions` - Copy trading relationships between users

**Key Features**:
- Drops legacy trade data tables (trade_executions, copied_trades, user_positions, orders, etc.)
- Creates clean schema focused on Alpaca API integration
- Establishes RLS policies for data security

---

## Alpaca Account Management

### 20241209_fix_alpaca_accounts_rls.sql
**Purpose**: Fix RLS policies for alpaca_accounts table

**Tables Modified**:
- `alpaca_accounts` - Adds service role policy for Edge Functions

**Key Features**:
- Allows Edge Functions to manage Alpaca account records
- Ensures RLS is properly enabled

---

## Securities and Market Data

### 20241026_securities_cache.sql
**Purpose**: Cache securities data from Alpaca

**Tables Created**:
- `securities_cache` - Cached securities/assets data

### 20241026_202400_securities_cache_only.sql
**Purpose**: Updated securities cache schema

**Tables Created/Modified**:
- `securities_cache` - Enhanced securities caching

---

## Document Management

### 20250108_account_documents.sql
**Purpose**: Store document metadata for KYC/compliance

**Tables Created**:
- `account_documents` - Document metadata and status tracking

**Key Features**:
- Supports identity verification, address verification, W8BEN, and other documents
- 10MB file size limit
- Status tracking (pending, uploaded, verified, rejected, failed)
- RLS policies for user data isolation

---

## Banking and Funding

### 20250109_bank_relationships.sql
**Purpose**: Manage bank account relationships

**Tables Created**:
- `bank_relationships` - Bank account information for funding

**Key Features**:
- Supports both US (ABA routing) and international (BIC/SWIFT) banks
- Stores bank details and status
- RLS policies for secure access

### 20250109_ach_relationships.sql
**Purpose**: Manage ACH relationships for transfers

**Tables Created**:
- `ach_relationships` - ACH relationship details

**Key Features**:
- Supports checking and savings accounts
- Status tracking (queued, approved, pending, sent_to_clearing, rejected, canceled)
- Plaid processor token integration
- RLS policies for user data security

### 20250109_transfers.sql
**Purpose**: Track transfer operations

**Tables Created**:
- `transfers` - Transfer history and status

**Key Features**:
- Supports multiple transfer types (ach, wire, journal)
- Direction tracking (incoming, outgoing)
- Status monitoring
- Amount and fee tracking

---

## KYC and Compliance

### 20250109_kyc_submissions.sql
**Purpose**: Track KYC/CIP verification submissions

**Tables Created**:
- `kyc_submissions` - KYC verification submission tracking
- `onfido_sdk_tokens` - Onfido SDK token management

**Key Features**:
- Multiple submission types (cip, kyc, document, photo, identity, watchlist)
- Status tracking (pending, approved, rejected, review)
- Risk level assessment (low, medium, high)
- Provider-specific metadata storage
- Onfido integration support

---

## Corporate Actions

### 20250109_corporate_actions.sql
**Purpose**: Store corporate action announcements

**Tables Created**:
- `corporate_actions` - Corporate action data (dividends, mergers, spinoffs, splits)

**Key Features**:
- Supports dividend, merger, spinoff, and split actions
- Tracks important dates (declaration, ex-date, record, payable)
- Stores cash amounts and split ratios
- Comprehensive indexing for efficient queries
- Public read access for all authenticated users

---

## Options Trading

### 20250109_options_positions.sql
**Purpose**: Track options positions

**Tables Created**:
- `options_positions` - Options contract positions

**Key Features**:
- Detailed contract information (symbol, strike, expiration)
- Position metrics (quantity, P/L, market value)
- Call and put support
- Long and short positions
- Status tracking (open, closed, expired, exercised, assigned)
- Comprehensive indexing for performance

---

## OAuth Integration

### 20250109_oauth_management.sql
**Purpose**: OAuth 2.0 client management

**Tables Created**:
- `oauth_authorizations` - Authorization codes
- `oauth_access_tokens` - Access and refresh tokens

**Key Features**:
- Authorization code flow support
- Token expiration management
- Scope tracking
- Token revocation support
- Cleanup functions for expired data

---

## Portfolio Management

### 20250109_rebalancing.sql
**Purpose**: Portfolio rebalancing functionality

**Tables Created**:
- `rebalancing_portfolios` - Portfolio definitions with target weights
- `rebalancing_subscriptions` - Account subscriptions to portfolios
- `rebalancing_runs` - Rebalancing execution history

**Key Features**:
- Target weight management
- Cooldown period support
- Automatic rebalancing conditions
- Run history tracking
- Order tracking (successful, failed, skipped)

---

## Watchlists

### 20250109_watchlists.sql
**Purpose**: User watchlist management

**Tables Created**:
- `watchlists` - User watchlist definitions
- `watchlist_assets` - Symbols in watchlists

**Key Features**:
- Custom watchlist names
- Symbol tracking with timestamps
- Alpaca API synchronization
- RLS policies for user isolation

---

## Profile and User Management

### 20241209_streamlined_setup.sql
**Purpose**: Streamlined user setup

**Tables Modified**:
- User profile setup and initialization

### 20241209_verify_profiles_schema.sql
**Purpose**: Verify profiles schema

**Tables Verified**:
- `profiles` schema validation

### 20241209_fix_profile_creation.sql
**Purpose**: Fix profile creation issues

**Tables Modified**:
- `profiles` - Profile creation fixes

### 20241209_final_schema_cleanup.sql
**Purpose**: Final schema cleanup

**Tables Modified**:
- Various cleanup operations

---

## Audit and Rollback

### 20241209_add_rollback_audit_tables.sql
**Purpose**: Add audit tables for rollback functionality

**Tables Created**:
- Audit tables for tracking changes

### 20241209_disable_trigger_temporarily.sql
**Purpose**: Temporarily disable triggers

**Tables Modified**:
- Trigger management

---

## Summary

### Total Alpaca-Related Tables Created:
1. `profiles` - User profiles
2. `alpaca_accounts` - Alpaca account data
3. `copy_trading_subscriptions` - Copy trading relationships
4. `app_settings` - Application-wide configuration
5. `securities_cache` - Cached securities data
6. `account_documents` - Document metadata
7. `bank_relationships` - Bank account relationships
8. `ach_relationships` - ACH relationships
9. `transfers` - Transfer history
10. `kyc_submissions` - KYC verification tracking
11. `onfido_sdk_tokens` - Onfido SDK tokens
12. `corporate_actions` - Corporate action announcements
13. `options_positions` - Options positions
14. `oauth_authorizations` - OAuth authorization codes
15. `oauth_access_tokens` - OAuth access tokens
16. `rebalancing_portfolios` - Rebalancing portfolio definitions
17. `rebalancing_subscriptions` - Portfolio subscriptions
18. `rebalancing_runs` - Rebalancing execution history
19. `watchlists` - User watchlists
20. `watchlist_assets` - Watchlist symbols

### Migration Categories:
- **Core Schema**: 1 migration (006_consolidated_mvp_schema.sql)
- **Account Management**: 1 migration
- **Securities/Market Data**: 2 migrations
- **Documents**: 1 migration
- **Banking/Funding**: 3 migrations
- **KYC/Compliance**: 1 migration
- **Corporate Actions**: 1 migration
- **Options Trading**: 1 migration
- **OAuth**: 1 migration
- **Portfolio Management**: 1 migration
- **Watchlists**: 1 migration
- **Profile Management**: 4 migrations
- **Audit/Rollback**: 2 migrations

### Total Migrations: 20 Alpaca-related migrations

---

## Expected Tables in Production

All 20 tables listed above should exist in the production database for full Alpaca Broker API functionality.

## Verification Commands

```bash
# List all migration files
ls -la supabase/migrations/

# Check migration status
supabase db remote commit

# Apply all migrations
supabase db push
```

## Next Steps

1. Verify which tables currently exist in the database
2. Identify any missing tables
3. Apply missing migrations in chronological order
4. Verify foreign keys and indexes
5. Test with sample data
