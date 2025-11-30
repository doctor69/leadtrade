# Expected Database Tables

This document lists all expected tables in the LeadTrade database based on the migration files in `supabase/migrations/`.

## Core Tables (MVP Schema)

### 1. profiles
**Migration:** `006_consolidated_mvp_schema.sql`

User profiles with copy trading preferences and theme settings.

**Columns:**
- `id` (UUID, PK) - References auth.users(id)
- `username` (TEXT, UNIQUE)
- `full_name` (TEXT)
- `email` (TEXT)
- `avatar_url` (TEXT)
- `share_trades` (BOOLEAN) - Whether user shares trades publicly
- `show_asset_amounts` (BOOLEAN) - Whether to show dollar amounts
- `theme_color` (TEXT) - Default: '#ef4444'
- `trading_mode` (TEXT) - 'paper' or 'live', Default: 'paper'
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_profiles_username`
- `idx_profiles_share_trades` (WHERE share_trades = true)
- `idx_profiles_trading_mode`
- `idx_profiles_user_id`
- `idx_profiles_email`

### 2. alpaca_accounts
**Migration:** `006_consolidated_mvp_schema.sql`, `20241209_streamlined_setup.sql`

Alpaca account references - no trade data stored locally.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users) - NOT NULL
- `alpaca_account_id` (TEXT, UNIQUE) - NOT NULL
- `alpaca_account_number` (TEXT)
- `account_status` (TEXT) - Default: 'ACTIVE'
- `account_type` (TEXT) - 'paper' or 'live', Default: 'paper'
- `kyc_status` (TEXT) - 'pending', 'approved', or 'rejected', Default: 'pending'
- `kyc_data` (JSONB)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Constraints:**
- UNIQUE(user_id, account_type) - One account per type per user

**Indexes:**
- `idx_alpaca_accounts_user_id`
- `idx_alpaca_accounts_alpaca_id`
- `idx_alpaca_accounts_type`
- `idx_alpaca_accounts_status`

### 3. copy_trading_subscriptions
**Migration:** `006_consolidated_mvp_schema.sql`

Leader-follower relationships for copy trading.

**Columns:**
- `id` (UUID, PK)
- `follower_id` (UUID, FK to auth.users) - NOT NULL
- `leader_id` (UUID, FK to auth.users) - NOT NULL
- `allocation_percentage` (DECIMAL(5,2)) - NOT NULL, CHECK > 0 AND <= 100
- `is_active` (BOOLEAN) - Default: true
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Constraints:**
- UNIQUE(follower_id, leader_id) - Prevent duplicate subscriptions
- Total allocation validation via trigger

**Indexes:**
- `idx_copy_trading_subscriptions_follower`
- `idx_copy_trading_subscriptions_leader`
- `idx_copy_trading_subscriptions_active` (WHERE is_active = true)

### 4. app_settings
**Migration:** `006_consolidated_mvp_schema.sql`

Application-wide configuration settings.

**Columns:**
- `id` (UUID, PK)
- `setting_key` (TEXT, UNIQUE) - NOT NULL
- `setting_value` (TEXT) - NOT NULL
- `description` (TEXT)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_app_settings_key`

**Default Settings:**
- `trading_mode`: 'paper'
- `app_name`: 'LEADTRADE'
- `maintenance_mode`: 'false'

## Alpaca Integration Tables

### 5. securities_cache
**Migration:** `20241026_202400_securities_cache_only.sql`

Cached securities/assets data from Alpaca API.

**Columns:**
- `id` (UUID, PK)
- `asset_id` (TEXT, UNIQUE) - NOT NULL
- `symbol` (TEXT) - NOT NULL
- `name` (TEXT) - NOT NULL
- `asset_class` (TEXT) - 'us_equity', 'crypto', or 'us_option', NOT NULL
- `exchange` (TEXT) - NOT NULL
- `status` (TEXT) - 'active' or 'inactive', NOT NULL
- `tradable` (BOOLEAN) - Default: false
- `marginable` (BOOLEAN) - Default: false
- `shortable` (BOOLEAN) - Default: false
- `easy_to_borrow` (BOOLEAN) - Default: false
- `fractionable` (BOOLEAN) - Default: false
- `min_order_size` (TEXT)
- `min_trade_increment` (TEXT)
- `price_increment` (TEXT)
- `maintenance_margin_requirement` (TEXT)
- `attributes` (JSONB) - Default: '[]'
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)
- `last_synced_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_securities_cache_symbol`
- `idx_securities_cache_asset_class`
- `idx_securities_cache_exchange`
- `idx_securities_cache_status`
- `idx_securities_cache_tradable`
- `idx_securities_cache_last_synced`
- `idx_securities_cache_tradable_active` (WHERE tradable = true AND status = 'active')
- `idx_securities_cache_class_status`

**Views:**
- `tradable_securities` - Active, tradable securities

### 6. account_documents
**Migration:** `20250108_account_documents.sql`

Document metadata for KYC and compliance uploads.

**Columns:**
- `id` (UUID, PK)
- `account_id` (UUID, FK to auth.users) - NOT NULL
- `alpaca_document_id` (TEXT, UNIQUE)
- `document_type` (TEXT) - 'identity_verification', 'address_verification', 'w8ben', 'other', NOT NULL
- `document_sub_type` (TEXT)
- `mime_type` (TEXT) - 'application/pdf', 'image/jpeg', 'image/png'
- `file_size_bytes` (INTEGER) - CHECK <= 10485760 (10MB)
- `status` (TEXT) - 'pending', 'uploaded', 'verified', 'rejected', 'failed', Default: 'pending'
- `uploaded_at` (TIMESTAMP WITH TIME ZONE)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_account_documents_account_id`
- `idx_account_documents_alpaca_id` (WHERE alpaca_document_id IS NOT NULL)
- `idx_account_documents_type`
- `idx_account_documents_status`
- `idx_account_documents_account_type`
- `idx_account_documents_uploaded_at` (DESC)

### 7. ach_relationships
**Migration:** `20250109_ach_relationships.sql`

ACH relationship information for bank account linking.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users) - NOT NULL
- `alpaca_ach_id` (TEXT, UNIQUE) - NOT NULL
- `account_id` (UUID, FK to user_profiles)
- `status` (TEXT) - 'queued', 'approved', 'pending', 'sent_to_clearing', 'rejected', 'canceled', Default: 'queued'
- `account_owner_name` (TEXT) - NOT NULL
- `bank_account_type` (TEXT) - 'checking' or 'savings', NOT NULL
- `bank_account_number_last4` (TEXT)
- `bank_routing_number` (TEXT) - NOT NULL
- `nickname` (TEXT)
- `processor_token` (TEXT) - Plaid processor token
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_ach_relationships_user_id`
- `idx_ach_relationships_account_id`
- `idx_ach_relationships_alpaca_ach_id`
- `idx_ach_relationships_status`
- `idx_ach_relationships_bank_routing_number`

### 8. bank_relationships
**Migration:** `20250109_bank_relationships.sql`

Bank relationship information for wire transfers.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users) - NOT NULL
- `alpaca_bank_id` (TEXT, UNIQUE) - NOT NULL
- `account_id` (UUID, FK to user_profiles)
- `name` (TEXT) - NOT NULL
- `bank_code` (TEXT) - NOT NULL
- `bank_code_type` (TEXT) - 'aba' or 'bic', NOT NULL
- `account_number_last4` (TEXT)
- `country` (TEXT)
- `state_province` (TEXT)
- `postal_code` (TEXT)
- `city` (TEXT)
- `street_address` (TEXT)
- `status` (TEXT) - Default: 'pending'
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_bank_relationships_user_id`
- `idx_bank_relationships_account_id`
- `idx_bank_relationships_alpaca_bank_id`
- `idx_bank_relationships_status`

### 9. corporate_actions
**Migration:** `20250109_corporate_actions.sql`

Corporate action announcements (dividends, mergers, spinoffs, splits).

**Columns:**
- `id` (UUID, PK)
- `alpaca_ca_id` (TEXT, UNIQUE) - NOT NULL
- `corporate_action_id` (TEXT) - NOT NULL
- `ca_type` (TEXT) - 'dividend', 'merger', 'spinoff', 'split', NOT NULL
- `ca_sub_type` (TEXT)
- `initiating_symbol` (TEXT) - NOT NULL
- `initiating_original_cusip` (TEXT) - NOT NULL
- `target_symbol` (TEXT)
- `target_cusip` (TEXT)
- `declaration_date` (DATE)
- `ex_date` (DATE) - NOT NULL
- `record_date` (DATE) - NOT NULL
- `payable_date` (DATE) - NOT NULL
- `cash` (DECIMAL(15,6))
- `old_rate` (DECIMAL(15,6))
- `new_rate` (DECIMAL(15,6))
- `details` (JSONB)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_corporate_actions_alpaca_ca_id`
- `idx_corporate_actions_ca_type`
- `idx_corporate_actions_initiating_symbol`
- `idx_corporate_actions_initiating_cusip`
- `idx_corporate_actions_target_symbol` (WHERE target_symbol IS NOT NULL)
- `idx_corporate_actions_declaration_date` (WHERE declaration_date IS NOT NULL)
- `idx_corporate_actions_ex_date`
- `idx_corporate_actions_record_date`
- `idx_corporate_actions_payable_date`

### 10. kyc_submissions
**Migration:** `20250109_kyc_submissions.sql`

KYC/CIP verification submissions and results.

**Columns:**
- `id` (UUID, PK)
- `account_id` (UUID, FK to user_profiles) - NOT NULL
- `alpaca_account_id` (TEXT)
- `provider_name` (TEXT) - e.g., 'onfido', 'manual', NOT NULL
- `submission_type` (TEXT) - 'cip', 'kyc', 'document', 'photo', 'identity', 'watchlist', NOT NULL
- `status` (TEXT) - 'pending', 'approved', 'rejected', 'review', Default: 'pending'
- `risk_level` (TEXT) - 'low', 'medium', 'high'
- `verification_results` (JSONB)
- `failure_reasons` (TEXT[])
- `submitted_at` (TIMESTAMP WITH TIME ZONE)
- `completed_at` (TIMESTAMP WITH TIME ZONE)
- `expires_at` (TIMESTAMP WITH TIME ZONE)
- `metadata` (JSONB)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_kyc_submissions_account_id`
- `idx_kyc_submissions_alpaca_account_id`
- `idx_kyc_submissions_status`
- `idx_kyc_submissions_provider`
- `idx_kyc_submissions_submitted_at` (DESC)

### 11. onfido_sdk_tokens
**Migration:** `20250109_kyc_submissions.sql`

Onfido SDK token generation tracking.

**Columns:**
- `id` (UUID, PK)
- `account_id` (UUID, FK to user_profiles) - NOT NULL
- `alpaca_account_id` (TEXT)
- `sdk_token` (TEXT) - NOT NULL
- `applicant_id` (TEXT)
- `expires_at` (TIMESTAMP WITH TIME ZONE) - NOT NULL
- `used` (BOOLEAN) - Default: false
- `created_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_onfido_sdk_tokens_account_id`
- `idx_onfido_sdk_tokens_expires_at`

### 12. oauth_authorizations
**Migration:** `20250109_oauth_management.sql`

OAuth authorization codes for third-party integrations.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users) - NOT NULL
- `client_id` (TEXT) - NOT NULL
- `code` (TEXT, UNIQUE) - NOT NULL
- `scope` (TEXT) - NOT NULL
- `redirect_uri` (TEXT) - NOT NULL
- `expires_at` (TIMESTAMP WITH TIME ZONE) - NOT NULL
- `used` (BOOLEAN) - Default: false
- `created_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_oauth_authorizations_user_id`
- `idx_oauth_authorizations_client_id`
- `idx_oauth_authorizations_code`
- `idx_oauth_authorizations_expires_at`

### 13. oauth_access_tokens
**Migration:** `20250109_oauth_management.sql`

OAuth access tokens and refresh tokens.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users) - NOT NULL
- `client_id` (TEXT) - NOT NULL
- `access_token` (TEXT, UNIQUE) - NOT NULL
- `refresh_token` (TEXT, UNIQUE)
- `scope` (TEXT) - NOT NULL
- `expires_at` (TIMESTAMP WITH TIME ZONE) - NOT NULL
- `revoked` (BOOLEAN) - Default: false
- `created_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_oauth_access_tokens_user_id`
- `idx_oauth_access_tokens_client_id`
- `idx_oauth_access_tokens_access_token`
- `idx_oauth_access_tokens_refresh_token`
- `idx_oauth_access_tokens_expires_at`

### 14. options_positions
**Migration:** `20250109_options_positions.sql`

Options positions with detailed contract information.

**Columns:**
- `id` (UUID, PK)
- `account_id` (UUID, FK to auth.users) - NOT NULL
- `alpaca_position_id` (TEXT)
- `contract_id` (TEXT) - NOT NULL
- `symbol` (TEXT) - NOT NULL (e.g., AAPL250117C00150000)
- `underlying_symbol` (TEXT) - NOT NULL (e.g., AAPL)
- `option_type` (TEXT) - 'call' or 'put', NOT NULL
- `strike_price` (DECIMAL(15,4)) - NOT NULL
- `expiration_date` (DATE) - NOT NULL
- `quantity` (DECIMAL(10,4)) - NOT NULL
- `side` (TEXT) - 'long' or 'short', NOT NULL
- `avg_entry_price` (DECIMAL(15,4))
- `current_price` (DECIMAL(15,4))
- `market_value` (DECIMAL(15,2))
- `cost_basis` (DECIMAL(15,2))
- `unrealized_pl` (DECIMAL(15,2))
- `unrealized_pl_percent` (DECIMAL(8,4))
- `status` (TEXT) - 'open', 'closed', 'expired', 'exercised', 'assigned', Default: 'open'
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)
- `closed_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_options_positions_account_id`
- `idx_options_positions_alpaca_id` (WHERE alpaca_position_id IS NOT NULL)
- `idx_options_positions_contract_id`
- `idx_options_positions_symbol`
- `idx_options_positions_underlying`
- `idx_options_positions_status`
- `idx_options_positions_expiration`
- `idx_options_positions_account_status`
- `idx_options_positions_account_underlying`
- `idx_options_positions_updated_at` (DESC)

### 15. transfers
**Migration:** `20250109_transfers.sql`

Transfer history for ACH, wire, and sandbox transfers.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users) - NOT NULL
- `account_id` (UUID, FK to user_profiles)
- `alpaca_transfer_id` (TEXT, UNIQUE)
- `transfer_type` (TEXT) - 'ach', 'wire', 'sandbox', NOT NULL
- `direction` (TEXT) - 'INCOMING' or 'OUTGOING', NOT NULL
- `amount` (DECIMAL(15,2)) - NOT NULL, CHECK > 0
- `status` (TEXT) - 'queued', 'pending', 'sent_to_clearing', 'approved', 'canceled', 'rejected', Default: 'queued'
- `timing` (TEXT) - 'immediate' or 'next_day'
- `relationship_id` (TEXT) - ACH relationship ID
- `bank_id` (TEXT) - Bank relationship ID for wire
- `additional_information` (TEXT) - Required for wire
- `fee_payment_method` (TEXT) - 'user' or 'invoice'
- `expires_at` (TIMESTAMP WITH TIME ZONE)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)
- `completed_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_transfers_user_id`
- `idx_transfers_account_id`
- `idx_transfers_alpaca_id`
- `idx_transfers_status`
- `idx_transfers_direction`
- `idx_transfers_type`
- `idx_transfers_created_at` (DESC)
- `idx_transfers_user_status_created`

### 16. watchlists
**Migration:** `20250109_watchlists.sql`

User watchlists for tracking securities.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users) - NOT NULL
- `account_id` (UUID, FK to profiles)
- `alpaca_watchlist_id` (TEXT, UNIQUE)
- `name` (TEXT) - NOT NULL, CHECK length > 0
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_watchlists_user_id`
- `idx_watchlists_account_id`
- `idx_watchlists_alpaca_id`
- `idx_watchlists_name`

### 17. watchlist_assets
**Migration:** `20250109_watchlists.sql`

Junction table linking watchlists to securities.

**Columns:**
- `watchlist_id` (UUID, FK to watchlists) - NOT NULL, PK
- `symbol` (TEXT) - NOT NULL, PK, CHECK length > 0
- `added_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_watchlist_assets_symbol`
- `idx_watchlist_assets_watchlist_id`

### 18. rebalancing_portfolios
**Migration:** `20250109_rebalancing.sql`

Portfolio definitions with target asset weights and rebalancing rules.

**Columns:**
- `id` (UUID, PK)
- `account_id` (UUID, FK to user_profiles)
- `alpaca_portfolio_id` (TEXT, UNIQUE)
- `name` (TEXT) - NOT NULL
- `description` (TEXT)
- `weights` (JSONB) - NOT NULL, Target weights as { "symbol": weight }
- `cooldown_days` (INTEGER) - NOT NULL, Default: 0, Minimum days between rebalancing runs
- `rebalance_conditions` (JSONB) - Conditions for automatic rebalancing
- `status` (TEXT) - 'active', 'inactive', or 'deleted', Default: 'active'
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_rebalancing_portfolios_account_id`
- `idx_rebalancing_portfolios_alpaca_id`
- `idx_rebalancing_portfolios_status`

### 19. rebalancing_subscriptions
**Migration:** `20250109_rebalancing.sql`

Account subscriptions to rebalancing portfolios.

**Columns:**
- `id` (UUID, PK)
- `portfolio_id` (UUID, FK to rebalancing_portfolios) - NOT NULL
- `account_id` (UUID, FK to user_profiles) - NOT NULL
- `alpaca_subscription_id` (TEXT, UNIQUE)
- `allocation_percentage` (DECIMAL(5,2)) - NOT NULL, CHECK >= 0 AND <= 100
- `is_active` (BOOLEAN) - Default: true
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Constraints:**
- UNIQUE(portfolio_id, account_id) - One subscription per portfolio per account

**Indexes:**
- `idx_rebalancing_subscriptions_portfolio_id`
- `idx_rebalancing_subscriptions_account_id`
- `idx_rebalancing_subscriptions_alpaca_id`
- `idx_rebalancing_subscriptions_active`

### 20. rebalancing_runs
**Migration:** `20250109_rebalancing.sql`

Execution history of rebalancing operations.

**Columns:**
- `id` (UUID, PK)
- `portfolio_id` (UUID, FK to rebalancing_portfolios) - NOT NULL
- `alpaca_run_id` (TEXT, UNIQUE)
- `type` (TEXT) - 'manual', 'automatic', or 'scheduled', NOT NULL
- `status` (TEXT) - 'pending', 'in_progress', 'completed', 'failed', or 'canceled', Default: 'pending'
- `reason` (TEXT)
- `orders` (JSONB) - Default: '[]', Array of order IDs created during run
- `failed_orders` (JSONB) - Default: '[]', Array of failed order details
- `skipped_orders` (JSONB) - Default: '[]', Array of skipped order details
- `error_message` (TEXT)
- `started_at` (TIMESTAMP WITH TIME ZONE)
- `completed_at` (TIMESTAMP WITH TIME ZONE)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_rebalancing_runs_portfolio_id`
- `idx_rebalancing_runs_alpaca_id`
- `idx_rebalancing_runs_status`
- `idx_rebalancing_runs_type`
- `idx_rebalancing_runs_created_at` (DESC)

## Audit Tables

### 21. rollback_audit (if exists)
**Migration:** `20241209_add_rollback_audit_tables.sql`

Audit trail for account rollback operations (if migration was applied).

## Summary

**Total Expected Tables:** 21 core tables + 1 audit table (optional)

**Table Categories:**
- **Core MVP:** 4 tables (profiles, alpaca_accounts, copy_trading_subscriptions, app_settings)
- **Securities & Market Data:** 1 table (securities_cache)
- **Documents & KYC:** 4 tables (account_documents, kyc_submissions, onfido_sdk_tokens, corporate_actions)
- **Banking & Transfers:** 3 tables (ach_relationships, bank_relationships, transfers)
- **Trading:** 2 tables (options_positions, watchlists + watchlist_assets)
- **Portfolio Management:** 3 tables (rebalancing_portfolios, rebalancing_subscriptions, rebalancing_runs)
- **OAuth:** 2 tables (oauth_authorizations, oauth_access_tokens)
- **Audit:** 1 table (rollback_audit - optional)

**All tables have:**
- Row Level Security (RLS) enabled
- Appropriate indexes for query performance
- `created_at` and `updated_at` timestamps
- Automatic `updated_at` triggers
- Comprehensive RLS policies for data security
