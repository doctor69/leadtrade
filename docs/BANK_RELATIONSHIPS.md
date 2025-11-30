# Bank Relationship Management

This document describes the implementation of bank relationship management for the Alpaca Broker API integration.

## Overview

Bank relationships allow users to link their external bank accounts to their Alpaca trading accounts for funding purposes. This implementation supports both US domestic banks (using ABA routing numbers) and international banks (using BIC/SWIFT codes).

## Requirements

- **Requirement 3.1**: Create bank relationships with validated bank codes
- **Requirement 3.3**: List bank relationships with filtering capabilities
- **Requirement 3.4**: Delete bank relationships

## Architecture

### Components

1. **Edge Function** (`supabase/functions/alpaca-bank-relationships/index.ts`)
   - Handles authentication and authorization
   - Proxies requests to Alpaca Broker API
   - Validates request data

2. **Frontend Library** (`src/lib/alpaca-bank-relationships.ts`)
   - Provides TypeScript functions for bank relationship operations
   - Calls edge function directly with credentials
   - Validates bank code types using Zod schemas

3. **Database Schema** (`supabase/migrations/20250109_bank_relationships.sql`)
   - Stores bank relationship metadata
   - Implements Row Level Security (RLS)
   - Tracks relationship status

## API Endpoints

### Create Bank Relationship

**POST** `/v1/accounts/{account_id}/recipient_banks`

Creates a new bank relationship for an account.

**Request Body:**
```typescript
{
  name: string;                    // Bank name
  bank_code: string;               // ABA routing number or BIC/SWIFT code
  bank_code_type: 'aba' | 'bic';  // Type of bank code
  account_number: string;          // Bank account number
  country?: string;                // Country code (optional)
  state_province?: string;         // State/province (optional)
  postal_code?: string;            // Postal code (optional)
  city?: string;                   // City (optional)
  street_address?: string;         // Street address (optional)
}
```

**Response:**
```typescript
{
  id: string;
  name: string;
  bank_code: string;
  bank_code_type: 'aba' | 'bic';
  account_number: string;
  status: string;
  created_at: string;
  // ... other fields
}
```

**Example:**
```typescript
import { createBankRelationship } from '@/lib/alpaca-bank-relationships';

const result = await createBankRelationship('account-123', {
  name: 'Chase Bank',
  bank_code: '021000021',
  bank_code_type: 'aba',
  account_number: '1234567890',
  country: 'USA',
  city: 'New York',
  state_province: 'NY',
});

if (result.success) {
  console.log('Bank relationship created:', result.bank);
} else {
  console.error('Error:', result.error);
}
```

### List Bank Relationships

**GET** `/v1/accounts/{account_id}/recipient_banks`

Lists all bank relationships for an account with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by relationship status
- `bank_name` (optional): Filter by bank name

**Response:**
```typescript
[
  {
    id: string;
    name: string;
    bank_code: string;
    bank_code_type: 'aba' | 'bic';
    account_number: string;
    status: string;
    created_at: string;
    // ... other fields
  }
]
```

**Example:**
```typescript
import { listBankRelationships } from '@/lib/alpaca-bank-relationships';

// List all bank relationships
const result = await listBankRelationships('account-123');

// List only approved relationships
const approvedResult = await listBankRelationships(
  'account-123',
  { status: 'approved' }
);

// Filter by bank name
const chaseResult = await listBankRelationships(
  'account-123',
  { bank_name: 'Chase' }
);
```

### Delete Bank Relationship

**DELETE** `/v1/accounts/{account_id}/recipient_banks/{bank_id}`

Removes a bank relationship from an account.

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Example:**
```typescript
import { deleteBankRelationship } from '@/lib/alpaca-bank-relationships';

const result = await deleteBankRelationship(
  'account-123',
  'bank-123'
);

if (result.success) {
  console.log('Bank relationship deleted');
} else {
  console.error('Error:', result.error);
}
```

## Bank Code Types

### ABA (Routing Number)
- Used for US domestic banks
- 9-digit number
- Example: `021000021` (Chase Bank)

### BIC/SWIFT
- Used for international banks
- 8 or 11 character code
- Example: `CHASUS33` (Chase Bank SWIFT code)

## Database Schema

The `bank_relationships` table stores metadata about bank relationships:

```sql
CREATE TABLE bank_relationships (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  alpaca_bank_id TEXT UNIQUE NOT NULL,
  account_id UUID REFERENCES user_profiles(id),
  name TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  bank_code_type TEXT CHECK (bank_code_type IN ('aba', 'bic')),
  account_number_last4 TEXT,
  country TEXT,
  state_province TEXT,
  postal_code TEXT,
  city TEXT,
  street_address TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security (RLS)

Users can only access their own bank relationships:
- View: `auth.uid() = user_id`
- Insert: `auth.uid() = user_id`
- Update: `auth.uid() = user_id`
- Delete: `auth.uid() = user_id`

## Error Handling

### Validation Errors

**Invalid bank_code_type:**
```json
{
  "success": false,
  "error": "bank_code_type must be either \"aba\" or \"bic\""
}
```

**Missing required fields:**
```json
{
  "success": false,
  "error": "name, bank_code, bank_code_type, and account_number are required"
}
```

### API Errors

**Bank not found:**
```json
{
  "success": false,
  "error": "Bank relationship not found"
}
```

**Unauthorized:**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

## Testing

Run the test suite:

```bash
npm run test -- src/lib/__tests__/alpaca-bank-relationships.test.ts --run
```

The test suite covers:
- Creating bank relationships with valid data
- Validating bank code types (aba/bic)
- Listing bank relationships with and without filters
- Deleting bank relationships
- Error handling for API failures
- Network error handling

## Security Considerations

1. **Authentication**: All requests require valid Supabase authentication
2. **Authorization**: Users can only access their own bank relationships
3. **Data Protection**: Account numbers are masked (last 4 digits only)
4. **Encryption**: Bank codes and account numbers should be encrypted at rest
5. **Audit Trail**: All operations are logged with timestamps

## Future Enhancements

1. **Bank Verification**: Implement micro-deposit verification
2. **Plaid Integration**: Support Plaid for instant bank verification
3. **International Support**: Expand support for more international bank codes
4. **Webhooks**: Receive notifications when bank relationships are approved/rejected
5. **Batch Operations**: Support creating multiple bank relationships at once

## Related Documentation

- [Alpaca Broker API Documentation](https://alpaca.markets/docs/broker/)
- [Account Management](./ALPACA_BROKER_API.md)
- [ACH Relationships](./ACH_RELATIONSHIPS.md) (to be implemented)
- [Transfer Operations](./TRANSFERS.md) (to be implemented)
