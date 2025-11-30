# Trading Configuration API Implementation

## Overview

This document describes the implementation of the Alpaca Trading Configuration API endpoints for managing account trading settings.

## Implementation Date

January 2025

## Requirements Covered

- **Requirement 5.1**: Support all configuration fields (dtbp_check, trade_confirm_email, suspend_trade, no_shorting, fractional_trading, max_margin_multiplier, pdt_check, ptp_no_exception_entry, max_options_trading_level)
- **Requirement 5.2**: Enforce margin multiplier limits (1-4)
- **Requirement 5.3**: Enable/disable fractional trading
- **Requirement 5.4**: Suspend/resume trading
- **Requirement 5.5**: Configure PDT settings

## Architecture

### Edge Function
**Location**: `supabase/functions/alpaca-trading-config/index.ts`

Handles:
- GET requests to retrieve trading configuration
- PATCH requests to update trading configuration
- Validation of all configuration fields
- Margin multiplier validation (1-4)
- Options level validation (0-3)
- Direct communication with Alpaca Broker API
- Authentication via Supabase auth context

**Endpoints**:
- `GET /functions/v1/alpaca-trading-config/{accountId}` - Get configuration
- `PATCH /functions/v1/alpaca-trading-config/{accountId}` - Update configuration

### Frontend Library
**Location**: `src/lib/alpaca-trading-config.ts`

Provides:
- `getTradingConfiguration(accountId)` - Retrieve configuration
- `updateTradingConfiguration(accountId, config)` - Update configuration
- Convenience methods:
  - `enableFractionalTrading(accountId)`
  - `disableFractionalTrading(accountId)`
  - `suspendTrading(accountId)`
  - `resumeTrading(accountId)`
  - `enableShortSelling(accountId)`
  - `disableShortSelling(accountId)`
  - `setMarginMultiplier(accountId, multiplier)`
  - `setOptionsLevel(accountId, level)`

**Note**: The frontend library calls Supabase Edge Functions directly using `credentials: 'include'` for authentication.

### Type Definitions
**Location**: `src/types/trading.ts`

Added:
- `TradingConfiguration` interface
- `TradingConfigUpdate` interface

### Shared Alpaca Client
**Location**: `supabase/functions/_shared/alpaca-client.ts`

Enhanced:
- `getAccountConfiguration(accountId)` - Returns typed configuration
- `updateAccountConfiguration(accountId, config)` - Updates with validation
- Added `TradingConfiguration` type export

## Configuration Fields

### dtbp_check
Day Trade Buying Power check timing
- Values: `'entry'` | `'exit'` | `'both'`
- Controls when DTBP is checked during trading

### trade_confirm_email
Trade confirmation email settings
- Values: `'all'` | `'none'`
- Controls email notifications for trades

### suspend_trade
Trading suspension flag
- Type: `boolean`
- When `true`, prevents new order submissions

### no_shorting
Short selling restriction
- Type: `boolean`
- When `true`, disables short selling

### fractional_trading
Fractional shares trading
- Type: `boolean`
- Enables/disables fractional share orders

### max_margin_multiplier
Maximum margin multiplier
- Type: `string` (numeric)
- Range: 1-4
- Controls maximum leverage

### pdt_check
Pattern Day Trader check timing
- Values: `'entry'` | `'exit'` | `'both'`
- Controls when PDT rules are enforced

### ptp_no_exception_entry
Prevent Pattern Day Trader exceptions
- Type: `boolean`
- When `true`, prevents PDT exception entries

### max_options_trading_level
Maximum options trading level
- Type: `number`
- Range: 0-3
- Controls options trading permissions

## Validation Rules

### Margin Multiplier
- Must be a number between 1 and 4
- Validated on both client and server side
- Enforced based on account equity

### Options Level
- Must be an integer between 0 and 3
- Level 0: No options trading
- Level 1: Covered calls and cash-secured puts
- Level 2: Long options
- Level 3: Spreads

### Enum Values
- `dtbp_check`: Must be 'entry', 'exit', or 'both'
- `trade_confirm_email`: Must be 'all' or 'none'
- `pdt_check`: Must be 'entry', 'exit', or 'both'

## Usage Examples

### Get Trading Configuration

```typescript
import { getTradingConfiguration } from '@/lib/alpaca-trading-config'

const { success, config, error } = await getTradingConfiguration('account-id-123')

if (!success) {
  console.error('Failed to get config:', error)
} else {
  console.log('Current config:', config)
}
```

### Update Configuration

```typescript
import { updateTradingConfiguration } from '@/lib/alpaca-trading-config'

const { success, config, error } = await updateTradingConfiguration('account-id-123', {
  fractional_trading: true,
  max_margin_multiplier: '2',
  suspend_trade: false
})

if (!success) {
  console.error('Failed to update config:', error)
} else {
  console.log('Updated config:', config)
}
```

### Enable Fractional Trading

```typescript
import { enableFractionalTrading } from '@/lib/alpaca-trading-config'

const { success, config, error } = await enableFractionalTrading('account-id-123')
```

### Suspend Trading

```typescript
import { suspendTrading } from '@/lib/alpaca-trading-config'

const { success, config, error } = await suspendTrading('account-id-123')
```

### Set Margin Multiplier

```typescript
import { setMarginMultiplier } from '@/lib/alpaca-trading-config'

const { success, config, error } = await setMarginMultiplier('account-id-123', 2)
```

## Error Handling

All functions return a response object with `success`, and either `config` or `error`:

```typescript
interface TradingConfigResponse {
  success: boolean
  config?: TradingConfiguration
  error?: string
}
```

Common error messages:
- `"Account ID is required"`: Account ID not provided
- `"At least one configuration field must be provided"`: Empty update request
- `"max_margin_multiplier must be a number between 1 and 4"`: Invalid margin multiplier
- `"Validation error: ..."`: Zod schema validation failed
- `"Failed to fetch trading configuration"`: Edge function error
- `"Invalid response from server"`: Response doesn't match expected schema

## Testing

The implementation includes:
- Client-side validation before API calls
- Server-side validation in edge function
- Type safety with TypeScript interfaces
- Error handling at all layers

## Security

- All requests require authentication via Bearer token
- Trading mode (paper/live) is determined from user profile
- RLS policies enforce user access control
- API credentials are never exposed to client

## Future Enhancements

Potential improvements:
- UI components for configuration management
- Real-time configuration change notifications
- Configuration history tracking
- Bulk configuration updates for multiple accounts
- Configuration templates/presets

## Related Documentation

- [Alpaca Broker API Documentation](https://alpaca.markets/docs/broker/)
- [Account Management](./ALPACA_BROKER_API.md)
- [Trading Operations](../README.md)
