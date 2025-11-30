# Funding Wallets (Multi-Currency) API

## Overview

The Funding Wallets API enables multi-currency account funding and withdrawals with support for international bank transfers via SWIFT and IBAN. This allows users to hold and transfer funds in multiple currencies, with automatic currency conversion for withdrawals.

## Features

- **Multi-Currency Support**: Create wallets for different currencies (USD, EUR, GBP, etc.)
- **Payment Instructions**: Get detailed wire transfer instructions for deposits
- **International Transfers**: Support for SWIFT and IBAN for global transfers
- **Recipient Bank Management**: Add and manage international recipient banks
- **Currency Conversion**: Automatic conversion when withdrawing to different currencies
- **Fee Transparency**: Clear fee structure for transfers and conversions

## Architecture

```
Frontend Library (src/lib/alpaca-funding-wallets.ts)
    ↓
Alpaca Broker API (/v1/accounts/{account_id}/funding_wallets)
```

The implementation calls the Alpaca Broker API directly from the frontend library using the trading configuration (paper or live mode). The Edge Function (`supabase/functions/alpaca-funding-wallets/`) is available for webhook handling and server-side operations.

## API Endpoints

### 1. Create Funding Wallet

Create a new funding wallet for a specific currency.

**Alpaca API**: `POST /v1/accounts/{account_id}/funding_wallets`

**Request Body**:
```typescript
{
  currency: string      // ISO 4217 currency code (e.g., "USD", "EUR", "GBP")
  nickname?: string     // Optional friendly name
}
```

**Response**:
```typescript
{
  id: string
  account_id: string
  currency: string
  balance: string
  available_balance: string
  pending_balance: string
  status: "active" | "inactive" | "pending"
  created_at: string
  updated_at: string
}
```

**Example**:
```typescript
import { createFundingWallet } from '@/lib/alpaca-funding-wallets'

const wallet = await createFundingWallet(
  'account-123',
  {
    currency: 'EUR',
    nickname: 'European Trading Account'
  },
  'paper' // or 'live'
)
```

### 2. Get Funding Wallet

Retrieve details of a specific funding wallet.

**Alpaca API**: `GET /v1/accounts/{account_id}/funding_wallets/{wallet_id}`

**Response**: Same as Create Funding Wallet

**Example**:
```typescript
import { getFundingWallet } from '@/lib/alpaca-funding-wallets'

const wallet = await getFundingWallet('account-123', 'wallet-456', 'paper')
console.log(`Balance: ${wallet.balance} ${wallet.currency}`)
```

### 3. List Funding Wallets

List all funding wallets for an account.

**Alpaca API**: `GET /v1/accounts/{account_id}/funding_wallets`

**Query Parameters**:
- `currency` (optional): Filter by currency code

**Response**: Array of funding wallets

**Example**:
```typescript
import { listFundingWallets } from '@/lib/alpaca-funding-wallets'

// Get all wallets
const allWallets = await listFundingWallets('account-123', undefined, 'paper')

// Get only EUR wallets
const eurWallets = await listFundingWallets('account-123', { currency: 'EUR' }, 'paper')
```

### 4. Get Payment Instructions

Get wire transfer instructions for depositing funds into a wallet.

**Alpaca API**: `GET /v1/accounts/{account_id}/funding_wallets/{wallet_id}/payment-instructions`

**Response**:
```typescript
{
  wallet_id: string
  currency: string
  priority: {
    type: "priority"
    bank_name: string
    bank_address?: string
    account_number?: string
    routing_number?: string
    swift_code?: string
    iban?: string
    reference: string              // IMPORTANT: Include in transfer
    additional_instructions?: string
  }
  regular: {
    type: "regular"
    // Same fields as priority
  }
}
```

**Example**:
```typescript
import { getPaymentInstructions } from '@/lib/alpaca-funding-wallets'

const instructions = await getPaymentInstructions('account-123', 'wallet-456', 'paper')

console.log('Priority Transfer Instructions:')
console.log(`Bank: ${instructions.priority.bank_name}`)
console.log(`SWIFT: ${instructions.priority.swift_code}`)
console.log(`IBAN: ${instructions.priority.iban}`)
console.log(`Reference: ${instructions.priority.reference}`) // Must include!
```

### 5. Create Withdrawal

Initiate a withdrawal from a funding wallet to a recipient bank.

**Alpaca API**: `POST /v1/accounts/{account_id}/funding_wallets/{wallet_id}/withdrawals`

**Request Body**:
```typescript
{
  recipient_bank_id: string    // ID of pre-registered recipient bank
  amount: string               // Amount to withdraw
  currency?: string            // Target currency (for conversion)
  note?: string               // Optional note
}
```

**Response**:
```typescript
{
  id: string
  wallet_id: string
  recipient_bank_id: string
  amount: string
  currency: string
  converted_amount?: string      // If currency conversion applied
  converted_currency?: string
  exchange_rate?: string
  fee: string
  status: "pending" | "processing" | "completed" | "failed" | "canceled"
  created_at: string
  completed_at?: string
}
```

**Example**:
```typescript
import { createWithdrawal } from '@/lib/alpaca-funding-wallets'

// Withdraw 1000 EUR to a recipient bank
const withdrawal = await createWithdrawal(
  'account-123',
  'wallet-456',
  {
    recipient_bank_id: 'bank-789',
    amount: '1000.00',
    note: 'Monthly withdrawal'
  },
  'paper'
)

// Withdraw with currency conversion (EUR to USD)
const convertedWithdrawal = await createWithdrawal(
  'account-123',
  'wallet-456',
  {
    recipient_bank_id: 'bank-789',
    amount: '1000.00',
    currency: 'USD',  // Convert EUR to USD
    note: 'Converted withdrawal'
  },
  'paper'
)

console.log(`Exchange rate: ${convertedWithdrawal.exchange_rate}`)
console.log(`Converted amount: ${convertedWithdrawal.converted_amount} ${convertedWithdrawal.converted_currency}`)
```

### 6. Add Recipient Bank

Register a recipient bank for withdrawals.

**Alpaca API**: `POST /v1/accounts/{account_id}/funding_wallets/{wallet_id}/recipient-banks`

**Request Body**:
```typescript
{
  bank_name: string
  bank_address?: string
  account_holder_name: string
  account_number?: string      // For domestic transfers
  routing_number?: string      // For US transfers
  swift_code?: string          // For international transfers
  iban?: string                // For European transfers
  country: string              // ISO 3166-1 alpha-2 (e.g., "US", "GB")
  currency: string             // ISO 4217 (e.g., "USD", "EUR")
}
```

**Response**:
```typescript
{
  id: string
  wallet_id: string
  bank_name: string
  bank_address?: string
  account_holder_name: string
  account_number?: string
  routing_number?: string
  swift_code?: string
  iban?: string
  country: string
  currency: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  updated_at: string
}
```

**Example**:
```typescript
import { createRecipientBank } from '@/lib/alpaca-funding-wallets'

// Add US bank (domestic)
const usBank = await createRecipientBank(
  'account-123',
  'wallet-456',
  {
    bank_name: 'Chase Bank',
    account_holder_name: 'John Doe',
    account_number: '1234567890',
    routing_number: '021000021',
    country: 'US',
    currency: 'USD'
  },
  'paper'
)

// Add European bank (international)
const euBank = await createRecipientBank(
  'account-123',
  'wallet-789',
  {
    bank_name: 'Deutsche Bank',
    bank_address: 'Frankfurt, Germany',
    account_holder_name: 'John Doe',
    swift_code: 'DEUTDEFF',
    iban: 'DE89370400440532013000',
    country: 'DE',
    currency: 'EUR'
  },
  'paper'
)
```

### 7. List Recipient Banks

List all recipient banks for a wallet.

**Alpaca API**: `GET /v1/accounts/{account_id}/funding_wallets/{wallet_id}/recipient-banks`

**Query Parameters**:
- `status` (optional): Filter by status ("pending", "approved", "rejected")

**Response**: Array of recipient banks

**Example**:
```typescript
import { listRecipientBanks } from '@/lib/alpaca-funding-wallets'

// Get all recipient banks
const allBanks = await listRecipientBanks('account-123', 'wallet-456', undefined, 'paper')

// Get only approved banks
const approvedBanks = await listRecipientBanks(
  'account-123',
  'wallet-456',
  { status: 'approved' },
  'paper'
)
```

### 8. Delete Recipient Bank

Remove a recipient bank.

**Alpaca API**: `DELETE /v1/accounts/{account_id}/funding_wallets/{wallet_id}/recipient-banks/{bank_id}`

**Response**: 204 No Content

**Example**:
```typescript
import { deleteRecipientBank } from '@/lib/alpaca-funding-wallets'

await deleteRecipientBank('account-123', 'wallet-456', 'bank-789', 'paper')
```

## Usage Examples

### Complete Multi-Currency Workflow

```typescript
import {
  createFundingWallet,
  getPaymentInstructions,
  createRecipientBank,
  createWithdrawal
} from '@/lib/alpaca-funding-wallets'

const tradingMode = 'paper' // or 'live'

// 1. Create EUR wallet
const eurWallet = await createFundingWallet(
  'account-123',
  {
    currency: 'EUR',
    nickname: 'European Trading'
  },
  tradingMode
)

// 2. Get deposit instructions
const instructions = await getPaymentInstructions('account-123', eurWallet.id, tradingMode)
console.log('Send wire transfer to:')
console.log(`Bank: ${instructions.priority.bank_name}`)
console.log(`SWIFT: ${instructions.priority.swift_code}`)
console.log(`IBAN: ${instructions.priority.iban}`)
console.log(`Reference: ${instructions.priority.reference}`)

// 3. Add recipient bank for withdrawals
const recipientBank = await createRecipientBank(
  'account-123',
  eurWallet.id,
  {
    bank_name: 'My European Bank',
    account_holder_name: 'John Doe',
    swift_code: 'DEUTDEFF',
    iban: 'DE89370400440532013000',
    country: 'DE',
    currency: 'EUR'
  },
  tradingMode
)

// 4. Wait for bank approval (status changes to "approved")
// ...

// 5. Create withdrawal
const withdrawal = await createWithdrawal(
  'account-123',
  eurWallet.id,
  {
    recipient_bank_id: recipientBank.id,
    amount: '5000.00',
    note: 'Profit withdrawal'
  },
  tradingMode
)

console.log(`Withdrawal ${withdrawal.id} initiated`)
console.log(`Status: ${withdrawal.status}`)
console.log(`Fee: ${withdrawal.fee} ${withdrawal.currency}`)
```

### Currency Conversion Example

```typescript
import { createWithdrawal } from '@/lib/alpaca-funding-wallets'

// Withdraw from EUR wallet but convert to USD
const withdrawal = await createWithdrawal(
  'account-123',
  'eur-wallet-id',
  {
    recipient_bank_id: 'usd-bank-id',
    amount: '1000.00',      // 1000 EUR
    currency: 'USD',        // Convert to USD
    note: 'Converted withdrawal'
  },
  'paper'
)

console.log(`Original: ${withdrawal.amount} ${withdrawal.currency}`)
console.log(`Converted: ${withdrawal.converted_amount} ${withdrawal.converted_currency}`)
console.log(`Exchange rate: ${withdrawal.exchange_rate}`)
console.log(`Fee: ${withdrawal.fee}`)
```

## Important Notes

### Payment Reference

When depositing funds via wire transfer, **always include the reference number** provided in the payment instructions. This ensures funds are credited to the correct wallet.

### Bank Approval Process

Recipient banks must be approved before they can be used for withdrawals. The approval process typically takes 1-2 business days. Check the `status` field:
- `pending`: Under review
- `approved`: Ready for withdrawals
- `rejected`: Not approved (contact support)

### Currency Conversion

When withdrawing to a different currency:
- Exchange rates are determined at the time of withdrawal
- Conversion fees may apply
- The `exchange_rate` field shows the rate used
- `converted_amount` shows the final amount in target currency

### SWIFT vs IBAN

- **SWIFT**: Used for international transfers worldwide
- **IBAN**: Used primarily in Europe and some other regions
- **Routing Number**: Used for domestic US transfers
- Some banks require both SWIFT and IBAN for European transfers

### Fees

Withdrawal fees vary based on:
- Transfer type (domestic vs international)
- Transfer speed (priority vs regular)
- Currency conversion (if applicable)

The `fee` field in the withdrawal response shows the total fee charged.

## Error Handling

```typescript
import { createWithdrawal } from '@/lib/alpaca-funding-wallets'

try {
  const withdrawal = await createWithdrawal('account-123', 'wallet-456', {
    recipient_bank_id: 'bank-789',
    amount: '1000.00'
  })
  console.log('Withdrawal created:', withdrawal.id)
} catch (error) {
  if (error.message.includes('insufficient funds')) {
    console.error('Not enough balance in wallet')
  } else if (error.message.includes('not approved')) {
    console.error('Recipient bank not yet approved')
  } else {
    console.error('Withdrawal failed:', error.message)
  }
}
```

## Common Error Codes

- `400`: Invalid request (missing fields, invalid currency code)
- `401`: Unauthorized (invalid or missing auth token)
- `403`: Forbidden (account doesn't belong to user)
- `404`: Wallet or bank not found
- `422`: Insufficient funds or recipient bank not approved
- `500`: Internal server error

## Testing

Use paper trading mode to test multi-currency functionality without real money:

```typescript
// Paper mode wallets behave like production but use test funds
const testWallet = await createFundingWallet(
  'sandbox-account',
  {
    currency: 'EUR'
  },
  'paper' // Use paper trading mode
)

// Test withdrawals complete instantly in paper mode
const testWithdrawal = await createWithdrawal(
  'sandbox-account',
  testWallet.id,
  {
    recipient_bank_id: 'test-bank',
    amount: '100.00'
  },
  'paper'
)
```

## Related Documentation

- [Transfer Operations](./TRANSFER_OPERATIONS.md) - ACH and wire transfers
- [Bank Relationships](./BANK_RELATIONSHIPS.md) - Domestic bank linking
- [Instant Funding](./INSTANT_FUNDING.md) - JIT funding system

## Support

For issues with funding wallets:
1. Check wallet and recipient bank status
2. Verify payment reference was included in wire transfers
3. Confirm recipient bank is approved
4. Review error messages for specific issues
5. Contact Alpaca support for transfer delays
