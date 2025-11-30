# Corporate Actions Schema Implementation

## Overview

Implemented the database schema for storing corporate action announcements from the Alpaca Broker API. This completes task 17 from the Alpaca Broker API Complete specification.

## Implementation Date

January 2025

## Requirements Addressed

- **8.1**: Support filtering corporate actions by ca_types, symbol, cusip, date_type, since, and until
- **8.2**: Store complete corporate action details including dates, rates, and cash amounts
- **8.5**: Implement efficient querying with proper indexes

## Files Created

### 1. Migration File
**Path**: `supabase/migrations/20250109_corporate_actions.sql`

Creates the `corporate_actions` table with:
- Complete schema for storing dividend, merger, spinoff, and split announcements
- 9 optimized indexes for efficient querying
- Row Level Security (RLS) policies
- Automatic timestamp management
- Comprehensive column comments

### 2. Verification Script
**Path**: `supabase/migrations/VERIFY_CORPORATE_ACTIONS_SCHEMA.sql`

Provides verification queries to:
- Check table existence and structure
- Verify constraints and indexes
- Confirm RLS policies
- Test triggers
- Validate data insertion

### 3. Documentation
**Path**: `supabase/migrations/README_CORPORATE_ACTIONS.md`

Comprehensive documentation including:
- Schema design and rationale
- Column descriptions
- Index strategy
- RLS policy explanations
- Usage examples
- Integration guidelines
- Maintenance recommendations

## Schema Details

### Table: `corporate_actions`

#### Key Features

1. **Data Types**
   - UUID primary key for internal reference
   - TEXT fields for identifiers and symbols
   - DATE fields for all date columns (declaration, ex, record, payable)
   - DECIMAL(15,6) for precise financial amounts
   - JSONB for flexible additional data storage

2. **Constraints**
   - Unique constraint on `alpaca_ca_id`
   - CHECK constraint on `ca_type` (dividend, merger, spinoff, split)
   - NOT NULL constraints on required fields

3. **Indexes** (9 total)
   - Primary key index on `id`
   - Unique index on `alpaca_ca_id`
   - Standard indexes on: `ca_type`, `initiating_symbol`, `initiating_original_cusip`, `ex_date`, `record_date`, `payable_date`
   - Partial indexes on: `target_symbol`, `declaration_date` (WHERE NOT NULL)

4. **Row Level Security**
   - **SELECT**: All authenticated users can view announcements
   - **INSERT/UPDATE/DELETE**: Only service role (for API sync)

5. **Triggers**
   - Automatic `updated_at` timestamp on updates

## Integration Points

### Edge Function
The existing `alpaca-corporate-actions` edge function retrieves data from Alpaca API:
- `GET /alpaca-corporate-actions` - List announcements with filtering
- `GET /alpaca-corporate-actions?id={id}` - Get specific announcement

### Shared Client
The `AlpacaClient` in `_shared/alpaca-client.ts` includes methods:
- `getCorporateActions(params)` - List announcements
- `getCorporateAction(id)` - Get specific announcement

### Data Flow

```
Alpaca API → Edge Function → Database Cache (optional) → Frontend
```

The schema supports optional caching of corporate action data to:
- Reduce API calls to Alpaca
- Improve query performance
- Enable historical tracking
- Support offline access

## Query Performance

### Optimized Query Patterns

1. **By Symbol and Date Range**
   ```sql
   SELECT * FROM corporate_actions
   WHERE initiating_symbol = 'AAPL'
     AND ex_date >= '2025-01-01'
   ORDER BY ex_date DESC;
   ```
   Uses: `idx_corporate_actions_initiating_symbol`, `idx_corporate_actions_ex_date`

2. **By Type**
   ```sql
   SELECT * FROM corporate_actions
   WHERE ca_type = 'dividend'
     AND payable_date BETWEEN '2025-01-01' AND '2025-12-31';
   ```
   Uses: `idx_corporate_actions_ca_type`, `idx_corporate_actions_payable_date`

3. **By CUSIP**
   ```sql
   SELECT * FROM corporate_actions
   WHERE initiating_original_cusip = '037833100';
   ```
   Uses: `idx_corporate_actions_initiating_cusip`

## Security Considerations

### Access Control
- **Public Read**: Corporate actions are public information, so all authenticated users can view
- **Service Write**: Only the service role can modify data to maintain integrity
- **RLS Enabled**: All policies enforced at database level

### Data Validation
- Type checking via CHECK constraint on `ca_type`
- Required fields enforced with NOT NULL
- Unique constraint prevents duplicate entries

## Usage Examples

### Caching Strategy (Optional)

```typescript
// In edge function or API route
async function getCorporateActionsWithCache(params: any) {
  // Check cache first
  const cached = await supabase
    .from('corporate_actions')
    .select('*')
    .eq('initiating_symbol', params.symbol)
    .gte('ex_date', params.since)
    .lte('ex_date', params.until);

  if (cached.data && cached.data.length > 0) {
    return cached.data;
  }

  // Fetch from Alpaca API
  const alpacaData = await alpacaClient.getCorporateActions(params);

  // Cache results (as service role)
  if (alpacaData.success) {
    await supabase
      .from('corporate_actions')
      .upsert(alpacaData.data, { onConflict: 'alpaca_ca_id' });
  }

  return alpacaData.data;
}
```

### User Notifications

```typescript
// Notify users of upcoming corporate actions affecting their holdings
async function notifyUpcomingCorporateActions(userId: string) {
  // Get user's holdings
  const holdings = await getUserHoldings(userId);
  const symbols = holdings.map(h => h.symbol);

  // Find upcoming corporate actions
  const upcomingActions = await supabase
    .from('corporate_actions')
    .select('*')
    .in('initiating_symbol', symbols)
    .gte('ex_date', new Date().toISOString())
    .lte('ex_date', addDays(new Date(), 30).toISOString())
    .order('ex_date');

  // Send notifications
  for (const action of upcomingActions.data || []) {
    await sendNotification(userId, {
      type: 'corporate_action',
      title: `${action.ca_type} for ${action.initiating_symbol}`,
      message: `Ex-date: ${action.ex_date}, Payable: ${action.payable_date}`,
      data: action
    });
  }
}
```

## Testing

### Manual Testing Steps

1. **Apply Migration**
   ```bash
   supabase db push
   ```

2. **Run Verification**
   ```bash
   psql -h <host> -U <user> -d <database> \
     -f supabase/migrations/VERIFY_CORPORATE_ACTIONS_SCHEMA.sql
   ```

3. **Test Data Insertion** (as service role)
   ```sql
   INSERT INTO corporate_actions (
     alpaca_ca_id,
     corporate_action_id,
     ca_type,
     ca_sub_type,
     initiating_symbol,
     initiating_original_cusip,
     ex_date,
     record_date,
     payable_date,
     cash
   ) VALUES (
     'test_ca_001',
     'CA123456',
     'dividend',
     'cash_dividend',
     'AAPL',
     '037833100',
     '2025-01-15',
     '2025-01-16',
     '2025-01-30',
     0.25
   );
   ```

4. **Test Query Performance**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM corporate_actions
   WHERE initiating_symbol = 'AAPL'
     AND ex_date >= '2025-01-01';
   ```

5. **Test RLS Policies**
   ```sql
   -- As authenticated user (should succeed)
   SELECT * FROM corporate_actions LIMIT 1;

   -- As authenticated user (should fail)
   INSERT INTO corporate_actions (...) VALUES (...);
   ```

## Maintenance

### Data Retention

Consider implementing a retention policy:

```sql
-- Archive old corporate actions (run periodically)
DELETE FROM corporate_actions
WHERE payable_date < NOW() - INTERVAL '5 years';
```

### Index Maintenance

Monitor index usage and performance:

```sql
-- Check index usage statistics
SELECT 
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'corporate_actions'
ORDER BY idx_scan DESC;
```

## Future Enhancements

### Potential Improvements

1. **User Subscriptions**
   - Track which users want notifications for specific symbols
   - Create `corporate_action_subscriptions` table

2. **Historical Tracking**
   - Track changes to corporate action announcements
   - Create audit log for modifications

3. **Impact Calculation**
   - Calculate impact on user portfolios
   - Store calculated values for quick access

4. **Advanced Filtering**
   - Add full-text search on details JSONB field
   - Create materialized views for common queries

## Related Documentation

- **Requirements**: `.kiro/specs/alpaca-broker-api-complete/requirements.md` (Requirement 8)
- **Design**: `.kiro/specs/alpaca-broker-api-complete/design.md` (Section 7)
- **Tasks**: `.kiro/specs/alpaca-broker-api-complete/tasks.md` (Task 17)
- **Edge Function**: `supabase/functions/alpaca-corporate-actions/index.ts`
- **Shared Client**: `supabase/functions/_shared/alpaca-client.ts`

## Completion Status

✅ **Task 17 Complete**: Corporate actions database schema implemented

### Deliverables
- ✅ Migration file created with complete schema
- ✅ Indexes created for efficient querying
- ✅ RLS policies implemented for secure access
- ✅ Verification script created
- ✅ Comprehensive documentation written
- ✅ Summary document created

### Next Steps
- Apply migration to development database
- Test with real Alpaca API data
- Implement optional caching in edge function
- Consider user notification system for holdings
