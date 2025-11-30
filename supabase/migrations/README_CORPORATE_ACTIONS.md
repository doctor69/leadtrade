# Corporate Actions Schema

## Overview

This migration creates the database schema for storing corporate action announcements from the Alpaca Broker API. Corporate actions include dividends, mergers, spinoffs, and stock splits that affect securities held by users.

## Requirements

- **8.1**: Support filtering corporate actions by ca_types, symbol, cusip, date_type, since, and until
- **8.2**: Store complete corporate action details including dates, rates, and cash amounts
- **8.5**: Implement efficient querying with proper indexes

## Schema Design

### Table: `corporate_actions`

Stores corporate action announcements retrieved from Alpaca API.

#### Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `alpaca_ca_id` | TEXT | Unique identifier from Alpaca API |
| `corporate_action_id` | TEXT | Corporate action identifier |
| `ca_type` | TEXT | Type: dividend, merger, spinoff, or split |
| `ca_sub_type` | TEXT | Additional classification |
| `initiating_symbol` | TEXT | Symbol of the initiating security |
| `initiating_original_cusip` | TEXT | CUSIP of the initiating security |
| `target_symbol` | TEXT | Target symbol (for mergers/spinoffs) |
| `target_cusip` | TEXT | Target CUSIP |
| `declaration_date` | DATE | Date the action was declared |
| `ex_date` | DATE | Ex-dividend/distribution date |
| `record_date` | DATE | Date of record for shareholders |
| `payable_date` | DATE | Date when action is executed |
| `cash` | DECIMAL(15,6) | Cash amount per share (dividends) |
| `old_rate` | DECIMAL(15,6) | Old rate for splits |
| `new_rate` | DECIMAL(15,6) | New rate for splits |
| `details` | JSONB | Additional details as JSON |
| `created_at` | TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

#### Constraints

- `alpaca_ca_id` must be unique
- `ca_type` must be one of: dividend, merger, spinoff, split
- `ex_date`, `record_date`, and `payable_date` are required

### Indexes

Optimized for common query patterns:

1. **alpaca_ca_id**: Unique lookup by Alpaca ID
2. **ca_type**: Filter by corporate action type
3. **initiating_symbol**: Filter by symbol
4. **initiating_cusip**: Filter by CUSIP
5. **target_symbol**: Filter by target symbol (partial index)
6. **declaration_date**: Filter by declaration date (partial index)
7. **ex_date**: Filter by ex-date
8. **record_date**: Filter by record date
9. **payable_date**: Filter by payable date

### Row Level Security (RLS)

#### Policies

1. **Authenticated users can view corporate actions**
   - All authenticated users can read corporate action announcements
   - Corporate actions are public information relevant to all traders

2. **Service role can insert corporate actions**
   - Only the service role can insert new records
   - Data is populated from Alpaca API via edge functions

3. **Service role can update corporate actions**
   - Only the service role can update existing records
   - Ensures data integrity from authoritative source

4. **Service role can delete corporate actions**
   - Only the service role can delete records
   - Allows cleanup of outdated or incorrect data

## Usage Examples

### Query Corporate Actions by Symbol

```sql
SELECT 
  ca_type,
  ca_sub_type,
  initiating_symbol,
  ex_date,
  record_date,
  payable_date,
  cash,
  old_rate,
  new_rate
FROM corporate_actions
WHERE initiating_symbol = 'AAPL'
  AND ex_date >= '2025-01-01'
ORDER BY ex_date DESC;
```

### Query Dividends by Date Range

```sql
SELECT 
  initiating_symbol,
  ex_date,
  payable_date,
  cash
FROM corporate_actions
WHERE ca_type = 'dividend'
  AND payable_date BETWEEN '2025-01-01' AND '2025-12-31'
ORDER BY payable_date;
```

### Query Stock Splits

```sql
SELECT 
  initiating_symbol,
  ex_date,
  old_rate,
  new_rate,
  CONCAT(old_rate, ':', new_rate) AS split_ratio
FROM corporate_actions
WHERE ca_type = 'split'
ORDER BY ex_date DESC;
```

### Query by CUSIP

```sql
SELECT *
FROM corporate_actions
WHERE initiating_original_cusip = '037833100'
ORDER BY ex_date DESC;
```

## Integration with Alpaca API

### Data Flow

1. **Edge Function**: `alpaca-corporate-actions` retrieves announcements from Alpaca API
2. **Caching**: Results can be cached in this table to reduce API calls
3. **Updates**: Periodic sync to keep data current
4. **Notifications**: Can trigger user notifications for relevant holdings

### API Endpoints

- `GET /v1/corporate_actions/announcements` - List announcements with filtering
- `GET /v1/corporate_actions/announcements/{id}` - Get specific announcement

### Filtering Parameters

- `ca_types`: Filter by type (dividend, merger, spinoff, split)
- `symbol`: Filter by initiating symbol
- `cusip`: Filter by CUSIP
- `date_type`: Filter by date type (declaration_date, ex_date, record_date, payable_date)
- `since`: Start date for filtering
- `until`: End date for filtering

## Migration Application

### Apply Migration

```bash
# Using Supabase CLI
supabase db push

# Or apply directly
psql -h <host> -U <user> -d <database> -f supabase/migrations/20250109_corporate_actions.sql
```

### Verify Migration

```bash
# Run verification script
psql -h <host> -U <user> -d <database> -f supabase/migrations/VERIFY_CORPORATE_ACTIONS_SCHEMA.sql
```

## Maintenance

### Data Retention

Consider implementing a retention policy to archive old corporate actions:

```sql
-- Archive corporate actions older than 5 years
DELETE FROM corporate_actions
WHERE payable_date < NOW() - INTERVAL '5 years';
```

### Performance Monitoring

Monitor query performance and add additional indexes if needed:

```sql
-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'corporate_actions'
ORDER BY idx_scan DESC;
```

## Related Files

- Migration: `supabase/migrations/20250109_corporate_actions.sql`
- Verification: `supabase/migrations/VERIFY_CORPORATE_ACTIONS_SCHEMA.sql`
- Edge Function: `supabase/functions/alpaca-corporate-actions/index.ts`
- Shared Client: `supabase/functions/_shared/alpaca-client.ts`

## Notes

- Corporate actions are read-only for regular users
- Data is populated and maintained by the service role
- All dates are stored in DATE format for efficient querying
- Decimal fields use DECIMAL(15,6) for precision
- JSONB field allows storing additional metadata without schema changes
