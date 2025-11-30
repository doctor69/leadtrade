# Options Positions Database Schema Implementation

## Overview

Implemented the database schema for tracking options positions as part of the Alpaca Broker API completion project (Task 15).

## Implementation Summary

### Files Created

1. **Migration File**: `supabase/migrations/20250109_options_positions.sql`
   - Creates the `options_positions` table with comprehensive fields
   - Implements Row Level Security (RLS) policies
   - Creates 10 optimized indexes for query performance
   - Adds automatic `updated_at` trigger

2. **Verification Script**: `supabase/migrations/VERIFY_OPTIONS_POSITIONS_SCHEMA.sql`
   - Validates table structure and constraints
   - Checks indexes and RLS policies
   - Tests data insertion and rollback
   - Provides comprehensive schema verification

3. **Documentation**: `supabase/migrations/README_OPTIONS_POSITIONS.md`
   - Complete table structure documentation
   - Usage examples and query patterns
   - Integration guidelines with Alpaca API
   - Best practices for options position tracking

## Database Schema Details

### Table: options_positions

**Purpose**: Track options positions with detailed contract information and real-time metrics

**Key Fields**:
- `contract_id` - Alpaca options contract identifier
- `symbol` - Full options symbol (OCC format)
- `underlying_symbol` - Underlying stock symbol
- `option_type` - Call or Put
- `strike_price` - Strike price of the option
- `expiration_date` - Contract expiration date
- `quantity` - Number of contracts
- `side` - Long (bought) or Short (sold)
- `avg_entry_price` - Average entry price per contract
- `current_price` - Current market price
- `market_value` - Current market value
- `unrealized_pl` - Unrealized profit/loss
- `status` - Position status (open, closed, expired, exercised, assigned)

### Indexes Created

1. Account-based lookups (account_id)
2. Alpaca position ID lookups (partial index)
3. Contract ID lookups
4. Symbol-based queries
5. Underlying symbol filtering
6. Status filtering
7. Expiration date filtering
8. Composite indexes for common query patterns
9. Time-based sorting (updated_at)

### Security Features

**Row Level Security (RLS)**:
- Users can only view their own positions
- Users can only insert their own positions
- Users can only update their own positions
- Users can only delete their own positions

All policies enforce `auth.uid() = account_id` for data isolation.

### Automatic Triggers

- `updated_at` timestamp automatically updated on row modifications

## Integration Points

### Alpaca API Endpoints

This schema supports the following Alpaca Broker API endpoints:

1. **GET /v1/trading/accounts/{account_id}/positions**
   - Retrieve all positions including options
   - Store and sync options positions

2. **GET /v1/options/contracts**
   - Get contract details for positions
   - Populate contract information

3. **POST /v1/trading/accounts/{account_id}/options/exercise**
   - Exercise options positions
   - Update position status to 'exercised'

### Frontend Integration

The schema supports:
- Portfolio display with options positions
- Options chain browsing
- Position tracking and P/L calculation
- Expiration monitoring
- Exercise and assignment tracking

## Usage Examples

### Query Open Positions
```sql
SELECT * FROM options_positions
WHERE account_id = auth.uid()
  AND status = 'open'
ORDER BY expiration_date ASC;
```

### Query by Underlying Symbol
```sql
SELECT * FROM options_positions
WHERE account_id = auth.uid()
  AND underlying_symbol = 'AAPL'
  AND status = 'open';
```

### Update Position Metrics
```sql
UPDATE options_positions
SET 
  current_price = 7.50,
  market_value = 7500.00,
  unrealized_pl = 2000.00,
  unrealized_pl_percent = 36.36
WHERE id = 'position-uuid';
```

### Close Position
```sql
UPDATE options_positions
SET 
  status = 'closed',
  closed_at = NOW()
WHERE id = 'position-uuid';
```

## Requirements Satisfied

✅ **Requirement 7.1**: Options contract tracking with detailed specifications
✅ **Requirement 7.2**: Contract details including open_interest and close_price support
✅ **Requirement 7.3**: Options exercise tracking with status updates

## Testing

### Verification Steps

1. Run the verification script:
   ```bash
   supabase db execute --file supabase/migrations/VERIFY_OPTIONS_POSITIONS_SCHEMA.sql
   ```

2. Check table structure:
   ```sql
   \d options_positions
   ```

3. Verify RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'options_positions';
   ```

4. Test data insertion and RLS:
   ```sql
   INSERT INTO options_positions (...) VALUES (...);
   SELECT * FROM options_positions WHERE account_id = auth.uid();
   ```

## Migration Deployment

### Local Development
```bash
supabase db reset
```

### Production
```bash
supabase db push
```

## Next Steps

The following tasks can now be implemented:

1. **Frontend Components**:
   - Options positions display component
   - Options P/L calculator
   - Expiration monitoring UI

2. **API Integration**:
   - Sync positions from Alpaca API
   - Real-time position updates
   - Exercise and assignment handling

3. **Analytics**:
   - Options portfolio analytics
   - Greeks calculation and display
   - Risk metrics

## Notes

- Options symbols follow OCC format: `[UNDERLYING][YYMMDD][C/P][STRIKE*1000]`
- Each contract represents 100 shares of the underlying stock
- Market value = quantity × current_price × 100
- Positions automatically expire on expiration_date
- Exercise and assignment events update status accordingly

## Related Documentation

- [Options Contracts Implementation](OPTIONS_CONTRACTS_IMPLEMENTATION.md)
- [Options Exercise Implementation](OPTIONS_EXERCISE_IMPLEMENTATION.md)
- [Options Orders Enhancement](OPTIONS_ORDERS_ENHANCEMENT.md)
- [Design Document](.kiro/specs/alpaca-broker-api-complete/design.md)
- [Requirements Document](.kiro/specs/alpaca-broker-api-complete/requirements.md)

---

**Status**: ✅ Complete
**Date**: January 2025
**Task**: 15. Create options database schema
