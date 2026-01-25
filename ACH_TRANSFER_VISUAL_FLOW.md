# ACH Transfer Visual Flow Diagram

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 1: LINK BANK ACCOUNT                        │
│                         (One-time setup)                            │
└─────────────────────────────────────────────────────────────────────┘

User visits /funding page
         │
         ▼
┌────────────────────┐
│  BankLinking.tsx   │  User clicks "Add ACH Relationship"
└────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  User enters bank details:                                         │
│  • Routing Number: 123456789 (9 digits)                           │
│  • Account Number: 1234567890                                      │
│  • Account Type: Checking or Savings                               │
│  • Nickname: "My Checking" (optional)                              │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
createACHRelationship(accountId, bankData)
         │
         ▼
Edge Function: alpaca-ach-relationships
         │
         ▼
Alpaca API: POST /v1/accounts/{id}/ach_relationships
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  Alpaca verifies bank account                                      │
│  Status: queued → pending → approved                               │
│  Time: 1-2 business days (instant in sandbox)                      │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
✅ Bank account linked and approved!


┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 2: INITIATE TRANSFER                        │
│                    (Deposit or Withdrawal)                          │
└─────────────────────────────────────────────────────────────────────┘

User visits /funding page
         │
         ▼
┌────────────────────┐
│ ACHTransferForm    │  User fills out transfer form
└────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  User selects:                                                     │
│  • Direction: Deposit (INCOMING) or Withdraw (OUTGOING)           │
│  • Bank Account: "My Checking ••••1234"                           │
│  • Amount: $1,000.00                                               │
│  • Speed: Immediate or Next Day                                    │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
User clicks "Deposit Funds" or "Withdraw Funds"
         │
         ▼
createTransfer(accountId, transferData)
         │
         ▼
Edge Function: alpaca-transfers
         │
         ▼
Alpaca API: POST /v1/accounts/{id}/transfers
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  Transfer created!                                                 │
│  Status: queued                                                    │
│  ID: transfer_abc123                                               │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
✅ Transfer initiated!


┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 3: ACH PROCESSING                           │
│                    (Automatic, 1-3 days)                            │
└─────────────────────────────────────────────────────────────────────┘

Transfer Status: queued
         │
         ▼
Alpaca processes transfer
         │
         ▼
Transfer Status: pending
         │
         ▼
Sent to ACH network
         │
         ▼
Transfer Status: sent_to_clearing
         │
         ▼
Bank processes ACH transaction
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  For INCOMING (Deposit):                                           │
│  • Money pulled from user's bank account                           │
│  • Credited to Alpaca trading account                              │
│                                                                     │
│  For OUTGOING (Withdrawal):                                        │
│  • Money debited from Alpaca trading account                       │
│  • Pushed to user's bank account                                   │
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
Transfer Status: approved
         │
         ▼
✅ Money transferred successfully!


┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 4: VIEW HISTORY                             │
│                    (Optional)                                       │
└─────────────────────────────────────────────────────────────────────┘

User visits /funding page
         │
         ▼
┌────────────────────┐
│ TransferHistory    │  Shows all past transfers
└────────────────────┘
         │
         ▼
listTransfers(accountId)
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  Transfer History:                                                 │
│                                                                     │
│  ✅ $1,000.00 Deposit - Approved (Jan 20, 2025)                   │
│  ⏳ $500.00 Withdrawal - Pending (Jan 24, 2025)                   │
│  ❌ $250.00 Deposit - Rejected (Jan 15, 2025)                     │
└────────────────────────────────────────────────────────────────────┘
```

## Technical Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                              │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  BankLinking     │     │ ACHTransferForm  │     │ TransferHistory  │
│  Component       │     │  Component       │     │  Component       │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LIBRARY LAYER (src/lib/)                       │
├─────────────────────────────────────────────────────────────────────┤
│  alpaca-ach-relationships.ts  │  alpaca-transfers.ts               │
│  • createACHRelationship()    │  • createTransfer()                │
│  • listACHRelationships()     │  • listTransfers()                 │
│  • deleteACHRelationship()    │  • cancelTransfer()                │
└────────┬──────────────────────┴────────┬───────────────────────────┘
         │                               │
         │ HTTP POST with Auth Cookie    │
         │                               │
         ▼                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   EDGE FUNCTIONS LAYER (Supabase)                   │
├─────────────────────────────────────────────────────────────────────┤
│  alpaca-ach-relationships/    │  alpaca-transfers/                 │
│  • Validates input            │  • Validates input                 │
│  • Checks authentication      │  • Checks authentication           │
│  • Proxies to Alpaca API      │  • Proxies to Alpaca API           │
└────────┬──────────────────────┴────────┬───────────────────────────┘
         │                               │
         │ HTTP Basic Auth (API Keys)    │
         │                               │
         ▼                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ALPACA BROKER API                              │
├─────────────────────────────────────────────────────────────────────┤
│  POST /v1/accounts/{id}/ach_relationships                          │
│  GET  /v1/accounts/{id}/ach_relationships                          │
│  DELETE /v1/accounts/{id}/ach_relationships/{ach_id}               │
│                                                                     │
│  POST /v1/accounts/{id}/transfers                                  │
│  GET  /v1/accounts/{id}/transfers                                  │
│  DELETE /v1/accounts/{id}/transfers/{transfer_id}                  │
└────────┬───────────────────────────────────────────────────────────┘
         │
         │ ACH Network
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      USER'S BANK ACCOUNT                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow for Deposit (INCOMING)

```
┌─────────────┐
│ User's Bank │  $1,000 in checking account
└──────┬──────┘
       │
       │ User initiates deposit via LeadTrade
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LeadTrade creates transfer:                                        │
│  {                                                                  │
│    transfer_type: 'ach',                                            │
│    amount: '1000.00',                                               │
│    direction: 'INCOMING',                                           │
│    relationship_id: 'ach-rel-123'                                   │
│  }                                                                  │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       │ Alpaca initiates ACH pull
       │
       ▼
┌─────────────┐
│ ACH Network │  Processes transaction (1-3 days)
└──────┬──────┘
       │
       │ $1,000 debited from user's bank
       │
       ▼
┌─────────────┐
│ User's Bank │  $0 remaining (after debit)
└─────────────┘
       │
       │ $1,000 credited to Alpaca
       │
       ▼
┌──────────────────┐
│ Alpaca Account   │  $1,000 available for trading
└──────────────────┘
       │
       │ User can now trade
       │
       ▼
┌──────────────────┐
│ LeadTrade UI     │  Shows $1,000 buying power
└──────────────────┘
```

## Data Flow for Withdrawal (OUTGOING)

```
┌──────────────────┐
│ Alpaca Account   │  $1,000 available
└──────┬───────────┘
       │
       │ User initiates withdrawal via LeadTrade
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LeadTrade creates transfer:                                        │
│  {                                                                  │
│    transfer_type: 'ach',                                            │
│    amount: '500.00',                                                │
│    direction: 'OUTGOING',                                           │
│    relationship_id: 'ach-rel-123'                                   │
│  }                                                                  │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       │ $500 immediately debited from Alpaca account
       │
       ▼
┌──────────────────┐
│ Alpaca Account   │  $500 remaining
└──────────────────┘
       │
       │ Alpaca initiates ACH push
       │
       ▼
┌─────────────┐
│ ACH Network │  Processes transaction (1-3 days)
└──────┬──────┘
       │
       │ $500 credited to user's bank
       │
       ▼
┌─────────────┐
│ User's Bank │  $500 received
└─────────────┘
```

## Status Progression Timeline

```
Transfer Created
    │
    ▼
┌─────────────┐
│   queued    │  Transfer just created (0-5 minutes)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   pending   │  Being processed by Alpaca (5 min - 1 day)
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ sent_to_clearing │  Sent to ACH network (1-2 days)
└──────┬───────────┘
       │
       ▼
┌─────────────┐
│  approved   │  ✅ Completed successfully!
└─────────────┘

OR

┌─────────────┐
│  rejected   │  ❌ Failed (insufficient funds, invalid account, etc.)
└─────────────┘

OR

┌─────────────┐
│  canceled   │  🚫 User canceled (only possible in queued/pending)
└─────────────┘
```

## Error Handling Flow

```
User submits transfer
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Validation Checks:                                                 │
│  ✓ Amount > 0?                                                      │
│  ✓ ACH relationship exists?                                         │
│  ✓ ACH relationship approved?                                       │
│  ✓ Sufficient balance (for withdrawals)?                            │
│  ✓ Valid direction (INCOMING/OUTGOING)?                             │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       ├─ ❌ Validation fails
       │      │
       │      ▼
       │  Show error message to user
       │  "Please enter a valid amount"
       │  "No approved bank account found"
       │  "Insufficient funds for withdrawal"
       │
       └─ ✅ Validation passes
              │
              ▼
          Submit to Alpaca API
              │
              ├─ ❌ API error
              │      │
              │      ▼
              │  Show error message
              │  "Failed to create transfer"
              │  "Bank account not found"
              │
              └─ ✅ API success
                     │
                     ▼
                 Transfer created!
                 Show success message
```

## Security Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                             │
└─────────────────────────────────────────────────────────────────────┘

Layer 1: Browser
    │
    ├─ User must be logged in (Supabase Auth)
    ├─ Session cookie stored (HTTP-only)
    └─ No API keys in browser
    │
    ▼
Layer 2: Edge Function
    │
    ├─ Validates session cookie
    ├─ Checks user owns the account
    ├─ Re-validates all input data
    └─ Rate limiting applied
    │
    ▼
Layer 3: Alpaca API
    │
    ├─ HTTP Basic Auth with API keys
    ├─ API keys stored in environment variables
    ├─ Never exposed to client
    └─ Validates account ownership
    │
    ▼
Layer 4: Bank/ACH Network
    │
    ├─ Bank validates account ownership
    ├─ Checks sufficient funds
    └─ Processes transaction securely
```

## Summary

Your ACH transfer implementation handles:

✅ **Bank Account Linking** - Users can securely link their bank accounts  
✅ **Deposits (INCOMING)** - Money flows from bank → Alpaca  
✅ **Withdrawals (OUTGOING)** - Money flows from Alpaca → bank  
✅ **Status Tracking** - Users can monitor transfer progress  
✅ **Transfer History** - Complete audit trail of all transfers  
✅ **Cancellation** - Users can cancel pending transfers  
✅ **Error Handling** - Clear error messages for all failure cases  
✅ **Security** - Multi-layer security with no exposed credentials  

**The implementation is production-ready and follows Alpaca's best practices!**
