# Transfer Operations Implementation

## Overview

This document describes the implementation of Alpaca transfer operations for LeadTrade, supporting ACH, wire, and sandbox transfers for funding and withdrawing from trading accounts.

## Features

### Transfer Types

1. **ACH Transfers**
   - Electronic bank transfers via ACH network
   - Requires ACH relationship to be established first
   - Supports both incoming (deposits) and outgoing (withdrawals)
   - Typical settlement time: 3-5 business days

2. **Wire Transfers**
   - Fast bank transfers via wire network
   - Requires bank relationship to be established first
   - Supports both incoming and outgoing transfers
   - Requires additional information and fee payment method
   - Typical settlement time: Same day or next business day

3. **Sandbox Transfers**
   - Instant virtual deposits and withdrawals for testing
   - Only available in paper trading mode
   - No actual money movement
   - Immediate approval and processing

### Transfer Statuses

- `queued`: Transfer has been created and is waiting to be processed
- `pending`: Transfer is being processed
- `sent_to_clearing`: Transfer has been sent to the clearing house
- `approved`: Transfer has been approved and completed
- `canceled`: Transfer was canceled before processing
- `rejected`: Transfer was rejected (e.g., insufficient funds, invalid account)

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  - Transfer creation forms                                   │
│  - Transfer history display                                  │
│  - Transfer cancellation                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Astro API Routes                            │
│  - POST /api/alpaca/transfers/[accountId]                   │
│  - GET /api/alpaca/transfers/[accountId]                    │
│  - DELETE /api/alpaca/transfers/[accountId]/[transferId]    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend Library (alpaca-transfers.ts)          │
│  - createTransfer()                                          │
│  - listTransfers()                                           │
│  - cancelTransfer()                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           Supabase Edge Function (alpaca-transfers)          │
│  - Request validation                                        │
│  - Authentication                                            │
│  - Alpaca API proxy                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Alpaca Broker API                         │
│  - POST /v1/accounts/{account_id}/transfers                 │
│  - GET /v1/accounts/{account_id}/transfers                  │
│  - DELETE /v1/accounts/{account_id}/transfers/{transfer_id} │
└─────────────────────────────────────────────────────────────┘
```

## API Reference

### Create Transfer

Creates a new transfer (ACH, wire, or sandbox).

**Endpoint:** `POST /api/alpaca/transfers/{accountId}`

**Request Body:**

```typescript
{
  transfer_type: 'ach' | 'wire' | 'sandbox',
  amount: string,                    // Positive decimal number
  direction: 'INCOMING' | 'OUTGOING',
  timing?: 'immediate' | 'next_day', // Optional
  relationship_id?: string,          // Required for ACH
  bank_id?: string,                  // Required for wire
  additional_information?: string,   // Required for wire
  fee_payment_method?: 'user' | 'invoice' // Required for wire
}
```

**ACH Transfer Example:**

```typescript
const result = await createTransfer('account-123', {
  transfer_type: 'ach',
  amount: '1000.00',
  direction: 'INCOMING',
  relationship_id: 'ach-rel-123'
}, 'paper');
```

**Wire Transfer Example:**

```typescript
const result = await createTransfer('account-123', {
  transfer_type: 'wire',
  amount: '5000.00',
  direction: 'OUTGOING',
  bank_id: 'bank-123',
  additional_information: 'Investment withdrawal',
  fee_payment_method: 'user'
}, 'paper');
```

**Sandbox Transfer Example:**

```typescript
const result = await createTransfer('account-123', {
  transfer_type: 'sandbox',
  amount: '10000.00',
  direction: 'INCOMING'
}, 'paper');
```

**Response:**

```typescript
{
  success: boolean,
  transfer?: {
    id: string,
    account_id: string,
    type: 'ach' | 'wire' | 'sandbox',
    status: string,
    amount: string,
    direction: 'INCOMING' | 'OUTGOING',
    created_at: string,
    updated_at: string,
    expires_at?: string,
    relationship_id?: string,
    bank_id?: string,
    additional_information?: string,
    fee_payment_method?: 'user' | 'invoice'
  },
  error?: string
}
```

### List Transfers

Lists all transfers for an account with optional filtering.

**Endpoint:** `GET /api/alpaca/transfers/{accountId}`

**Query Parameters:**

- `direction` (optional): Filter by `INCOMING` or `OUTGOING`
- `limit` (optional): Maximum number of results (default: 100)
- `offset` (optional): Number of results to skip for pagination

**Example:**

```typescript
const result = await listTransfers('account-123', {
  direction: 'INCOMING',
  limit: 10,
  offset: 0
}, 'paper');
```

**Response:**

```typescript
{
  success: boolean,
  transfers?: Transfer[],
  error?: string
}
```

### Cancel Transfer

Cancels a pending transfer. Only transfers in `pending` status can be canceled.

**Endpoint:** `DELETE /api/alpaca/transfers/{accountId}/{transferId}`

**Example:**

```typescript
const result = await cancelTransfer('account-123', 'transfer-123', 'paper');
```

**Response:**

```typescript
{
  success: boolean,
  error?: string
}
```

## Validation Rules

### General Validation

1. **transfer_type**: Must be one of `ach`, `wire`, or `sandbox`
2. **amount**: Must be a positive decimal number
3. **direction**: Must be either `INCOMING` or `OUTGOING`

### ACH Transfer Validation

1. **relationship_id**: Required - must reference an existing ACH relationship
2. The ACH relationship must be in `approved` status

### Wire Transfer Validation

1. **bank_id**: Required - must reference an existing bank relationship
2. **additional_information**: Required - description of the transfer
3. **fee_payment_method**: Required - must be either `user` or `invoice`
4. The bank relationship must be in `approved` status

### Sandbox Transfer Validation

1. No additional fields required
2. Only available in paper trading mode
3. Instantly approved for testing purposes

## Database Schema

### transfers Table

```sql
CREATE TABLE transfers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID,
  alpaca_transfer_id TEXT UNIQUE,
  transfer_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status TEXT NOT NULL,
  timing TEXT,
  relationship_id TEXT,
  bank_id TEXT,
  additional_information TEXT,
  fee_payment_method TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);
```

### Indexes

- `idx_transfers_user_id`: Fast lookup by user
- `idx_transfers_account_id`: Fast lookup by account
- `idx_transfers_alpaca_id`: Fast lookup by Alpaca transfer ID
- `idx_transfers_status`: Filter by status
- `idx_transfers_direction`: Filter by direction
- `idx_transfers_type`: Filter by transfer type
- `idx_transfers_created_at`: Sort by creation date
- `idx_transfers_user_status_created`: Composite index for common queries

### Row Level Security (RLS)

- Users can only view their own transfers
- Users can only create transfers for their own accounts
- Users can only update their own transfers
- Users can only delete their own pending transfers

## Error Handling

### Common Errors

1. **Missing Required Fields**
   - Status: 400
   - Message: Specific field name that is missing

2. **Invalid Transfer Type**
   - Status: 400
   - Message: "transfer_type must be one of: ach, wire, sandbox"

3. **Invalid Direction**
   - Status: 400
   - Message: "direction must be either INCOMING or OUTGOING"

4. **Invalid Amount**
   - Status: 400
   - Message: "amount must be a positive number"

5. **Missing ACH Relationship**
   - Status: 400
   - Message: "relationship_id is required for ACH transfers"

6. **Missing Wire Transfer Fields**
   - Status: 400
   - Message: Specific field name that is missing

7. **Insufficient Funds**
   - Status: 400
   - Message: "Insufficient funds for withdrawal"

8. **Transfer Cannot Be Canceled**
   - Status: 400
   - Message: "Only pending transfers can be canceled"

## Testing

### Unit Tests

The implementation includes comprehensive unit tests covering:

1. **ACH Transfer Creation**
   - Valid ACH transfer with relationship_id
   - Missing relationship_id validation

2. **Wire Transfer Creation**
   - Valid wire transfer with all required fields
   - Missing bank_id validation
   - Missing additional_information validation
   - Missing fee_payment_method validation

3. **Sandbox Transfer Creation**
   - Valid sandbox transfer
   - Instant approval in paper mode

4. **Validation Tests**
   - Required fields validation
   - Transfer type validation
   - Direction validation
   - Amount validation (positive number)

5. **List Transfers**
   - List all transfers
   - Filter by direction
   - Pagination support

6. **Cancel Transfer**
   - Successful cancellation
   - Error handling for non-pending transfers

### Running Tests

```bash
npm run test -- src/lib/__tests__/alpaca-transfers.test.ts --run
```

## Usage Examples

### Complete Transfer Flow

```typescript
// 1. Create an ACH relationship first
const achResult = await createACHRelationship('account-123', {
  account_owner_name: 'John Doe',
  bank_account_type: 'checking',
  bank_account_number: '123456789',
  bank_routing_number: '021000021',
  nickname: 'My Checking Account'
}, 'paper');

// 2. Wait for ACH relationship approval (in production)
// In sandbox, it's typically instant

// 3. Create a transfer
const transferResult = await createTransfer('account-123', {
  transfer_type: 'ach',
  amount: '1000.00',
  direction: 'INCOMING',
  relationship_id: achResult.ach.id
}, 'paper');

// 4. Monitor transfer status
const listResult = await listTransfers('account-123', {}, 'paper');
console.log('Transfer status:', listResult.transfers[0].status);

// 5. Cancel if needed (only if pending)
if (transferResult.transfer.status === 'pending') {
  await cancelTransfer('account-123', transferResult.transfer.id, 'paper');
}
```

### Sandbox Testing

```typescript
// Instant deposit for testing
const depositResult = await createTransfer('account-123', {
  transfer_type: 'sandbox',
  amount: '10000.00',
  direction: 'INCOMING'
}, 'paper');

// Instant withdrawal for testing
const withdrawalResult = await createTransfer('account-123', {
  transfer_type: 'sandbox',
  amount: '5000.00',
  direction: 'OUTGOING'
}, 'paper');
```

## Security Considerations

1. **Authentication**: All endpoints require valid user authentication
2. **Authorization**: Users can only access their own transfers
3. **Validation**: All inputs are validated before sending to Alpaca API
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Sensitive Data**: Never log full account numbers or routing numbers
6. **HTTPS**: All API communications use HTTPS

## Future Enhancements

1. **Transfer Notifications**: Email/SMS notifications for transfer status changes
2. **Recurring Transfers**: Support for scheduled recurring transfers
3. **Transfer Limits**: Configurable daily/monthly transfer limits
4. **Multi-Currency**: Support for international transfers
5. **Instant Funding (JIT)**: Integration with instant funding system
6. **Transfer Analytics**: Dashboard showing transfer history and patterns

## Requirements Mapping

This implementation satisfies the following requirements:

- **4.1**: Support for ACH, wire, and sandbox transfer types
- **4.2**: Filtering transfers by direction, limit, and offset
- **4.3**: Cancellation of pending transfers only
- **4.4**: Wire transfer additional fields (additional_information, fee_payment_method)
- **4.5**: Sandbox instant deposits and withdrawals

## Related Documentation

- [ACH Relationships](./ACH_RELATIONSHIPS.md)
- [Bank Relationships](./BANK_RELATIONSHIPS.md)
- [Alpaca Broker API](./ALPACA_BROKER_API.md)
