# Funding API Integration Fix

## Issue Summary

The funding-related buttons (ACH, Bank, Funding Wallets) are not working because the client-side libraries are calling Alpaca API directly instead of using the Supabase Edge Functions. This causes authentication and CORS issues.

## Root Cause

Three client-side libraries are bypassing the edge functions:

1. **`src/lib/alpaca-ach-relationships.ts`** - Calls Alpaca Broker API directly
2. **`src/lib/alpaca-bank-relationships.ts`** - Uses wrong environment variable (`SUPABASE_URL` instead of `PUBLIC_SUPABASE_URL`)
3. **`src/lib/alpaca-funding-wallets.ts`** - Calls Alpaca Broker API directly

## Edge Functions (Already Implemented)

These edge functions are already properly implemented and working:

- ✅ `supabase/functions/alpaca-ach-relationships/index.ts`
- ✅ `supabase/functions/alpaca-bank-relationships/index.ts`
- ✅ `supabase/functions/alpaca-funding-wallets/index.ts`
- ✅ `supabase/functions/alpaca-instant-funding/index.ts`

## Fixes Applied

### 1. ACH Relationships (`src/lib/alpaca-ach-relationships.ts`)

**Changed:**
- ❌ Direct Alpaca API calls with broker credentials
- ✅ Edge function calls via `/functions/v1/alpaca-ach-relationships`

**Functions Fixed:**
- `createACHRelationship()` - Now calls edge function
- `listACHRelationships()` - Now calls edge function
- `deleteACHRelationship()` - Now calls edge function

### 2. Bank Relationships (`src/lib/alpaca-bank-relationships.ts`)

**Changed:**
- ❌ `import.meta.env.SUPABASE_URL` (undefined in browser)
- ✅ `import.meta.env.PUBLIC_SUPABASE_URL` (available in browser)

**Functions Fixed:**
- `createBankRelationship()` - Fixed environment variable
- `listBankRelationships()` - Fixed environment variable
- `deleteBankRelationship()` - Fixed environment variable

### 3. Funding Wallets (`src/lib/alpaca-funding-wallets.ts`)

**Status:** Needs to be updated to use edge functions

**Functions to Fix:**
- `createFundingWallet()` - Should call `/functions/v1/alpaca-funding-wallets/{accountId}`
- `getFundingWallet()` - Should call `/functions/v1/alpaca-funding-wallets/{accountId}/{walletId}`
- `listFundingWallets()` - Should call `/functions/v1/alpaca-funding-wallets/{accountId}`
- `getPaymentInstructions()` - Should call `/functions/v1/alpaca-funding-wallets/{accountId}/{walletId}/payment-instructions`
- `createWithdrawal()` - Should call `/functions/v1/alpaca-funding-wallets/{accountId}/{walletId}/withdrawals`
- `createRecipientBank()` - Should call `/functions/v1/alpaca-funding-wallets/{accountId}/{walletId}/recipient-banks`
- `listRecipientBanks()` - Should call `/functions/v1/alpaca-funding-wallets/{accountId}/{walletId}/recipient-banks`
- `deleteRecipientBank()` - Should call `/functions/v1/alpaca-funding-wallets/{accountId}/{walletId}/recipient-banks/{bankId}`

### 4. Instant Funding (`src/lib/alpaca-instant-funding.ts`)

**Status:** Already using edge functions correctly ✅

## Testing Checklist

After fixes are applied, test the following:

### ACH Relationships
- [ ] Click "Add ACH" button
- [ ] Fill in bank account details
- [ ] Submit form - should create ACH relationship
- [ ] View list of ACH relationships
- [ ] Delete an ACH relationship

### Bank Relationships
- [ ] Click "Add Bank" button
- [ ] Fill in bank details
- [ ] Submit form - should create bank relationship
- [ ] View list of bank relationships
- [ ] Delete a bank relationship

### Funding Wallets
- [ ] Click "Add Wallet" button
- [ ] Create a new wallet (e.g., USD)
- [ ] View wallet balance
- [ ] Click "Payment Instructions" - should show deposit details
- [ ] Add recipient bank
- [ ] Create withdrawal

### Instant Funding
- [ ] View instant funding limits
- [ ] Create instant funding request
- [ ] Generate funding reports

## Implementation Status

- ✅ ACH Relationships - Fixed
- ✅ Bank Relationships - Fixed
- ✅ Funding Wallets - Fixed
- ✅ Instant Funding - Already correct

## Changes Made

### File: `src/lib/alpaca-ach-relationships.ts`
- Removed direct Alpaca API calls
- Removed unused `getAlpacaConfig` import
- Updated `createACHRelationship()` to call edge function
- Updated `listACHRelationships()` to call edge function
- Updated `deleteACHRelationship()` to call edge function

### File: `src/lib/alpaca-bank-relationships.ts`
- Fixed environment variable from `SUPABASE_URL` to `PUBLIC_SUPABASE_URL` (3 occurrences)
- All functions now properly call edge functions

### File: `src/lib/alpaca-funding-wallets.ts`
- Replaced `makeAlpacaRequest()` with `makeEdgeFunctionRequest()`
- Removed `getAlpacaConfig` import
- Updated all 8 functions to use edge functions:
  - `createFundingWallet()`
  - `getFundingWallet()`
  - `listFundingWallets()`
  - `getPaymentInstructions()`
  - `createWithdrawal()`
  - `createRecipientBank()`
  - `listRecipientBanks()`
  - `deleteRecipientBank()`

## Next Steps

1. ✅ All code changes complete
2. Test all funding operations in the UI
3. Verify error handling and user feedback
4. Update tasks document with completion status
