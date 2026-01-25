# QuickSandboxFunding: Journals API Migration Summary

## Overview

**Version**: v1.7.42  
**Date**: January 2026  
**Status**: ✅ Complete

Successfully migrated the `QuickSandboxFunding` component from using the Transfers API to the Journals API, implementing the proper architectural pattern for instant sandbox funding via firm sweep accounts.

---

## What Changed

### Component Modified
- **File**: `src/components/account/QuickSandboxFunding.tsx`
- **Change Type**: API Integration Refactor
- **Impact**: Improved architecture, better alignment with Alpaca's model

### API Endpoint Change

**Before (v1.7.41):**
```typescript
// Used Transfer API with immediate timing
const response = await edgeFunctionClient.post(`alpaca-transfers/${accountId}`, {
  transfer_type: 'ach',
  amount: amount.toString(),
  direction: 'INCOMING',
  timing: 'immediate'
});
```

**After (v1.7.42):**
```typescript
// Uses Journals API with firm sweep account
const response = await edgeFunctionClient.post('alpaca-journals', {
  entry_type: 'JNLC',  // Cash journal
  from_account: FIRM_SWEEP_ACCOUNT,  // Your firm's sweep account
  to_account: accountId,  // User's account
  amount: amount.toString(),
  description: `Instant sandbox funding: ${amount}`
});
```

---

## Why This Change?

### Problems with Transfer API Approach
1. **Not the intended use case**: Transfers API is for ACH/wire transfers, not instant funding
2. **Bank relationships**: Required bank relationship setup even in sandbox
3. **Timing workarounds**: Needed `timing: 'immediate'` parameter as a workaround
4. **Architecture mismatch**: Didn't align with Alpaca's firm account model
5. **Scalability concerns**: Pattern wouldn't scale well to live environment

### Benefits of Journals API Approach
1. **Proper architecture**: Journals API is designed for firm-to-user fund movements
2. **No bank relationships**: Direct account-to-account transfers
3. **Instant by design**: Journal entries execute immediately (no timing parameter needed)
4. **Production-ready**: Same pattern works in both sandbox and live
5. **Clear audit trail**: All journal entries tracked in Alpaca dashboard
6. **Firm account model**: Aligns with Alpaca's recommended architecture

---

## Technical Implementation

### Firm Sweep Account Configuration

**Environment Variable Required:**
```env
PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX=your_firm_sweep_account_id
```

**Configuration Validation:**
```typescript
const FIRM_SWEEP_ACCOUNT = import.meta.env.PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX || 'FIRM_ACCOUNT_NEEDED';

if (FIRM_SWEEP_ACCOUNT === 'FIRM_ACCOUNT_NEEDED') {
  setError('Firm sweep account not configured. Please see instructions below.');
  return;
}
```

### Journal Entry Structure

**Entry Type**: `JNLC` (Cash Journal)
- `JNLC`: Cash journal for moving money
- `JNLS`: Securities journal for moving stocks (future use)

**Request Payload:**
```typescript
{
  entry_type: 'JNLC',
  from_account: 'firm-sweep-account-uuid',  // Source: Your firm
  to_account: 'user-account-uuid',  // Destination: User
  amount: '1000',  // Amount in dollars
  description: 'Instant sandbox funding: 1000'  // Audit trail
}
```

**Response:**
```typescript
{
  id: 'journal-entry-uuid',
  entry_type: 'JNLC',
  status: 'executed',  // Immediate in sandbox
  from_account: 'firm-sweep-account-uuid',
  to_account: 'user-account-uuid',
  amount: '1000',
  description: 'Instant sandbox funding: 1000',
  created_at: '2026-01-25T...',
  settled_at: '2026-01-25T...'
}
```

### Error Handling

**Simplified Error Logic:**
```typescript
// Removed relationship-specific error detection
// Generic error messages for all failure types
if (response.success) {
  console.log('✅ Funds added successfully:', response.data);
  setSuccess(true);
  setTimeout(() => onFundingComplete?.(), 1500);
} else {
  console.error('❌ Failed to add funds:', response.error);
  const errorMsg = response.error?.message || 'Failed to add funds';
  setError(errorMsg);
}
```

---

## Setup Instructions

### Step 1: Get Firm Sweep Account ID

1. Log into [Alpaca Broker Dashboard](https://broker-app.sandbox.alpaca.markets/)
2. Navigate to **Firm Accounts** section
3. Find your **Sweep Account**
4. Copy the account ID (UUID format: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`)

### Step 2: Configure Environment Variable

**Local Development (`.env`):**
```env
# Add to your .env file
PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX=your_firm_sweep_account_id
```

**Supabase Edge Functions:**
1. Go to Supabase Dashboard
2. Navigate to **Settings** → **Edge Functions** → **Environment Variables**
3. Add variable: `PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX`
4. Set value to your firm sweep account ID
5. Save changes

### Step 3: Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Restart with new environment variables
npm run dev
```

### Step 4: Test Instant Funding

1. Navigate to the Funding page in your app
2. Look for the "Instant Sandbox Funding" card
3. Click any amount button (e.g., $1,000)
4. Should see success message and funds available immediately
5. Check Alpaca dashboard for journal entry

---

## Verification Checklist

- [ ] **Environment Variable Set**: `PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX` configured
- [ ] **Development Server Restarted**: New environment variables loaded
- [ ] **Component Visible**: QuickSandboxFunding card appears on Funding page
- [ ] **Configuration Check**: No "Firm sweep account not configured" error
- [ ] **Funding Test**: Click amount button and funds added successfully
- [ ] **Success Message**: Green success confirmation appears
- [ ] **Balance Updated**: Account balance reflects new funds
- [ ] **Journal Entry**: Entry visible in Alpaca dashboard under Journals
- [ ] **Console Logs**: No errors in browser console
- [ ] **Edge Function Logs**: No errors in Supabase logs

---

## Architecture Comparison

### Transfer API Pattern (Old)
```
User Account
    ↓
  [ACH Transfer Request]
    ↓
  Bank Relationship Required
    ↓
  timing: 'immediate' (workaround)
    ↓
  Simulated ACH Transfer
    ↓
  Funds Available
```

**Issues:**
- Required bank relationship setup
- Not the intended use case
- Timing parameter as workaround
- Complex error handling

### Journals API Pattern (New)
```
Firm Sweep Account
    ↓
  [Journal Entry: JNLC]
    ↓
  Direct Account Transfer
    ↓
  Instant Execution
    ↓
  User Account Funded
```

**Benefits:**
- No bank relationships needed
- Proper use case for journals
- Instant by design
- Clean architecture

---

## Production Considerations

### Sandbox vs Live

**Sandbox (Current):**
- Firm sweep account is free
- Unlimited journal entries
- Instant execution
- No real money involved

**Live (Future):**
- Firm sweep account requires funding (your capital)
- Journal limits may apply
- Large amounts may require manual approval
- Real money movements

### Firm Account Management

**Balance Monitoring:**
- Track firm sweep account balance
- Set up alerts for low balance
- Plan for replenishment strategy
- Monitor journal volume

**Limits and Approvals:**
- Small amounts: Auto-approved
- Large amounts: May require manual review
- Configure limits with Alpaca
- Set up approval workflows

### Environment Variables

**Sandbox:**
```env
PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX=sandbox_firm_account_id
```

**Live:**
```env
PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_LIVE=live_firm_account_id
```

**Trading Mode Detection:**
The component already respects trading mode via `getAppTradingMode()`, so it will automatically use the correct firm account when you add live support.

---

## Future Enhancements

### 1. Live Environment Support
```typescript
// Automatic firm account selection based on trading mode
const tradingMode = await getAppTradingMode();
const FIRM_SWEEP_ACCOUNT = tradingMode === 'live'
  ? import.meta.env.PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_LIVE
  : import.meta.env.PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX;
```

### 2. Firm Account Balance Display
```typescript
// Show firm account balance to admins
const firmBalance = await getFirmAccountBalance(FIRM_SWEEP_ACCOUNT);
// Display warning if balance is low
```

### 3. Journal History
```typescript
// Show recent journal entries for audit trail
const journals = await listJournals({ from_account: FIRM_SWEEP_ACCOUNT });
// Display in admin dashboard
```

### 4. Instant Funding Limits
```typescript
// Enforce per-user instant funding limits
const userLimit = await getUserInstantFundingLimit(userId);
if (amount > userLimit) {
  setError(`Instant funding limit is ${userLimit}. Please use ACH transfer for larger amounts.`);
  return;
}
```

---

## Troubleshooting

### Error: "Firm sweep account not configured"

**Cause**: Environment variable not set or not loaded

**Solution:**
1. Check `.env` file has `PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX`
2. Restart development server
3. Verify variable is loaded: `console.log(import.meta.env.PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX)`

### Error: "Failed to add funds"

**Cause**: API error from Alpaca

**Solution:**
1. Check Edge Function logs in Supabase
2. Verify firm account ID is correct
3. Check firm account has sufficient balance (live mode)
4. Verify API keys are correct for current trading mode

### Journal Entry Not Appearing

**Cause**: Journal may be pending or failed

**Solution:**
1. Check Alpaca dashboard under Journals section
2. Look for journal entry with matching amount and timestamp
3. Check journal status (executed, pending, rejected)
4. Review journal description for identification

### Funds Not Available Immediately

**Cause**: Journal execution delay (rare in sandbox)

**Solution:**
1. Refresh the page
2. Check journal status in Alpaca dashboard
3. Wait a few seconds and try again
4. Contact Alpaca support if issue persists

---

## Related Documentation

- **Firm Accounts Guide**: `ALPACA_FIRM_ACCOUNTS.md` - Comprehensive guide to firm accounts
- **Journals API**: [Alpaca Documentation](https://docs.alpaca.markets/docs/journals)
- **Trading Mode**: `TRADING_MODE_CONFIGURATION.md` - App-level trading mode setup
- **README Update**: `README_UPDATE_V1.7.42.md` - Full documentation of this change

---

## Summary

The migration from Transfer API to Journals API represents a significant architectural improvement:

✅ **Proper Use Case**: Journals API is designed for firm-to-user transfers  
✅ **Instant Execution**: No timing workarounds needed  
✅ **No Bank Relationships**: Direct account-to-account transfers  
✅ **Production-Ready**: Scalable pattern for both sandbox and live  
✅ **Clear Audit Trail**: All movements tracked via journal entries  
✅ **Better Architecture**: Aligns with Alpaca's firm account model  

**Next Steps:**
1. Get firm sweep account ID from Alpaca dashboard
2. Configure environment variable
3. Test instant funding
4. Verify journal entries
5. Plan for live environment setup

**Key Takeaway**: This change positions the instant funding feature on a solid architectural foundation that will scale seamlessly from sandbox to production.
