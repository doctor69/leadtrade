# Options Orders API

## Overview

The Options Orders API provides comprehensive functionality for placing, managing, and canceling options orders through the Alpaca Broker API. This implementation includes contract availability validation and account approval level checking to ensure compliance with trading requirements.

**Requirements Covered**: 7.5

## Features

- **Contract Availability Validation**: Verifies that option contracts exist and are tradable before placing orders
- **Account Approval Level Checking**: Ensures accounts have the required options trading approval level
- **OCC Symbol Construction**: Automatically constructs proper OCC format option symbols
- **Order Type Support**: Market, limit, stop, and stop-limit orders
- **Order Management**: List, create, and cancel options orders

## API Endpoints

### Edge Function

**Base URL**: `{SUPABASE_URL}/functions/v1/alpaca-options-orders`

### List Options Orders

**Method**: `GET`

**Query Parameters**:
- `status` (optional): Filter by order status (`open`, `closed`, `all`). Default: `open`
- `limit` (optional): Number of orders to return (1-500). Default: `50`
- `after` (optional): Filter orders after this timestamp
- `until` (optional): Filter orders before this timestamp
- `direction` (optional): Sort direction (`asc`, `desc`). Default: `desc`
- `nested` (optional): Include nested order details. Default: `true`
- `symbols` (optional): Comma-separated list of option symbols to filter

**Response**:
```json
[
  {
    "id": "order-id",
    "symbol": "AAPL240315C00150000",
    "qty": "5",
    "side": "buy",
    "type": "limit",
    "limit_price": "5.50",
    "status": "filled",
    "created_at": "2024-01-15T10:30:00Z",
    "filled_at": "2024-01-15T10:30:05Z"
  }
]
```

### Create Options Order

**Method**: `POST`

**Request Body**:
```json
{
  "symbol": "AAPL",
  "qty": 5,
  "side": "buy",
  "type": "limit",
  "time_in_force": "day",
  "limit_price": 5.50,
  "option_details": {
    "strike": 150,
    "expiration": "2024-03-15",
    "option_type": "call",
    "contract_size": 100
  }
}
```

**Validation Steps**:

1. **Parameter Validation**: Validates all required fields and data types
2. **Contract Availability Check** (Requirement 7.5):
   - Verifies the option contract exists in Alpaca's system
   - Checks that the contract status is `active`
   - Confirms the contract is `tradable`
3. **Account Approval Level Check** (Requirement 7.5):
   - Retrieves account trading configuration
   - Verifies `max_options_trading_level > 0`
   - Returns 403 error if account lacks options approval

**Response** (Success):
```json
{
  "id": "order-id",
  "symbol": "AAPL240315C00150000",
  "qty": "5",
  "side": "buy",
  "type": "limit",
  "limit_price": "5.50",
  "status": "pending_new",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Error Responses**:

Contract Not Available (400):
```json
{
  "code": "INVALID_REQUEST",
  "message": "Option contract not available",
  "details": "The option contract AAPL240315C00150000 is not available for trading. Please verify the contract details."
}
```

Contract Not Tradable (400):
```json
{
  "code": "INVALID_REQUEST",
  "message": "Option contract not tradable",
  "details": "The option contract AAPL240315C00150000 is not currently tradable (status: inactive)."
}
```

No Options Approval (403):
```json
{
  "code": "INVALID_REQUEST",
  "message": "Options trading not approved",
  "details": "Your account does not have options trading approval. Please request options approval before placing options orders."
}
```

### Cancel Options Order

**Method**: `DELETE`

**Query Parameters**:
- `orderId` (required): The ID of the order to cancel

**Response**:
```json
{
  "message": "Options order {orderId} cancelled successfully"
}
```

## OCC Symbol Format

Option symbols follow the OCC (Options Clearing Corporation) standard format:

**Format**: `{Symbol}{YY}{MM}{DD}{C/P}{Strike*1000}`

**Components**:
- `Symbol`: Underlying stock symbol (e.g., `AAPL`)
- `YY`: Two-digit year (e.g., `24` for 2024)
- `MM`: Two-digit month (e.g., `03` for March)
- `DD`: Two-digit day (e.g., `15`)
- `C/P`: Option type (`C` for call, `P` for put)
- `Strike*1000`: Strike price multiplied by 1000, padded to 8 digits

**Examples**:
- `AAPL240315C00150000`: Apple $150 Call expiring March 15, 2024
- `TSLA240420P00200000`: Tesla $200 Put expiring April 20, 2024
- `SPY240517C00450000`: SPY $450 Call expiring May 17, 2024

## Options Approval Levels

The `max_options_trading_level` determines what types of options strategies an account can execute:

- **Level 0**: No options trading allowed
- **Level 1**: Covered calls and cash-secured puts only
- **Level 2**: Long calls and puts (buying options)
- **Level 3**: Spreads and more complex strategies

## Usage Examples

### TypeScript/JavaScript

```typescript
// List open options orders
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/alpaca-options-orders?status=open`,
  {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-trading-mode': 'paper'
    }
  }
);
const orders = await response.json();

// Place a new options order
const orderResponse = await fetch(
  `${SUPABASE_URL}/functions/v1/alpaca-options-orders`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-trading-mode': 'paper'
    },
    body: JSON.stringify({
      symbol: 'AAPL',
      qty: 5,
      side: 'buy',
      type: 'limit',
      time_in_force: 'day',
      limit_price: 5.50,
      option_details: {
        strike: 150,
        expiration: '2024-03-15',
        option_type: 'call',
        contract_size: 100
      }
    })
  }
);
const order = await orderResponse.json();

// Cancel an options order
const cancelResponse = await fetch(
  `${SUPABASE_URL}/functions/v1/alpaca-options-orders?orderId=order-123`,
  {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-trading-mode': 'paper'
    }
  }
);
```

## Error Handling

The API implements comprehensive error handling:

1. **Validation Errors** (400): Invalid parameters or missing required fields
2. **Authorization Errors** (403): Account lacks options trading approval
3. **Not Found Errors** (404): Contract or order not found
4. **Server Errors** (500): Internal errors or Alpaca API failures

All errors follow a consistent format:
```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": "Additional context or suggestions"
}
```

## Security Considerations

- All requests require valid authentication via Supabase Auth
- Trading mode (paper/live) is specified via `x-trading-mode` header
- Account credentials are encrypted and never exposed to clients
- Contract validation prevents trading of invalid or inactive contracts
- Approval level checking ensures regulatory compliance

## Testing

Comprehensive test coverage is provided in `src/lib/__tests__/alpaca-options-orders.test.ts`:

- Contract availability validation tests
- Account approval level checking tests
- OCC symbol construction tests
- Order validation tests
- Integration requirement verification

Run tests:
```bash
npm run test -- src/lib/__tests__/alpaca-options-orders.test.ts --run
```

## Related Documentation

- [Options Contracts API](./OPTIONS_CONTRACTS.md) - Browse and search option contracts
- [Options Exercise API](./OPTIONS_EXERCISE.md) - Exercise option positions
- [Trading Configuration](./TRADING_CONFIGURATION.md) - Manage account trading settings
- [Alpaca Broker API Documentation](https://docs.alpaca.markets/reference/postorder)

## Implementation Notes

### Contract Validation Flow

1. Order request received with option details
2. OCC symbol constructed from option details
3. Contract lookup via `/v1/options/contracts/{symbol}`
4. Verify contract exists, is active, and tradable
5. If validation fails, return 400 error with details

### Approval Level Check Flow

1. After contract validation passes
2. Retrieve account configuration via `/v1/accounts/{account_id}/account_configurations`
3. Check `max_options_trading_level` field
4. If level is 0, return 403 error
5. If level > 0, proceed with order submission

### Performance Considerations

- Contract validation adds ~100-200ms to order placement
- Approval level check adds ~50-100ms to order placement
- Both checks are cached in the auth context where possible
- Failed validations return immediately without submitting to Alpaca

## Changelog

### January 2025 - Enhanced Validation (Requirement 7.5)
- Added contract availability validation before order placement
- Implemented account approval level checking
- Enhanced error messages with actionable details
- Added comprehensive test coverage

### Initial Implementation
- Basic options order placement
- OCC symbol construction
- Order listing and cancellation
- Support for all order types (market, limit, stop, stop-limit)
