# Pattern Day Trader (PDT) Management

## Overview

The Pattern Day Trader (PDT) management system allows users to view their PDT status and exercise a one-time PDT flag removal if eligible. This feature is part of the Alpaca Broker API integration and helps users manage day trading restrictions.

## Requirements

- **Requirement 6.1**: Return PDT status fields (pdt flag, pdt_removed flag, pdt_removed_at timestamp)
- **Requirement 6.2**: Verify account is currently flagged as PDT before removal
- **Requirement 6.3**: Update account status and return confirmation on successful removal
- **Requirement 6.4**: Return 403 error if PDT removal already used
- **Requirement 6.5**: Return 403 error if account is not currently PDT

## Architecture

### Components

1. **Edge Function**: `supabase/functions/alpaca-pdt-removal/index.ts`
   - Handles PDT removal requests
   - Validates eligibility before removal
   - Enforces one-time removal restriction

2. **Frontend Library**: `src/lib/alpaca-account.ts`
   - `removePDTFlag()` - Removes PDT flag from account

3. **API Route**: `src/pages/api/alpaca/pdt-removal/[accountId].ts`
   - REST endpoint for PDT removal

4. **Shared Client**: `supabase/functions/_shared/alpaca-client.ts`
   - `removePDTFlag()` - Core API client method

## PDT Status Fields

The `AlpacaAccount` interface includes the following PDT-related fields:

```typescript
interface AlpacaAccount {
  pattern_day_trader: boolean;      // Current PDT status
  pdt_removed?: boolean;            // Whether PDT removal has been used
  pdt_removed_at?: string;          // Timestamp of PDT removal (ISO 8601)
  daytrade_count: number;           // Number of day trades in rolling 5-day period
  // ... other fields
}
```

## API Endpoints

### Remove PDT Flag

**Endpoint**: `POST /v1/accounts/{account_id}/pdt_removal`

**Description**: Removes the Pattern Day Trader flag from an account. This is a one-time only operation.

**Request**:
```bash
POST /v1/accounts/{account_id}/pdt_removal
```

**Response** (Success - 200):
```json
{
  "message": "PDT flag removed successfully",
  "pdt_removed": true,
  "pdt_removed_at": "2025-01-10T12:00:00Z"
}
```

**Response** (Not PDT - 403):
```json
{
  "error": "Account is not currently flagged as a Pattern Day Trader"
}
```

**Response** (Already Used - 403):
```json
{
  "error": "PDT removal was already used on 2024-12-01T10:00:00Z. This is a one-time only operation."
}
```

## Usage Examples

### Frontend Library

```typescript
import { removePDTFlag, getAlpacaAccount } from '@/lib/alpaca-account';

// Check PDT status
const accountResult = await getAlpacaAccount('account-id', 'paper');
if (accountResult.success && accountResult.account) {
  const account = accountResult.account;
  
  console.log('PDT Status:', account.pattern_day_trader);
  console.log('PDT Removed:', account.pdt_removed);
  console.log('PDT Removed At:', account.pdt_removed_at);
  console.log('Day Trade Count:', account.daytrade_count);
}

// Remove PDT flag (if eligible)
// The function calls the Supabase Edge Function directly
const result = await removePDTFlag('account-id');

if (result.success) {
  console.log('PDT flag removed successfully');
  console.log('Removed at:', result.pdt_removed_at);
} else {
  console.error('Failed to remove PDT flag:', result.error);
}
```

### Edge Function (Direct Call)

```typescript
// Direct call to edge function
const response = await fetch(
  `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-pdt-removal/account-id`,
  {
    method: 'POST',
    credentials: 'include', // Includes authentication cookies
  }
);

const data = await response.json();

if (response.ok) {
  console.log('PDT removed:', data.pdt_removed);
  console.log('Removed at:', data.pdt_removed_at);
} else {
  console.error('Error:', data.error);
}
```

## Validation Rules

### Eligibility Checks

1. **Account Must Be PDT**: The account must currently have `pattern_day_trader: true`
2. **One-Time Only**: The account must not have `pdt_removed: true`
3. **Account Must Exist**: The account ID must be valid

### Error Handling

| Condition | Status Code | Error Message |
|-----------|-------------|---------------|
| Account not PDT | 403 | "Account is not currently flagged as a Pattern Day Trader" |
| PDT removal already used | 403 | "PDT removal was already used on {date}. This is a one-time only operation." |
| Account not found | 404 | "Account not found" |
| Invalid account ID | 400 | "Account ID is required for PDT removal" |
| API error | 400/500 | Alpaca API error message |

## Pattern Day Trader Rules

### What is a Pattern Day Trader?

A Pattern Day Trader (PDT) is defined by FINRA as a trader who executes 4 or more day trades within 5 business days in a margin account, provided the number of day trades is more than 6% of total trades during that period.

### PDT Restrictions

- **Minimum Equity**: PDT accounts must maintain $25,000 minimum equity
- **Day Trading Buying Power**: Limited to 4x the maintenance margin excess
- **Trading Restrictions**: If equity falls below $25,000, day trading is restricted

### One-Time PDT Removal

- **Eligibility**: Account must be currently flagged as PDT
- **Frequency**: Can only be used once per account lifetime
- **Effect**: Removes the PDT flag but does not prevent future PDT designation
- **Caution**: Use wisely as this cannot be reversed or repeated

## Testing

### Unit Tests

Run the PDT removal tests:

```bash
npm run test -- alpaca-pdt-removal.test.ts
```

### Test Coverage

- ✅ Successful PDT removal
- ✅ Error when account is not PDT
- ✅ Error when PDT removal already used
- ✅ Network error handling
- ✅ Non-JSON error response handling
- ✅ Live trading mode support

## Security Considerations

1. **Authentication**: All requests require valid Supabase authentication
2. **Authorization**: Users can only remove PDT flag from their own accounts
3. **Rate Limiting**: Consider implementing rate limits to prevent abuse
4. **Audit Trail**: PDT removal timestamp is permanently recorded

## Best Practices

1. **Check Status First**: Always check PDT status before attempting removal
2. **User Confirmation**: Require explicit user confirmation before removal
3. **Display Warning**: Warn users that this is a one-time only operation
4. **Show History**: Display PDT removal history if applicable
5. **Error Handling**: Provide clear error messages to users

## Related Documentation

- [Account Management](./ALPACA_BROKER_API.md)
- [Trading Configuration](./TRADING_CONFIGURATION.md)
- [Alpaca Broker API Spec](./.kiro/specs/alpaca-broker-api-complete/)

## Implementation Status

- ✅ Edge Function implementation
- ✅ Frontend library functions
- ✅ API routes
- ✅ Type definitions
- ✅ Unit tests
- ✅ Documentation
- ⏳ UI components (pending)

## Future Enhancements

1. **UI Component**: Create a PDT status display and removal component
2. **Notifications**: Send email notification when PDT flag is removed
3. **Analytics**: Track PDT removal usage across platform
4. **Dashboard Integration**: Add PDT status to account dashboard
