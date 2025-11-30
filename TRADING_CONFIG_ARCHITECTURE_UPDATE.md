# Trading Configuration Architecture Update

## Date: January 9, 2025

## Summary

Updated `src/lib/alpaca-trading-config.ts` to follow the correct architecture pattern by calling Supabase Edge Functions directly instead of using Astro API routes. This aligns with the established patterns used in other Alpaca API integrations (bank relationships, ACH relationships, transfers, etc.).

## Changes Made

### 1. Frontend Library (`src/lib/alpaca-trading-config.ts`)

#### Before:
- Called Astro API routes at `/api/alpaca/trading-config/*`
- Used Supabase Auth session for authentication
- Interface-based TypeScript types
- Complex error response structure with `TradingConfigError` interface

#### After:
- ✅ Calls Supabase Edge Functions directly at `/functions/v1/alpaca-trading-config/{accountId}`
- ✅ Uses `credentials: 'include'` for authentication (handled by Supabase)
- ✅ Zod-based validation schemas for runtime type safety
- ✅ Simplified response format: `{ success: boolean; config?: TradingConfiguration; error?: string }`
- ✅ Removed dependency on `supabase.ts` import

#### Key Improvements:
1. **Zod Validation Schemas**:
   ```typescript
   export const TradingConfigurationSchema = z.object({
     dtbp_check: z.enum(['entry', 'exit', 'both']),
     trade_confirm_email: z.enum(['all', 'none']),
     suspend_trade: z.boolean(),
     no_shorting: z.boolean(),
     fractional_trading: z.boolean(),
     max_margin_multiplier: z.string(),
     pdt_check: z.enum(['entry', 'exit', 'both']),
     ptp_no_exception_entry: z.boolean(),
     max_options_trading_level: z.number().min(0).max(3)
   })
   ```

2. **Type Inference from Schemas**:
   ```typescript
   export type TradingConfiguration = z.infer<typeof TradingConfigurationSchema>
   export type TradingConfigUpdate = z.infer<typeof TradingConfigUpdateSchema>
   ```

3. **Direct Edge Function Calls**:
   ```typescript
   const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-trading-config/${accountId}`
   
   const response = await fetch(edgeFunctionUrl, {
     method: 'GET',
     credentials: 'include'
   })
   ```

4. **Simplified Response Handling**:
   ```typescript
   return {
     success: true,
     config: configValidation.data
   }
   ```

### 2. Documentation Updates

#### README.md
Updated three occurrences of Phase 5 Trading Configuration section to reflect:
- ✅ Zod validation schemas (`TradingConfigurationSchema`, `TradingConfigUpdateSchema`)
- ✅ Direct Edge Function calls (no Astro API routes)
- ✅ Simplified response format
- ✅ Helper functions: `enableFractionalTrading()`, `suspendTrading()`, `setMarginMultiplier()`, `setOptionsLevel()`
- ✅ Margin multiplier range (1-4)
- ✅ Options trading level range (0-3)

#### tasks.md
Updated Phase 5 section with:
- ✅ Zod schema validation details
- ✅ Direct Edge Function architecture
- ✅ Helper function list
- ✅ Validation range specifications

## Architecture Pattern

### Correct Pattern (Now Implemented)
```
Client Application
    ↓
Frontend Library (src/lib/alpaca-trading-config.ts)
    ↓
Supabase Edge Function (supabase/functions/alpaca-trading-config/index.ts)
    ↓
Shared Alpaca Client (_shared/alpaca-client.ts)
    ↓
Alpaca Broker API (https://broker-api.alpaca.markets)
```

### Why This Architecture?

1. **Security**: API keys never exposed to client
2. **Consistency**: Matches all other Alpaca integrations
3. **Simplicity**: No need for Astro API routes
4. **Type Safety**: Zod validation at runtime
5. **Authentication**: Handled automatically by Supabase

## API Endpoints

### Edge Function Endpoints
```
GET    /functions/v1/alpaca-trading-config/{accountId}
PATCH  /functions/v1/alpaca-trading-config/{accountId}
```

### Configuration Options

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `dtbp_check` | enum | 'entry', 'exit', 'both' | Day Trade Buying Power check timing |
| `trade_confirm_email` | enum | 'all', 'none' | Trade confirmation email settings |
| `suspend_trade` | boolean | true, false | Suspend trading activity |
| `no_shorting` | boolean | true, false | Disable short selling |
| `fractional_trading` | boolean | true, false | Enable fractional shares |
| `max_margin_multiplier` | string | '1' to '4' | Maximum margin multiplier |
| `pdt_check` | enum | 'entry', 'exit', 'both' | Pattern Day Trader check timing |
| `ptp_no_exception_entry` | boolean | true, false | PDT protection settings |
| `max_options_trading_level` | number | 0 to 3 | Maximum options trading level |

## Helper Functions

The library provides convenient helper functions:

```typescript
// Enable/disable fractional trading
await enableFractionalTrading(accountId)
await disableFractionalTrading(accountId)

// Suspend/resume trading
await suspendTrading(accountId)
await resumeTrading(accountId)

// Enable/disable short selling
await enableShortSelling(accountId)
await disableShortSelling(accountId)

// Set margin multiplier (1-4)
await setMarginMultiplier(accountId, 2)

// Set options trading level (0-3)
await setOptionsLevel(accountId, 2)
```

## Validation

### Client-Side Validation
- Zod schema validation for all inputs
- Enum validation for dtbp_check, trade_confirm_email, pdt_check
- Range validation for max_margin_multiplier (1-4)
- Range validation for max_options_trading_level (0-3)
- At least one field required for updates

### Server-Side Validation
- All client-side validations repeated in Edge Function
- Additional security checks
- Authentication verification via Supabase Auth

## Usage Example

```typescript
import { 
  getTradingConfiguration, 
  updateTradingConfiguration,
  enableFractionalTrading,
  setMarginMultiplier
} from '@/lib/alpaca-trading-config';

// Get current configuration
const result = await getTradingConfiguration('account-123');
if (result.success) {
  console.log('Current config:', result.config);
}

// Update configuration
const updateResult = await updateTradingConfiguration('account-123', {
  fractional_trading: true,
  max_margin_multiplier: '2',
  max_options_trading_level: 2
});

// Use helper functions
await enableFractionalTrading('account-123');
await setMarginMultiplier('account-123', 3);
```

## Testing

All existing tests continue to pass with the new architecture:
- ✅ Configuration retrieval
- ✅ Configuration updates
- ✅ Validation rules
- ✅ Error handling
- ✅ Helper functions

## Files Modified

1. ✅ `src/lib/alpaca-trading-config.ts` - Updated to call Edge Functions directly with Zod validation
2. ✅ `README.md` - Updated Phase 5 sections (3 occurrences) with new architecture details
3. ✅ `.kiro/specs/alpaca-broker-api-complete/tasks.md` - Added checkmarks and architecture details

## Consistency with Other Integrations

This update brings Trading Configuration in line with:
- ✅ Bank Relationships (`src/lib/alpaca-bank-relationships.ts`)
- ✅ ACH Relationships (`src/lib/alpaca-ach-relationships.ts`)
- ✅ Transfer Operations (`src/lib/alpaca-transfers.ts`)
- ✅ Document Management (`src/lib/alpaca-documents.ts`)
- ✅ Corporate Actions (`src/lib/alpaca-corporate-actions.ts`)
- ✅ Options Contracts (`src/lib/alpaca-options-contracts.ts`)

All these integrations follow the same pattern:
1. Frontend library calls Edge Function directly
2. Zod validation for type safety
3. Simplified response format
4. No Astro API routes

## Benefits

1. **Reduced Complexity**: No need to maintain Astro API routes
2. **Better Type Safety**: Zod validation catches errors at runtime
3. **Consistent Architecture**: All Alpaca integrations work the same way
4. **Easier Maintenance**: Single source of truth for API logic
5. **Better Security**: Authentication handled by Supabase automatically

## Conclusion

The Trading Configuration library now follows the established architecture pattern used throughout the LeadTrade project. This update improves consistency, type safety, and maintainability while reducing complexity.
