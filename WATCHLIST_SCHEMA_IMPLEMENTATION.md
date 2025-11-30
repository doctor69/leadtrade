# Watchlist Database Schema Implementation

## Overview

This document summarizes the implementation of the watchlist database schema for LeadTrade's Alpaca Broker API integration. The schema provides a robust foundation for managing user watchlists and tracked securities.

## Implementation Date

January 9, 2025

## Requirements Coverage

✅ **Requirement 9.1**: Create watchlists with name and array of symbols
✅ **Requirement 9.5**: Return complete asset details for each symbol

## Files Created

### 1. Migration File
**File**: `supabase/migrations/20250109_watchlists.sql`

Creates the complete database schema including:
- `watchlists` table for storing watchlist metadata
- `watchlist_assets` junction table for symbol tracking
- Indexes for efficient querying
- Row Level Security (RLS) policies
- Triggers for automatic timestamp updates
- Table and column comments

### 2. Verification Script
**File**: `supabase/migrations/VERIFY_WATCHLISTS_SCHEMA.sql`

Comprehensive verification script that checks:
- Table and column definitions
- Index creation
- RLS enablement
- Policy definitions
- Foreign key constraints
- Check constraints
- Trigger creation
- Test data insertion (with rollback)

### 3. Documentation
**File**: `supabase/migrations/README_WATCHLISTS_SCHEMA.md`

Complete documentation including:
- Schema design overview
- Table and column descriptions
- Index strategy
- RLS policy details
- Usage examples
- Integration with Alpaca API
- Security considerations
- Performance considerations
- Rollback instructions

## Schema Design

### Tables

#### `watchlists`
Stores user watchlists with the following columns:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users)
- `account_id` (UUID, Foreign Key to profiles)
- `alpaca_watchlist_id` (TEXT, Unique)
- `name` (TEXT, Required)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

**Key Features**:
- Auto-generated UUID primary key
- Cascading delete when user is deleted
- Unique constraint on Alpaca watchlist ID
- Check constraint to prevent empty names
- Automatic timestamp management

#### `watchlist_assets`
Junction table linking watchlists to symbols:
- `watchlist_id` (UUID, Foreign Key to watchlists)
- `symbol` (TEXT, Required)
- `added_at` (TIMESTAMP WITH TIME ZONE)

**Key Features**:
- Composite primary key on (watchlist_id, symbol)
- Prevents duplicate symbols in a watchlist
- Cascading delete when watchlist is deleted
- Check constraint to prevent empty symbols
- Tracks when each symbol was added

### Indexes

**Watchlists Table**:
- `idx_watchlists_user_id` - Fast user lookup
- `idx_watchlists_account_id` - Fast account lookup
- `idx_watchlists_alpaca_id` - Fast Alpaca ID lookup
- `idx_watchlists_name` - Fast name search

**Watchlist Assets Table**:
- `idx_watchlist_assets_symbol` - Fast symbol lookup
- `idx_watchlist_assets_watchlist_id` - Fast watchlist lookup

### Row Level Security

Both tables have RLS enabled with comprehensive policies:

**Watchlists Policies**:
1. Users can view own watchlists (SELECT)
2. Users can insert own watchlists (INSERT)
3. Users can update own watchlists (UPDATE)
4. Users can delete own watchlists (DELETE)

**Watchlist Assets Policies**:
1. Users can view own watchlist assets (SELECT)
2. Users can insert own watchlist assets (INSERT)
3. Users can update own watchlist assets (UPDATE)
4. Users can delete own watchlist assets (DELETE)

All watchlist_assets policies verify ownership through a subquery checking the parent watchlist's user_id.

### Triggers

**`watchlists_updated_at`**: Automatically updates the `updated_at` timestamp whenever a watchlist is modified.

## Integration with Existing System

### Edge Function Integration
The schema works seamlessly with the existing Edge Function:
- **File**: `supabase/functions/alpaca-watchlists/index.ts`
- Handles symbol validation before database insertion
- Fetches complete asset details from Alpaca API
- Supports atomic updates of symbol lists

### Frontend Integration
The schema supports the existing frontend implementation:
- **Hook**: `src/hooks/useAlpacaBroker.ts`
- **Client**: `src/lib/alpaca-broker-client.ts`
- **Tests**: `src/lib/__tests__/alpaca-watchlists.test.ts`

## Security Features

1. **User Isolation**: RLS policies ensure users can only access their own watchlists
2. **Cascading Deletes**: Automatic cleanup of related data
3. **Input Validation**: Check constraints prevent invalid data
4. **Foreign Key Constraints**: Maintain referential integrity

## Performance Optimizations

1. **Strategic Indexing**: All common query patterns are indexed
2. **Composite Primary Key**: Prevents duplicate symbols efficiently
3. **Minimal Data Storage**: Only essential data stored; full asset details fetched from Alpaca
4. **Efficient Joins**: Optimized for watchlist-symbol queries

## Testing

The implementation includes:
- ✅ Comprehensive verification script
- ✅ Test data insertion (with rollback)
- ✅ Existing unit tests in `src/lib/__tests__/alpaca-watchlists.test.ts`
- ✅ Integration with Edge Function tests

## Deployment Instructions

### 1. Apply Migration
```bash
# Using Supabase CLI
supabase db push

# Or manually via psql
psql -f supabase/migrations/20250109_watchlists.sql
```

### 2. Verify Schema
```bash
psql -f supabase/migrations/VERIFY_WATCHLISTS_SCHEMA.sql
```

### 3. Run Tests
```bash
npm run test -- alpaca-watchlists
```

## Rollback Instructions

If needed, rollback the migration:

```sql
DROP TRIGGER IF EXISTS watchlists_updated_at ON watchlists;
DROP FUNCTION IF EXISTS update_watchlists_updated_at();
DROP TABLE IF EXISTS watchlist_assets CASCADE;
DROP TABLE IF EXISTS watchlists CASCADE;
```

## Future Enhancements

Potential future improvements:
1. Watchlist sharing between users
2. Real-time price updates for watchlist symbols
3. Watchlist templates and presets
4. Export/import functionality
5. Bulk symbol validation optimization

## Related Documentation

- **Watchlist Management**: `docs/WATCHLIST_MANAGEMENT.md`
- **Schema README**: `supabase/migrations/README_WATCHLISTS_SCHEMA.md`
- **Edge Function**: `supabase/functions/alpaca-watchlists/index.ts`
- **Tests**: `src/lib/__tests__/alpaca-watchlists.test.ts`

## Task Completion

This implementation completes **Task 19** from the Alpaca Broker API Complete specification:

✅ Create watchlists table
✅ Create watchlist_assets junction table
✅ Add RLS policies
✅ Create indexes for efficient querying
✅ Requirements 9.1 and 9.5 satisfied

## Notes

- The schema is designed to work with the existing Alpaca watchlist Edge Function
- Symbol validation is performed at the application layer before database insertion
- The `account_id` column is optional and available for future account-specific features
- All timestamps are stored in UTC with timezone information
- The schema follows the same patterns as other Alpaca API integrations (bank relationships, transfers, etc.)

## Status

**✅ COMPLETED** - January 9, 2025

The watchlist database schema is fully implemented, documented, and ready for deployment.
