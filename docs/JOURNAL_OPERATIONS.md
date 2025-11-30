# Journal Operations Documentation

## Overview

Journal operations enable internal transfers of cash (JNLC) and securities (JNLS) between accounts on the LeadTrade platform. This is useful for platform administrators to facilitate internal account movements, rebalancing, and other operational needs.

## Features

- **Cash Journals (JNLC)**: Transfer cash between accounts
- **Securities Journals (JNLS)**: Transfer securities/stocks between accounts
- **Batch Operations**: Create multiple journals in a single request (one-to-many or many-to-one)
- **Status Tracking**: Monitor journal status (pending, executed, canceled, rejected)
- **Cancellation**: Cancel pending journals before execution

## Requirements Implemented

- **11.1**: JNLC journal creation for cash transfers
- **11.2**: JNLS journal creation for securities transfers
- **11.3**: Batch journal operations (one-to-many and many-to-one)
- **11.4**: Journal cancellation for pending entries
- **11.5**: Validation that executed journals cannot be canceled

## API Endpoints

### 1. Create Journal Entry

Creates a single journal entry for cash or securities transfer.

**Endpoint**: `POST /v1/journals`

**Request Body**:
```typescript
{
  entry_type: 'JNLC' | 'JNLS',
  from_account: string,
  to_account: string,
  amount?: string,        // Required for JNLC
  symbol?: string,        // Required for JNLS
  qty?: string,           // Required for JNLS
  description?: string
}
```

**Example - Cash Journal**:
```typescript
const cashJournal = await createJournal({
  entry_type: 'JNLC',
  from_account: 'account-123',
  to_account: 'account-456',
  amount: '1000.00',
  description: 'Internal transfer for rebalancing'
});
```

**Example - Securities Journal**:
```typescript
const securitiesJournal = await createJournal({
  entry_type: 'JNLS',
  from_account: 'account-123',
  to_account: 'account-456',
  symbol: 'AAPL',
  qty: '10',
  description: 'Transfer AAPL shares'
});
```

### 2. Create Batch Journals

Creates multiple journal entries in a single request. Supports one-to-many and many-to-one patterns.

**Endpoint**: `POST /v1/journals/batch`

**Request Body**:
```typescript
{
  entry_type: 'JNLC',
  from_account?: string,  // For one-to-many
  to_account?: string,    // For many-to-one
  entries: Array<{
    from_account?: string,
    to_account?: string,
    amount: string
  }>,
  description?: string
}
```

**Example - One-to-Many** (distribute from one account to multiple):
```typescript
const batchJournals = await createBatchJournals({
  entry_type: 'JNLC',
  from_account: 'master-account',
  entries: [
    { to_account: 'account-1', amount: '500.00' },
    { to_account: 'account-2', amount: '750.00' },
    { to_account: 'account-3', amount: '250.00' }
  ],
  description: 'Distribute funds to sub-accounts'
});
```

**Example - Many-to-One** (collect from multiple accounts to one):
```typescript
const batchJournals = await createBatchJournals({
  entry_type: 'JNLC',
  to_account: 'master-account',
  entries: [
    { from_account: 'account-1', amount: '100.00' },
    { from_account: 'account-2', amount: '200.00' },
    { from_account: 'account-3', amount: '150.00' }
  ],
  description: 'Collect funds from sub-accounts'
});
```

### 3. List Journals

Retrieves all journals with optional filtering.

**Endpoint**: `GET /v1/journals`

**Query Parameters**:
- `after`: Filter journals created after this date (ISO 8601)
- `before`: Filter journals created before this date (ISO 8601)
- `status`: Filter by status (`pending`, `executed`, `canceled`, `rejected`)
- `entry_type`: Filter by type (`JNLC`, `JNLS`)
- `to_account`: Filter by destination account
- `from_account`: Filter by source account

**Example**:
```typescript
const journals = await listJournals({
  status: 'pending',
  entry_type: 'JNLC',
  after: '2025-01-01T00:00:00Z'
});
```

### 4. Cancel Journal

Cancels a pending journal entry. Only journals in `pending` status can be canceled.

**Endpoint**: `DELETE /v1/journals/{journal_id}`

**Example**:
```typescript
const result = await cancelJournal('journal-id-123');
```

## Journal Status Lifecycle

1. **pending**: Journal created but not yet executed
2. **executed**: Journal successfully processed and funds/securities transferred
3. **canceled**: Journal was canceled before execution
4. **rejected**: Journal was rejected (e.g., insufficient funds, invalid account)

## Important Notes

### Cash Journals (JNLC)

- Requires `amount` field (positive number)
- Transfers cash from `from_account` to `to_account`
- Both accounts must have sufficient balance
- Amount is in USD

### Securities Journals (JNLS)

- Requires `symbol` and `qty` fields
- Transfers securities from `from_account` to `to_account`
- Source account must hold the specified quantity
- Symbol must be valid and tradable

### Batch Journals

- Only supports JNLC (cash) journals
- Must specify either `from_account` (one-to-many) OR `to_account` (many-to-one), not both
- Each entry must have an `amount`
- For one-to-many: each entry needs `to_account`
- For many-to-one: each entry needs `from_account`

### Cancellation Rules

- Only `pending` journals can be canceled
- `executed` journals cannot be canceled - create a reverse journal instead
- `canceled` and `rejected` journals are already final

### Reverse Journals

To undo an executed journal, create a new journal with reversed accounts:

```typescript
// Original journal
const original = await createJournal({
  entry_type: 'JNLC',
  from_account: 'account-A',
  to_account: 'account-B',
  amount: '1000.00'
});

// Reverse journal
const reverse = await createJournal({
  entry_type: 'JNLC',
  from_account: 'account-B',  // Reversed
  to_account: 'account-A',    // Reversed
  amount: '1000.00',
  description: `Reversal of journal ${original.journal?.id}`
});
```

## Error Handling

Common error scenarios:

1. **Insufficient Funds**: Source account doesn't have enough cash
2. **Insufficient Securities**: Source account doesn't hold enough shares
3. **Invalid Account**: Account ID doesn't exist or is closed
4. **Invalid Symbol**: Symbol doesn't exist or isn't tradable
5. **Cannot Cancel**: Journal is not in pending status
6. **Invalid Amount/Qty**: Amount or quantity is not a positive number

## Frontend Integration

### Using the Library

```typescript
import { 
  createJournal, 
  createBatchJournals, 
  listJournals, 
  cancelJournal 
} from '@/lib/alpaca-journals';

// Create a cash journal
const result = await createJournal({
  entry_type: 'JNLC',
  from_account: 'source-account',
  to_account: 'dest-account',
  amount: '500.00',
  description: 'Monthly allocation'
});

if (result.success) {
  console.log('Journal created:', result.journal);
} else {
  console.error('Error:', result.error);
}
```

The library automatically calls the Supabase Edge Function with proper authentication via cookies.

## Use Cases

### 1. Account Rebalancing

Transfer funds between accounts to maintain target allocations:

```typescript
const rebalance = await createBatchJournals({
  entry_type: 'JNLC',
  from_account: 'main-account',
  entries: [
    { to_account: 'conservative-account', amount: '5000.00' },
    { to_account: 'aggressive-account', amount: '3000.00' }
  ],
  description: 'Quarterly rebalancing'
});
```

### 2. Fee Collection

Collect fees from multiple accounts:

```typescript
const feeCollection = await createBatchJournals({
  entry_type: 'JNLC',
  to_account: 'fee-account',
  entries: [
    { from_account: 'user-1', amount: '9.99' },
    { from_account: 'user-2', amount: '9.99' },
    { from_account: 'user-3', amount: '9.99' }
  ],
  description: 'Monthly subscription fees'
});
```

### 3. Securities Transfer

Transfer shares between accounts:

```typescript
const shareTransfer = await createJournal({
  entry_type: 'JNLS',
  from_account: 'donor-account',
  to_account: 'recipient-account',
  symbol: 'TSLA',
  qty: '5',
  description: 'Gift transfer'
});
```

## Testing

The implementation includes comprehensive tests covering:

- Single journal creation (JNLC and JNLS)
- Batch journal creation (one-to-many and many-to-one)
- Journal listing with filters
- Journal cancellation
- Validation errors
- Status transitions

Run tests with:
```bash
npm run test -- src/lib/__tests__/alpaca-journals.test.ts
```

## Security Considerations

- Journal operations should be restricted to platform administrators
- Validate account ownership and permissions
- Log all journal operations for audit trail
- Implement rate limiting to prevent abuse
- Verify account balances before execution

## Related Documentation

- [Transfer Operations](./TRANSFER_OPERATIONS.md) - External transfers (ACH, wire)
- [Account Management](./ALPACA_BROKER_API.md) - Account operations
- [Trading Configuration](./TRADING_CONFIGURATION.md) - Trading settings

## Support

For issues or questions about journal operations:
1. Check the error message for specific validation failures
2. Verify account IDs and balances
3. Ensure journal is in correct status for the operation
4. Review Alpaca Broker API documentation for additional details
