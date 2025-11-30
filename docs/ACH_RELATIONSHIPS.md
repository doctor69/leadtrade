# ACH Relationship Management

This document describes the ACH (Automated Clearing House) relationship management implementation for LeadTrade, enabling users to link bank accounts for funding their trading accounts.

## Overview

The ACH relationship management system allows users to:
- Link bank accounts using manual entry (routing number and account number)
- Link bank accounts using Plaid processor tokens
- List all linked bank accounts with filtering
- Remove bank accounts (with pending transfer validation)

## Architecture

### Components

1. **Shared Alpaca Client** (`supabase/functions/_shared/alpaca-client.ts`)
   - `createACHRelationship()` - Creates ACH relationships
   - `listACHRelationships()` - Lists ACH relationships with filtering
   - `deleteACHRelationship()` - Removes ACH relationships

2. **Edge Function** (`supabase/functions/alpaca-ach-relationships/index.ts`)
   - Secure serverless proxy to Alpaca Broker API
   - Handles authentication and authorization via Supabase Auth
   - Validates request data
   - Supports POST, GET, and DELETE methods
   - Deployed as Supabase Edge Function

3. **Frontend Library** (`src/lib/alpaca-ach-relationships.ts`)
   - Client-side API wrapper for calling Edge Function
   - Type-safe interfaces
   - Input validation
   - Error handling

## API Reference

### Create ACH Relationship

Creates a new ACH relationship for funding transfers.

**Edge Function:** `POST /functions/v1/alpaca-ach-relationships/{account_id}`  
**Alpaca API:** `POST /v1/accounts/{account_id}/ach_relationships`

**Request Body (Manual Entry):**
```typescript
{
  account_owner_name: string;      // Required
  bank_account_type: 'checking' | 'savings';  // Required
  bank_account_number: string;     // Required for manual entry
  bank_routing_number: string;     // Required for manual entry (9 digits)
  nickname?: string;               // Optional
}
```

**Request Body (Plaid Integration):**
```typescript
{
  account_owner_name: string;      // Required
  bank_account_type: 'checking' | 'savings';  // Required
  processor_token: string;         // Plaid processor token
  nickname?: string;               // Optional
}
```

**Response:**
```typescript
{
  id: string;
  account_id: string;
  status: 'queued' | 'approved' | 'pending' | 'sent_to_clearing' | 'rejected' | 'canceled';
  account_owner_name: string;
  bank_account_type: 'checking' | 'savings';
  bank_account_number: string;     // Masked (e.g., "****1234")
  bank_routing_number: string;
  nickname?: string;
  processor_token?: string;
  created_at: string;
  updated_at?: string;
}
```

**Example (Manual Entry):**
```typescript
import { createACHRelationship } from '@/lib/alpaca-ach-relationships';

const result = await createACHRelationship('acc_123', {
  account_owner_name: 'John Doe',
  bank_account_type: 'checking',
  bank_account_number: '1234567890',
  bank_routing_number: '123456789',
  nickname: 'My Checking Account'
}, 'paper');

if (result.success) {
  console.log('ACH relationship created:', result.ach);
} else {
  console.error('Error:', result.error);
}
```

**Example (Plaid Integration):**
```typescript
const result = await createACHRelationship('acc_123', {
  account_owner_name: 'Jane Smith',
  bank_account_type: 'savings',
  processor_token: 'processor-sandbox-token-123'
}, 'paper');
```

### List ACH Relationships

Retrieves all ACH relationships for an account with optional filtering.

**Edge Function:** `GET /functions/v1/alpaca-ach-relationships/{account_id}`  
**Alpaca API:** `GET /v1/accounts/{account_id}/ach_relationships`

**Query Parameters:**
- `status` (optional): Filter by status (queued, approved, pending, etc.)

**Response:**
```typescript
Array<{
  id: string;
  account_id: string;
  status: string;
  account_owner_name: string;
  bank_account_type: 'checking' | 'savings';
  bank_account_number: string;
  bank_routing_number: string;
  nickname?: string;
  created_at: string;
}>
```

**Example:**
```typescript
import { listACHRelationships } from '@/lib/alpaca-ach-relationships';

// List all ACH relationships
const result = await listACHRelationships('acc_123', undefined, 'paper');

// Filter by status
const approvedOnly = await listACHRelationships(
  'acc_123',
  { status: 'approved' },
  'paper'
);

if (result.success) {
  console.log('ACH relationships:', result.relationships);
}
```

### Delete ACH Relationship

Removes an ACH relationship. The API validates that no pending transfers exist.

**Edge Function:** `DELETE /functions/v1/alpaca-ach-relationships/{account_id}/{ach_relationship_id}`  
**Alpaca API:** `DELETE /v1/accounts/{account_id}/ach_relationships/{ach_relationship_id}`

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Example:**
```typescript
import { deleteACHRelationship } from '@/lib/alpaca-ach-relationships';

const result = await deleteACHRelationship('acc_123', 'ach_123', 'paper');

if (result.success) {
  console.log('ACH relationship deleted');
} else {
  console.error('Error:', result.error);
  // Error may indicate pending transfers exist
}
```

## Validation Rules

### Manual Entry
1. **account_owner_name**: Required, non-empty string
2. **bank_account_type**: Must be either "checking" or "savings"
3. **bank_account_number**: Required for manual entry
4. **bank_routing_number**: Required for manual entry, must be exactly 9 digits

### Plaid Integration
1. **account_owner_name**: Required, non-empty string
2. **bank_account_type**: Must be either "checking" or "savings"
3. **processor_token**: Required Plaid processor token

### Deletion
- Cannot delete ACH relationship with pending transfers
- Alpaca API will return an error if pending transfers exist

## Status Flow

ACH relationships progress through the following statuses:

1. **queued**: Initial state after creation
2. **pending**: Verification in progress
3. **sent_to_clearing**: Sent to bank for verification
4. **approved**: Verified and ready for use
5. **rejected**: Verification failed
6. **canceled**: Manually canceled

## Security Considerations

1. **Account Numbers**: Masked in responses (e.g., "****1234")
2. **Routing Numbers**: Validated for format (9 digits)
3. **Authentication**: All requests require valid Alpaca API credentials
4. **Authorization**: Users can only access their own ACH relationships
5. **Pending Transfer Validation**: Prevents deletion of relationships with active transfers

## Error Handling

Common error scenarios:

1. **Invalid Routing Number**
   ```typescript
   {
     success: false,
     error: 'bank_routing_number must be exactly 9 digits'
   }
   ```

2. **Missing Required Fields**
   ```typescript
   {
     success: false,
     error: 'For manual entry: bank_account_number and bank_routing_number are required'
   }
   ```

3. **Pending Transfers**
   ```typescript
   {
     success: false,
     error: 'Cannot delete ACH relationship with pending transfers...'
   }
   ```

4. **Invalid Account Type**
   ```typescript
   {
     success: false,
     error: 'bank_account_type must be either "checking" or "savings"'
   }
   ```

## Testing

Comprehensive test suite available at `src/lib/__tests__/alpaca-ach-relationships.test.ts`

**Test Coverage:**
- Manual entry ACH relationship creation
- Plaid processor token integration
- Input validation (account type, routing number, required fields)
- Listing with and without filters
- Deletion with pending transfer validation
- Error handling

**Run Tests:**
```bash
npm run test -- src/lib/__tests__/alpaca-ach-relationships.test.ts --run
```

## Integration with Plaid

For Plaid integration:

1. Use Plaid Link to authenticate user's bank account
2. Exchange public token for processor token
3. Pass processor token to `createACHRelationship()`
4. Alpaca will handle verification automatically

**Example Plaid Flow:**
```typescript
// 1. Initialize Plaid Link
const plaidHandler = Plaid.create({
  token: linkToken,
  onSuccess: async (publicToken, metadata) => {
    // 2. Exchange for processor token
    const processorToken = await exchangePublicToken(publicToken);
    
    // 3. Create ACH relationship
    const result = await createACHRelationship('acc_123', {
      account_owner_name: metadata.account.name,
      bank_account_type: metadata.account.subtype,
      processor_token: processorToken
    }, 'paper');
  }
});
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **3.2**: ACH relationship creation with manual entry and Plaid processor token support
- **3.4**: Deletion with pending transfer validation
- **3.5**: Comprehensive error handling and validation

## Future Enhancements

Potential improvements:

1. Micro-deposit verification flow
2. Real-time status updates via webhooks
3. Bank account verification status tracking
4. Support for instant verification methods
5. Enhanced Plaid integration with account selection UI

## Related Documentation

- [Bank Relationships](./BANK_RELATIONSHIPS.md)
- [Transfer Operations](./TRANSFERS.md) (coming soon)
- [Alpaca Broker API Documentation](https://alpaca.markets/docs/broker/)
