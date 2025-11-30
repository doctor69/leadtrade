# Alpaca Reporting API Implementation

Complete implementation of the Alpaca Broker API Reporting endpoints for platform-wide position aggregation and end-of-day snapshots.

## Overview

The Reporting API provides enterprise-level reporting capabilities for monitoring positions across all accounts, generating compliance reports, and analyzing portfolio performance at scale.

**Requirements Implemented**: 17.1, 17.2, 17.3, 17.4, 17.5

## Features

### 1. Aggregate Positions Reporting
Platform-wide position aggregation across all accounts with detailed breakdowns.

**Endpoint**: `GET /v1/reports/aggregate_positions`

**Features**:
- Consolidates positions by symbol across all accounts
- Provides total quantities, market values, and P&L metrics
- Shows account-level breakdown for each position
- Tracks number of accounts holding each symbol
- Supports filtering by date, symbols, and account IDs
- Firm account inclusion/exclusion for regulatory reporting
- Pagination support with page_token and limit

**Use Cases**:
- Portfolio risk analysis across multiple accounts
- Position concentration monitoring
- Cross-account performance tracking
- Firm-wide exposure analysis

### 2. End-of-Day Positions
Historical position snapshots for compliance and audit trails.

**Endpoint**: `GET /v1/reports/eod_positions`

**Features**:
- Daily position snapshots with complete details
- Required date parameter (YYYY-MM-DD format)
- Full position information including qty, market value, cost basis
- Unrealized P&L tracking with percentage calculations
- Side tracking (long/short) and exchange information
- Supports filtering by symbols and account IDs
- Firm account inclusion/exclusion
- Pagination support

**Use Cases**:
- End-of-day reconciliation
- Compliance reporting
- Historical performance analysis
- Audit trail maintenance

## Architecture

### Shared Alpaca Client (`supabase/functions/_shared/alpaca-client.ts`)

Two new methods added to the AlpacaClient class:

```typescript
async getAggregatePositions(params?: {
  date?: string
  symbols?: string
  account_ids?: string
  include_firm_accounts?: boolean
  page_token?: string
  limit?: number
}): Promise<AlpacaResponse<AggregatePositionsResponse>>

async getEODPositions(params: {
  date: string // Required
  symbols?: string
  account_ids?: string
  include_firm_accounts?: boolean
  page_token?: string
  limit?: number
}): Promise<AlpacaResponse<EODPositionsResponse>>
```

### Edge Function (`supabase/functions/alpaca-reports/index.ts`)

Serverless function that proxies requests to Alpaca Broker API:

- **Authentication**: Validates user session via `authenticateRequest`
- **CORS Support**: Handles preflight requests
- **Error Handling**: Comprehensive error responses with proper status codes
- **Query Parameters**: Validates and forwards all filtering parameters
- **Date Validation**: Ensures date parameter is provided for EOD positions

**Endpoints**:
- `GET /functions/v1/alpaca-reports/aggregate_positions`
- `GET /functions/v1/alpaca-reports/eod_positions`

### Frontend Library (`src/lib/alpaca-reports.ts`)

Type-safe TypeScript client with Zod validation:

```typescript
// Get aggregate positions
const result = await getAggregatePositions({
  date: '2025-01-10',
  symbols: ['AAPL', 'GOOGL'],
  limit: 50
});

// Get EOD positions (date required)
const eodResult = await getEODPositions({
  date: '2025-01-10',
  accountIds: ['account-123'],
  includeFirmAccounts: false
});

// Helper functions
const formattedDate = formatReportDate(new Date());
const metrics = calculatePortfolioMetrics(positions);
```

**Features**:
- Zod schema validation for all responses
- Type-safe parameter handling
- Array-to-comma-separated conversion for symbols and account IDs
- Helper functions for date formatting and metrics calculation
- Comprehensive error handling

### API Routes (`src/pages/api/alpaca/reports/`)

Optional Astro API routes for frontend convenience:

- `GET /api/alpaca/reports/aggregate-positions`
- `GET /api/alpaca/reports/eod-positions`

These routes forward requests to Edge Functions with proper cookie handling.

## Usage Examples

### Basic Aggregate Positions Query

```typescript
import { getAggregatePositions } from '@/lib/alpaca-reports';

// Get all positions
const result = await getAggregatePositions();

if (result.success && result.data) {
  console.log(`Found ${result.data.positions.length} unique positions`);
  
  result.data.positions.forEach(position => {
    console.log(`${position.symbol}: ${position.total_qty} shares across ${position.account_count} accounts`);
    console.log(`Total P&L: $${position.total_unrealized_pl} (${position.total_unrealized_plpc}%)`);
  });
}
```

### Filtered Aggregate Positions

```typescript
// Get positions for specific symbols on a specific date
const result = await getAggregatePositions({
  date: '2025-01-10',
  symbols: ['AAPL', 'GOOGL', 'MSFT'],
  includeFirmAccounts: false,
  limit: 100
});
```

### EOD Positions Query

```typescript
import { getEODPositions, formatReportDate } from '@/lib/alpaca-reports';

// Get yesterday's positions
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

const result = await getEODPositions({
  date: formatReportDate(yesterday),
  symbols: ['AAPL'],
  limit: 50
});

if (result.success && result.data) {
  console.log(`EOD positions for ${result.data.date}`);
  
  result.data.positions.forEach(position => {
    console.log(`Account ${position.account_number}: ${position.qty} ${position.symbol}`);
    console.log(`Market Value: $${position.market_value}`);
    console.log(`Unrealized P&L: $${position.unrealized_pl} (${position.unrealized_plpc}%)`);
  });
}
```

### Portfolio Metrics Calculation

```typescript
import { getAggregatePositions, calculatePortfolioMetrics } from '@/lib/alpaca-reports';

const result = await getAggregatePositions();

if (result.success && result.data) {
  const metrics = calculatePortfolioMetrics(result.data.positions);
  
  console.log('Portfolio Summary:');
  console.log(`Total Market Value: $${metrics.totalMarketValue}`);
  console.log(`Total Cost Basis: $${metrics.totalCostBasis}`);
  console.log(`Total Unrealized P&L: $${metrics.totalUnrealizedPL} (${metrics.totalUnrealizedPLPC}%)`);
  console.log(`Number of Positions: ${metrics.positionCount}`);
}
```

### Pagination Example

```typescript
let allPositions = [];
let pageToken = undefined;

do {
  const result = await getAggregatePositions({
    date: '2025-01-10',
    limit: 100,
    pageToken
  });
  
  if (result.success && result.data) {
    allPositions.push(...result.data.positions);
    pageToken = result.data.next_page_token;
  } else {
    break;
  }
} while (pageToken);

console.log(`Retrieved ${allPositions.length} total positions`);
```

## Response Types

### Aggregate Positions Response

```typescript
interface AggregatePositionsResponse {
  positions: Array<{
    symbol: string
    asset_id: string
    asset_class: string
    total_qty: string
    total_market_value: string
    total_cost_basis: string
    total_unrealized_pl: string
    total_unrealized_plpc: string
    account_count: number
    accounts: Array<{
      account_id: string
      qty: string
      market_value: string
      cost_basis: string
      unrealized_pl: string
    }>
  }>
  next_page_token?: string
}
```

### EOD Positions Response

```typescript
interface EODPositionsResponse {
  date: string
  positions: Array<{
    account_id: string
    account_number: string
    symbol: string
    asset_id: string
    asset_class: string
    qty: string
    market_value: string
    cost_basis: string
    unrealized_pl: string
    unrealized_plpc: string
    avg_entry_price: string
    side: 'long' | 'short'
    exchange: string
  }>
  next_page_token?: string
}
```

## Testing

Comprehensive test suite with 7 tests covering:

- Date formatting (Date objects and strings)
- Portfolio metrics calculation
- Empty positions handling
- Zero cost basis handling
- Negative P&L handling

**Run tests**:
```bash
npm run test:run -- src/lib/__tests__/alpaca-reports.test.ts
```

**Test Results**: ✅ 7/7 tests passing

## Error Handling

The implementation includes comprehensive error handling:

1. **Missing Date Parameter**: Returns 400 error for EOD positions without date
2. **Invalid Date Format**: Alpaca API validates date format
3. **Authentication Errors**: Returns 401 for unauthenticated requests
4. **API Errors**: Forwards Alpaca API error messages with proper status codes
5. **Validation Errors**: Zod validation catches malformed responses

## Performance Considerations

- **Pagination**: Use limit parameter to control response size
- **Filtering**: Apply symbol and account filters to reduce data transfer
- **Caching**: Consider caching EOD positions as they don't change
- **Date Ranges**: Query specific dates rather than broad ranges

## Security

- **Authentication Required**: All endpoints require valid user session
- **RLS Policies**: Database queries respect Row Level Security
- **API Key Protection**: Alpaca credentials stored securely in environment variables
- **CORS Protection**: Proper CORS headers prevent unauthorized access

## Future Enhancements

Potential improvements for future iterations:

1. **Caching Layer**: Cache EOD positions for improved performance
2. **Export Functionality**: CSV/Excel export for compliance reports
3. **Scheduled Reports**: Automated daily report generation
4. **Email Notifications**: Alert on significant position changes
5. **Custom Metrics**: Additional portfolio analytics and ratios
6. **Historical Trends**: Multi-day position tracking and visualization

## Related Documentation

- [Alpaca Broker API Documentation](https://docs.alpaca.markets/reference/reports-1)
- [Requirements Document](.kiro/specs/alpaca-broker-api-complete/requirements.md)
- [Design Document](.kiro/specs/alpaca-broker-api-complete/design.md)
- [Tasks Document](.kiro/specs/alpaca-broker-api-complete/tasks.md)

## Implementation Status

✅ **COMPLETED** (January 2025)

All requirements (17.1-17.5) have been successfully implemented and tested.
