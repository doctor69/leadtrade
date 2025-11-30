# Options Contracts API Implementation

## Overview

This document describes the implementation of the Alpaca Options Contracts API endpoints for LeadTrade. The implementation provides comprehensive functionality for listing and retrieving option contract details with extensive filtering capabilities.

## Requirements Addressed

- **Requirement 7.1**: List option contracts with filtering by underlying_symbols, status, expiration_date, root_symbol, type, style, and strike_price
- **Requirement 7.2**: Get specific option contract details including open_interest and close_price

## Architecture

### Components

1. **Edge Function** (`supabase/functions/alpaca-options-contracts/index.ts`)
   - Handles authentication and authorization
   - Proxies requests to Alpaca Data API (v1beta1)
   - Supports both listing contracts and getting specific contract details
   - Validates query parameters with Zod schemas

2. **Frontend Library** (`src/lib/alpaca-options-contracts.ts`)
   - Provides type-safe functions for interacting with options contracts
   - Calls Supabase Edge Functions directly (no Astro API routes)
   - Includes Zod schemas for validation
   - Helper functions for common use cases

3. **TypeScript Types** (`src/types/trading.ts`)
   - `AlpacaOptionContract` interface for Alpaca API responses

## API Endpoints

### List Option Contracts

**Edge Function**: `GET /functions/v1/alpaca-options-contracts`

**Query Parameters**:
- `underlying_symbols` (string, optional): Comma-separated list of underlying symbols (e.g., "AAPL,MSFT")
- `status` (string, optional): Filter by status ("active" or "inactive")
- `expiration_date` (string, optional): Exact expiration date (YYYY-MM-DD)
- `expiration_date_gte` (string, optional): Expiration date greater than or equal to
- `expiration_date_lte` (string, optional): Expiration date less than or equal to
- `root_symbol` (string, optional): Filter by root symbol
- `type` (string, optional): Option type ("call" or "put")
- `style` (string, optional): Option style ("american" or "european")
- `strike_price_gte` (string, optional): Strike price greater than or equal to
- `strike_price_lte` (string, optional): Strike price less than or equal to
- `limit` (number, optional): Maximum number of results (1-10000, default: 100)
- `page_token` (string, optional): Pagination token for next page

**Response**:
```json
{
  "option_contracts": [
    {
      "id": "contract-123",
      "symbol": "AAPL250117C00150000",
      "name": "AAPL Jan 17 2025 $150 Call",
      "status": "active",
      "tradable": true,
      "expiration_date": "2025-01-17",
      "underlying_symbol": "AAPL",
      "underlying_asset_id": "asset-123",
      "type": "call",
      "style": "american",
      "strike_price": "150.00",
      "multiplier": "100",
      "size": "100",
      "open_interest": "1000",
      "open_interest_date": "2025-01-08",
      "close_price": "5.50",
      "close_price_date": "2025-01-08",
      "root_symbol": "AAPL"
    }
  ],
  "next_page_token": null
}
```

### Get Option Contract Details

**Edge Function**: `GET /functions/v1/alpaca-options-contracts/{contractId}`

**Path Parameters**:
- `contractId` (string, required): Contract ID or symbol

**Response**:
```json
{
  "id": "contract-123",
  "symbol": "AAPL250117C00150000",
  "name": "AAPL Jan 17 2025 $150 Call",
  "status": "active",
  "tradable": true,
  "expiration_date": "2025-01-17",
  "underlying_symbol": "AAPL",
  "underlying_asset_id": "asset-123",
  "type": "call",
  "style": "american",
  "strike_price": "150.00",
  "multiplier": "100",
  "size": "100",
  "open_interest": "1000",
  "open_interest_date": "2025-01-08",
  "close_price": "5.50",
  "close_price_date": "2025-01-08",
  "root_symbol": "AAPL"
}
```

## Usage Examples

### Basic Usage

```typescript
import { listOptionsContracts, getOptionContract } from '@/lib/alpaca-options-contracts';

// List all active call options for AAPL
const result = await listOptionsContracts({
  underlying_symbols: 'AAPL',
  type: 'call',
  status: 'active'
});

if (result.success) {
  console.log('Contracts:', result.data.option_contracts);
}

// Get specific contract details
const contractResult = await getOptionContract('AAPL250117C00150000');

if (contractResult.success) {
  console.log('Contract:', contractResult.data);
}
```

### Helper Functions

```typescript
import { 
  getOptionsChain, 
  getOptionsByExpiration, 
  getOptionsByStrikeRange 
} from '@/lib/alpaca-options-contracts';

// Get full options chain for AAPL
const chain = await getOptionsChain('AAPL', {});

// Get options expiring on a specific date
const expiringOptions = await getOptionsByExpiration('2025-01-17', {
  underlying_symbols: 'AAPL'
});

// Get options within a strike price range
const rangeOptions = await getOptionsByStrikeRange(140, 160, {
  underlying_symbols: 'AAPL',
  type: 'call'
});
```

## Data Model

### OptionContract

```typescript
interface OptionContract {
  id: string;                      // Unique contract identifier
  symbol: string;                  // OCC symbol format
  name: string;                    // Human-readable name
  status: 'active' | 'inactive';   // Trading status
  tradable: boolean;               // Whether contract can be traded
  expiration_date: string;         // Expiration date (YYYY-MM-DD)
  underlying_symbol: string;       // Underlying stock symbol
  underlying_asset_id: string;     // Underlying asset ID
  type: 'call' | 'put';           // Option type
  style: 'american' | 'european';  // Exercise style
  strike_price: string;            // Strike price
  multiplier: string;              // Contract multiplier (usually "100")
  size: string;                    // Number of shares per contract
  open_interest?: string;          // Open interest
  open_interest_date?: string;     // Date of open interest data
  close_price?: string;            // Last close price
  close_price_date?: string;       // Date of close price
  root_symbol: string;             // Root symbol
  deliverable?: string;            // Deliverable information
}
```

## Error Handling

All functions return a result object with the following structure:

```typescript
{
  success: boolean;
  data?: T;
  error?: string;
}
```

Common error scenarios:
- **400 Bad Request**: Invalid query parameters or contract ID
- **401 Unauthorized**: Missing or invalid authentication
- **404 Not Found**: Contract not found
- **500 Internal Server Error**: Unexpected server error

## Testing

Comprehensive unit tests are provided in `src/lib/__tests__/alpaca-options-contracts.test.ts`:

- ✅ List option contracts successfully
- ✅ Handle errors when listing contracts
- ✅ Filter by expiration date
- ✅ Filter by strike price range
- ✅ Get specific contract details
- ✅ Handle errors when getting contract details

Run tests with:
```bash
npm run test -- src/lib/__tests__/alpaca-options-contracts.test.ts --run
```

## Integration with Existing Features

### Options Trading

The options contracts API integrates with existing options trading functionality:

1. **Options Orders** (`alpaca-options-orders`): Use contract data to place orders
2. **Options Positions** (`alpaca-options-positions`): View positions for specific contracts
3. **Trading Dashboard**: Display available contracts for trading

### Future Enhancements

1. **Options Chain UI Component**: Display contracts in a chain view
2. **Real-time Contract Data**: WebSocket integration for live pricing
3. **Greeks Calculation**: Add options Greeks (delta, gamma, theta, vega)
4. **Contract Search**: Advanced search and filtering UI
5. **Watchlist Integration**: Add contracts to watchlists

## Security Considerations

1. **Authentication**: All requests require valid user authentication
2. **Trading Mode**: Respects user's trading mode (paper/live)
3. **Rate Limiting**: Inherits rate limiting from Alpaca API
4. **Data Validation**: Zod schemas validate all inputs and outputs

## Performance Optimization

1. **Pagination**: Supports pagination for large result sets
2. **Filtering**: Server-side filtering reduces data transfer
3. **Caching**: Consider implementing caching for frequently accessed contracts
4. **Lazy Loading**: Load contract details on demand

## Deployment

The implementation is deployed as part of the LeadTrade platform:

1. **Edge Function**: Deployed to Supabase Edge Functions
2. **API Routes**: Deployed with Astro static site
3. **Frontend Library**: Bundled with application code

No additional configuration required beyond existing Alpaca API credentials.

## Monitoring and Logging

All operations are logged for debugging and monitoring:

- Request parameters
- Response status
- Error messages
- Trading mode used

Check Supabase Edge Function logs for detailed information.

## Support

For issues or questions:
1. Check Alpaca API documentation: https://alpaca.markets/docs/api-references/broker-api/
2. Review test cases for usage examples
3. Check Edge Function logs for errors
4. Verify Alpaca API credentials and permissions

## Changelog

### January 2025 - Initial Implementation
- ✅ Implemented GET /v1/options/contracts endpoint
- ✅ Implemented GET /v1/options/contracts/{id} endpoint
- ✅ Added comprehensive filtering support
- ✅ Created TypeScript types and Zod schemas
- ✅ Added unit tests (6 tests, 100% pass rate)
- ✅ Created documentation
