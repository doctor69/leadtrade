# Watchlist Management

## Overview

The Watchlist Management system provides comprehensive functionality for users to create, manage, and track custom lists of securities. This implementation includes symbol validation, atomic updates, and complete asset details retrieval.

## Features

### 1. Create Watchlists (Requirement 9.1)
- Create watchlists with custom names
- Optionally include initial symbols
- Automatic symbol validation on creation

### 2. Symbol Validation (Requirement 9.2)
- Validates symbol existence before adding
- Checks if symbols are tradable
- Verifies asset status is active
- Returns detailed error messages for invalid symbols

### 3. Atomic Updates (Requirement 9.3)
- Replace entire symbol list in a single operation
- Update watchlist name independently
- Combined name and symbol updates
- All updates are atomic (all-or-nothing)

### 4. Delete Watchlists (Requirement 9.4)
- Permanent deletion without confirmation
- Immediate removal from system
- Clean error handling for non-existent watchlists

### 5. Complete Asset Details (Requirement 9.5)
- Returns full asset information for each symbol
- Includes trading attributes (tradable, marginable, shortable, fractionable)
- Provides exchange and asset class information
- Shows current status and availability

## API Endpoints

### Edge Function: `alpaca-watchlists`

#### GET - List All Watchlists
```typescript
GET /functions/v1/alpaca-watchlists

Response:
[
  {
    id: string
    account_id: string
    name: string
    created_at: string
    updated_at: string
    assets: [
      {
        id: string
        symbol: string
        name: string
        asset_class: string
        exchange: string
        tradable: boolean
        marginable: boolean
        shortable: boolean
        fractionable: boolean
        status: string
      }
    ]
  }
]
```

#### GET - Get Specific Watchlist
```typescript
GET /functions/v1/alpaca-watchlists?watchlistId={id}

Response:
{
  id: string
  account_id: string
  name: string
  created_at: string
  updated_at: string
  assets: [...]  // Complete asset details
}
```

#### POST - Create Watchlist
```typescript
POST /functions/v1/alpaca-watchlists

Body:
{
  name: string
  symbols?: string[]  // Optional, validated if provided
}

Response:
{
  id: string
  account_id: string
  name: string
  symbols: string[]
  created_at: string
  updated_at: string
}
```

#### POST - Add Symbols to Watchlist
```typescript
POST /functions/v1/alpaca-watchlists?watchlistId={id}&action=add

Body:
{
  symbols: string[]  // Validated before adding
}

Response:
{
  id: string
  account_id: string
  name: string
  symbols: string[]
  created_at: string
  updated_at: string
}

Error Response (Invalid Symbols):
{
  code: "INVALID_REQUEST"
  message: "Some symbols are invalid or not tradable"
  details: {
    invalid_symbols: string[]
    valid_symbols: string[]
  }
}
```

#### PUT - Update Watchlist (Atomic)
```typescript
PUT /functions/v1/alpaca-watchlists?watchlistId={id}

Body (Name Only):
{
  name: string
}

Body (Name + Symbols - Atomic Replace):
{
  name: string
  symbols: string[]  // Replaces entire list atomically
}

Response:
{
  id: string
  account_id: string
  name: string
  symbols: string[]
  created_at: string
  updated_at: string
}
```

#### DELETE - Delete Watchlist
```typescript
DELETE /functions/v1/alpaca-watchlists?watchlistId={id}

Response:
{
  message: "Watchlist deleted successfully"
}
```

#### DELETE - Remove Symbols from Watchlist
```typescript
DELETE /functions/v1/alpaca-watchlists?watchlistId={id}&action=remove

Body:
{
  symbols: string[]
}

Response:
{
  message: "Symbol removal completed"
  results: [
    {
      symbol: string
      success: boolean
      error?: object
    }
  ]
}
```

## Symbol Validation

The system validates symbols before adding them to watchlists:

1. **Existence Check**: Verifies the symbol exists in Alpaca's asset database
2. **Tradability Check**: Ensures the asset is tradable
3. **Status Check**: Confirms the asset status is "active"

### Validation Process

```typescript
// Symbols are validated by querying Alpaca's assets endpoint
GET /v2/assets/{symbol}

// Valid symbol criteria:
- Asset exists
- tradable === true
- status === "active"
```

### Error Handling

When invalid symbols are detected:
```json
{
  "code": "INVALID_REQUEST",
  "message": "Some symbols are invalid or not tradable",
  "details": {
    "invalid_symbols": ["INVALID1", "NOTRADE2"],
    "valid_symbols": ["AAPL", "GOOGL"]
  }
}
```

## Atomic Updates

The PUT endpoint supports atomic updates of the entire symbol list:

### Update Name Only
```typescript
PUT /v2/watchlists/{id}
{
  "name": "New Name"
}
// Symbols remain unchanged
```

### Replace Symbols Atomically
```typescript
PUT /v2/watchlists/{id}
{
  "name": "Tech Stocks",
  "symbols": ["NVDA", "AMD", "INTC"]
}
// Entire symbol list is replaced in one operation
// Previous symbols are removed, new symbols are added
// Operation is all-or-nothing
```

## Complete Asset Details

When retrieving watchlists, the system returns complete asset information:

```typescript
{
  id: "watchlist-123",
  name: "Tech Stocks",
  assets: [
    {
      id: "asset-id",
      symbol: "AAPL",
      name: "Apple Inc.",
      asset_class: "us_equity",
      exchange: "NASDAQ",
      tradable: true,
      marginable: true,
      shortable: true,
      fractionable: true,
      status: "active",
      // Additional trading attributes...
    }
  ]
}
```

## Usage Examples

### Create a Watchlist
```typescript
const result = await edgeFunctionClient.post('alpaca-watchlists', {
  name: 'Tech Stocks',
  symbols: ['AAPL', 'GOOGL', 'MSFT']
})
```

### Add Symbols with Validation
```typescript
const result = await edgeFunctionClient.post(
  'alpaca-watchlists',
  { symbols: ['TSLA', 'NVDA'] },
  { watchlistId: 'watchlist-123', action: 'add' }
)

if (result.error) {
  console.error('Invalid symbols:', result.error.details.invalid_symbols)
}
```

### Atomic Symbol Update
```typescript
const result = await edgeFunctionClient.put(
  'alpaca-watchlists',
  {
    name: 'Updated Name',
    symbols: ['NVDA', 'AMD', 'INTC']  // Replaces all symbols
  },
  { watchlistId: 'watchlist-123' }
)
```

### Delete Watchlist
```typescript
const result = await edgeFunctionClient.delete('alpaca-watchlists', {
  watchlistId: 'watchlist-123'
})
```

## Testing

Comprehensive test coverage includes:

- ✅ Creating watchlists with name and symbols
- ✅ Symbol validation on creation
- ✅ Symbol validation when adding to existing watchlist
- ✅ Atomic updates of symbol lists
- ✅ Name-only updates
- ✅ Deleting watchlists
- ✅ Retrieving watchlists with complete asset details
- ✅ Removing symbols from watchlists
- ✅ Error handling for invalid inputs

Run tests:
```bash
npm run test -- alpaca-watchlists
```

## Implementation Files

- **Edge Function**: `supabase/functions/alpaca-watchlists/index.ts`
- **Tests**: `src/lib/__tests__/alpaca-watchlists.test.ts`
- **Client Integration**: `src/lib/alpaca-broker-client.ts`
- **Hook**: `src/hooks/useAlpacaBroker.ts`

## Requirements Coverage

- ✅ **Requirement 9.1**: Create watchlists with name and array of symbols
- ✅ **Requirement 9.2**: Validate symbol existence and tradability
- ✅ **Requirement 9.3**: Atomic updates replace entire symbol list
- ✅ **Requirement 9.4**: Delete watchlists permanently without confirmation
- ✅ **Requirement 9.5**: Return complete asset details for each symbol

## Security

- Authentication required for all operations
- Row Level Security (RLS) enforced at database level
- Users can only access their own watchlists
- Symbol validation prevents invalid data entry

## Performance Considerations

- Symbol validation is performed in parallel where possible
- Asset details are cached by Alpaca API
- Database queries are optimized with proper indexing
- Atomic updates minimize race conditions

## Future Enhancements

- Bulk symbol validation optimization
- Watchlist sharing between users
- Real-time price updates for watchlist symbols
- Watchlist templates and presets
- Export/import functionality
