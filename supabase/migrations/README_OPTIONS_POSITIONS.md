# Options Positions Schema

## Overview

The `options_positions` table stores options positions for user accounts, tracking detailed contract information, position metrics, and status.

## Migration File

- **File**: `20250109_options_positions.sql`
- **Created**: January 2025
- **Purpose**: Track options positions with comprehensive contract details and position metrics

## Table Structure

### options_positions

Stores options positions with detailed contract information and real-time position metrics.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Primary key (auto-generated) |
| account_id | UUID | No | Foreign key to auth.users(id) |
| alpaca_position_id | TEXT | Yes | Alpaca's position identifier |
| contract_id | TEXT | No | Alpaca options contract identifier |
| symbol | TEXT | No | Full options symbol (e.g., AAPL250117C00150000) |
| underlying_symbol | TEXT | No | Underlying stock symbol (e.g., AAPL) |
| option_type | TEXT | No | 'call' or 'put' |
| strike_price | DECIMAL(15,4) | No | Strike price of the option |
| expiration_date | DATE | No | Expiration date of the contract |
| quantity | DECIMAL(10,4) | No | Number of contracts |
| side | TEXT | No | 'long' (bought) or 'short' (sold) |
| avg_entry_price | DECIMAL(15,4) | Yes | Average entry price per contract |
| current_price | DECIMAL(15,4) | Yes | Current market price per contract |
| market_value | DECIMAL(15,2) | Yes | Current market value (quantity × current_price × 100) |
| cost_basis | DECIMAL(15,2) | Yes | Total cost basis of the position |
| unrealized_pl | DECIMAL(15,2) | Yes | Unrealized profit/loss |
| unrealized_pl_percent | DECIMAL(8,4) | Yes | Unrealized P/L as percentage |
| status | TEXT | No | Position status (default: 'open') |
| created_at | TIMESTAMP | No | Position creation timestamp |
| updated_at | TIMESTAMP | No | Last update timestamp |
| closed_at | TIMESTAMP | Yes | Position closure timestamp |

### Constraints

- **Primary Key**: `id`
- **Foreign Key**: `account_id` references `auth.users(id)` with CASCADE delete
- **Check Constraints**:
  - `option_type` must be 'call' or 'put'
  - `side` must be 'long' or 'short'
  - `status` must be one of: 'open', 'closed', 'expired', 'exercised', 'assigned'

## Indexes

The following indexes are created for optimal query performance:

1. `idx_options_positions_account_id` - Fast lookup by account
2. `idx_options_positions_alpaca_id` - Fast lookup by Alpaca position ID (partial index)
3. `idx_options_positions_contract_id` - Fast lookup by contract
4. `idx_options_positions_symbol` - Fast lookup by options symbol
5. `idx_options_positions_underlying` - Fast lookup by underlying stock
6. `idx_options_positions_status` - Fast filtering by status
7. `idx_options_positions_expiration` - Fast filtering by expiration date
8. `idx_options_positions_account_status` - Composite index for account + status queries
9. `idx_options_positions_account_underlying` - Composite index for account + underlying queries
10. `idx_options_positions_updated_at` - Fast sorting by update time

## Row Level Security (RLS)

RLS is enabled with the following policies:

1. **SELECT**: Users can view their own options positions
2. **INSERT**: Users can insert their own options positions
3. **UPDATE**: Users can update their own options positions
4. **DELETE**: Users can delete their own options positions

All policies enforce `auth.uid() = account_id` to ensure users can only access their own data.

## Triggers

### update_options_positions_updated_at

Automatically updates the `updated_at` timestamp whenever a row is modified.

## Usage Examples

### Insert a new options position

```sql
INSERT INTO options_positions (
  account_id,
  contract_id,
  symbol,
  underlying_symbol,
  option_type,
  strike_price,
  expiration_date,
  quantity,
  side,
  avg_entry_price,
  current_price,
  market_value,
  cost_basis,
  unrealized_pl,
  unrealized_pl_percent,
  status
) VALUES (
  'user-uuid-here',
  'contract_123',
  'AAPL250117C00150000',
  'AAPL',
  'call',
  150.00,
  '2025-01-17',
  10.0,
  'long',
  5.50,
  6.25,
  6250.00,
  5500.00,
  750.00,
  13.64,
  'open'
);
```

### Query open positions for a user

```sql
SELECT 
  symbol,
  underlying_symbol,
  option_type,
  strike_price,
  expiration_date,
  quantity,
  side,
  market_value,
  unrealized_pl,
  unrealized_pl_percent
FROM options_positions
WHERE account_id = 'user-uuid-here'
  AND status = 'open'
ORDER BY expiration_date ASC;
```

### Query positions by underlying symbol

```sql
SELECT 
  symbol,
  option_type,
  strike_price,
  expiration_date,
  quantity,
  side,
  unrealized_pl
FROM options_positions
WHERE account_id = 'user-uuid-here'
  AND underlying_symbol = 'AAPL'
  AND status = 'open'
ORDER BY expiration_date ASC, strike_price ASC;
```

### Update position metrics

```sql
UPDATE options_positions
SET 
  current_price = 7.50,
  market_value = 7500.00,
  unrealized_pl = 2000.00,
  unrealized_pl_percent = 36.36
WHERE id = 'position-uuid-here';
```

### Close a position

```sql
UPDATE options_positions
SET 
  status = 'closed',
  closed_at = NOW()
WHERE id = 'position-uuid-here';
```

### Query positions expiring soon

```sql
SELECT 
  symbol,
  underlying_symbol,
  option_type,
  strike_price,
  expiration_date,
  quantity,
  market_value
FROM options_positions
WHERE account_id = 'user-uuid-here'
  AND status = 'open'
  AND expiration_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY expiration_date ASC;
```

## Integration with Alpaca API

This table is designed to work with the following Alpaca Broker API endpoints:

- **GET /v1/trading/accounts/{account_id}/positions** - Retrieve all positions including options
- **GET /v1/options/contracts** - Get contract details for options positions
- **POST /v1/trading/accounts/{account_id}/options/exercise** - Exercise options positions

## Verification

Run the verification script to ensure the schema is correctly created:

```bash
psql -f supabase/migrations/VERIFY_OPTIONS_POSITIONS_SCHEMA.sql
```

Or through Supabase CLI:

```bash
supabase db execute --file supabase/migrations/VERIFY_OPTIONS_POSITIONS_SCHEMA.sql
```

## Related Tables

- **auth.users** - User authentication (referenced by account_id)
- **user_positions** - Stock positions (separate table)
- **trade_executions** - Trade history including options trades

## Notes

- Options symbols follow OCC format: `[UNDERLYING][YYMMDD][C/P][STRIKE*1000]`
- Each contract represents 100 shares of the underlying stock
- Market value calculation: `quantity × current_price × 100`
- Long positions have positive quantity, short positions can be tracked with side='short'
- Positions are automatically marked as 'expired' on expiration date
- Exercise and assignment events update the status accordingly
