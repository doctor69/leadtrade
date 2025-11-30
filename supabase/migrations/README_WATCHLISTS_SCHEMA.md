# Watchlist Schema Migration

## Overview

This migration creates the database schema for managing user watchlists and tracked securities. The schema supports creating custom watchlists, adding/removing symbols, and tracking when symbols were added.

## Requirements Coverage

- **Requirement 9.1**: Create watchlists with name and array of symbols
- **Requirement 9.5**: Return complete asset details for each symbol

## Schema Design

### Tables

#### `watchlists`
Stores user watchlists with metadata.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `user_id` | UUID | Foreign key to `auth.users`, required |
| `account_id` | UUID | Foreign key to `profiles`, optional |
| `alpaca_watchlist_id` | TEXT | Unique identifier from Alpaca API |
| `name` | TEXT | User-defined watchlist name, required |
| `created_at` | TIMESTAMP | Auto-generated creation timestamp |
| `updated_at` | TIMESTAMP | Auto-updated modification timestamp |

**Constraints:**
- `watchlist_name_not_empty`: Ensures name is not empty or whitespace-only
- `alpaca_watchlist_id` must be unique
- Cascading delete when user is deleted

#### `watchlist_assets`
Junction table linking watchlists to securities (symbols).

| Column | Type | Description |
|--------|------|-------------|
| `watchlist_id` | UUID | Foreign key to `watchlists`, required |
| `symbol` | TEXT | Stock/asset symbol (e.g., AAPL, GOOGL), required |
| `added_at` | TIMESTAMP | Auto-generated timestamp when symbol was added |

**Constraints:**
- Composite primary key on `(watchlist_id, symbol)`
- `symbol_not_empty`: Ensures symbol is not empty or whitespace-only
- Cascading delete when watchlist is deleted

### Indexes

#### Watchlists Table
- `idx_watchlists_user_id`: Fast lookup by user
- `idx_watchlists_account_id`: Fast lookup by account
- `idx_watchlists_alpaca_id`: Fast lookup by Alpaca ID
- `idx_watchlists_name`: Fast search by watchlist name

#### Watchlist Assets Table
- `idx_watchlist_assets_symbol`: Fast lookup by symbol
- `idx_watchlist_assets_watchlist_id`: Fast lookup by watchlist

### Row Level Security (RLS)

Both tables have RLS enabled with the following policies:

#### Watchlists Policies
1. **Users can view own watchlists**: SELECT access to own watchlists
2. **Users can insert own watchlists**: INSERT access with user_id check
3. **Users can update own watchlists**: UPDATE access to own watchlists
4. **Users can delete own watchlists**: DELETE access to own watchlists

#### Watchlist Assets Policies
1. **Users can view own watchlist assets**: SELECT access to assets in own watchlists
2. **Users can insert own watchlist assets**: INSERT access to own watchlist assets
3. **Users can update own watchlist assets**: UPDATE access to own watchlist assets
4. **Users can delete own watchlist assets**: DELETE access to own watchlist assets

All watchlist_assets policies verify ownership through a subquery checking the parent watchlist's user_id.

### Triggers

#### `watchlists_updated_at`
Automatically updates the `updated_at` timestamp on the `watchlists` table whenever a row is modified.

## Migration File

**File**: `20250109_watchlists.sql`

## Verification

Run the verification script to ensure the schema is correctly created:

```bash
psql -f supabase/migrations/VERIFY_WATCHLISTS_SCHEMA.sql
```

The verification script checks:
- Table existence and column definitions
- Index creation
- RLS enablement
- Policy definitions
- Foreign key constraints
- Check constraints
- Trigger creation
- Test data insertion (rolled back)

## Usage Examples

### Create a Watchlist

```sql
INSERT INTO watchlists (user_id, name, alpaca_watchlist_id)
VALUES (
  'user-uuid-here',
  'Tech Stocks',
  'alpaca-watchlist-id'
);
```

### Add Symbols to Watchlist

```sql
INSERT INTO watchlist_assets (watchlist_id, symbol)
VALUES 
  ('watchlist-uuid', 'AAPL'),
  ('watchlist-uuid', 'GOOGL'),
  ('watchlist-uuid', 'MSFT');
```

### Query Watchlist with Symbols

```sql
SELECT 
  w.id,
  w.name,
  w.created_at,
  array_agg(wa.symbol ORDER BY wa.added_at) AS symbols
FROM watchlists w
LEFT JOIN watchlist_assets wa ON w.id = wa.watchlist_id
WHERE w.user_id = 'user-uuid-here'
GROUP BY w.id, w.name, w.created_at
ORDER BY w.created_at DESC;
```

### Remove Symbol from Watchlist

```sql
DELETE FROM watchlist_assets
WHERE watchlist_id = 'watchlist-uuid'
  AND symbol = 'AAPL';
```

### Delete Watchlist

```sql
DELETE FROM watchlists
WHERE id = 'watchlist-uuid'
  AND user_id = 'user-uuid-here';
-- This will cascade delete all associated watchlist_assets
```

## Integration with Alpaca API

The schema is designed to work seamlessly with the Alpaca Broker API:

1. **Alpaca Watchlist ID**: Stored in `alpaca_watchlist_id` for API synchronization
2. **Symbol Validation**: Symbols are validated against Alpaca's assets endpoint before insertion
3. **Complete Asset Details**: The Edge Function retrieves full asset information from Alpaca when returning watchlists
4. **Atomic Updates**: The schema supports atomic replacement of all symbols in a watchlist

## Security Considerations

1. **RLS Enforcement**: All queries are filtered by user_id through RLS policies
2. **Cascading Deletes**: Deleting a watchlist automatically removes all associated symbols
3. **User Isolation**: Users can only access their own watchlists and symbols
4. **Input Validation**: Check constraints prevent empty names and symbols

## Performance Considerations

1. **Indexed Lookups**: All common query patterns are indexed
2. **Composite Primary Key**: Prevents duplicate symbols in a watchlist
3. **Efficient Joins**: Foreign keys and indexes optimize watchlist-symbol joins
4. **Minimal Data**: Only essential data is stored; full asset details are fetched from Alpaca API

## Rollback

To rollback this migration:

```sql
DROP TRIGGER IF EXISTS watchlists_updated_at ON watchlists;
DROP FUNCTION IF EXISTS update_watchlists_updated_at();
DROP TABLE IF EXISTS watchlist_assets CASCADE;
DROP TABLE IF EXISTS watchlists CASCADE;
```

## Related Files

- **Migration**: `supabase/migrations/20250109_watchlists.sql`
- **Verification**: `supabase/migrations/VERIFY_WATCHLISTS_SCHEMA.sql`
- **Edge Function**: `supabase/functions/alpaca-watchlists/index.ts`
- **Tests**: `src/lib/__tests__/alpaca-watchlists.test.ts`
- **Documentation**: `docs/WATCHLIST_MANAGEMENT.md`

## Notes

- The schema stores minimal data locally; full asset details are fetched from Alpaca API on demand
- Symbol validation is performed at the application layer before database insertion
- The `account_id` column is optional and may be used for future account-specific features
- Timestamps are stored in UTC with timezone information
