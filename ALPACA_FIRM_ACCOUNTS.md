# Alpaca Firm Accounts - Implementation Guide

## Overview

Firm accounts are accounts owned by **your business** (LeadTrade) for operational purposes. These are separate from user accounts and enable advanced funding strategies like instant funding.

## Types of Firm Accounts

### 1. Deposit Account (Required for Live)
**Purpose**: Deposit clearing account required for all clients going live

**Characteristics:**
- Required for production/live environment
- Amount based on number of accounts and trades
- Balance moves rarely
- Acts as a reserve/clearing account

**When needed**: Before going live with real money trading

---

### 2. Sweep Account (⭐ Key for Instant Funding)
**Purpose**: Main firm account for journaling funds between your firm and users

**Use Cases:**
- ✅ **Simulate instant funding** (what you need!)
- ✅ Provide intraday credit to users
- ✅ Flexible funding strategies
- ✅ Move money between firm and user accounts instantly

**How it works:**
```
Your Firm Sweep Account → Journal Transfer → User Account (Instant)
User Account → Journal Transfer → Your Firm Sweep Account (Instant)
```

**This is what you need for instant sandbox funding!**

---

### 3. Rewards Account (Optional)
**Purpose**: Trigger rewards for user growth and engagement

**Use Cases:**
- Sign-up bonuses
- Referral rewards
- Achievement-based rewards
- Supports both cash and stock rewards

**When needed**: When implementing gamification/rewards features

---

## What You Need for Instant Funding

### Current Situation
You're trying to add instant funds to user accounts in sandbox mode. The issue is that regular ACH transfers (even in sandbox) require bank relationships and may not clear instantly.

### Solution: Use Sweep Account + Journals API

Instead of using the Transfers API, you should use the **Journals API** to move funds from your firm's Sweep Account to user accounts.

## Implementation Strategy

### Step 1: Get Your Firm Sweep Account ID

In the Alpaca Broker Dashboard:
1. Go to "Firm Accounts" section
2. Find your **Sweep Account**
3. Copy the account ID (format: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`)

### Step 2: Update Instant Funding to Use Journals

Instead of creating a transfer, create a journal entry:

```typescript
// Current approach (doesn't work for instant funding)
POST /v1/accounts/{user_account_id}/transfers
{
  "transfer_type": "ach",
  "amount": "1000",
  "direction": "INCOMING"
}

// New approach (instant funding via journals)
POST /v1/journals
{
  "entry_type": "JNLC",  // Cash journal
  "from_account": "{firm_sweep_account_id}",  // Your firm's sweep account
  "to_account": "{user_account_id}",  // User's account
  "amount": "1000",
  "description": "Instant funding for sandbox testing"
}
```

### Step 3: Store Firm Account IDs

Add firm account IDs to your environment variables:

```env
# Firm Accounts (Sandbox)
PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX=your_sandbox_sweep_account_id
PUBLIC_ALPACA_FIRM_DEPOSIT_ACCOUNT_SANDBOX=your_sandbox_deposit_account_id
PUBLIC_ALPACA_FIRM_REWARDS_ACCOUNT_SANDBOX=your_sandbox_rewards_account_id

# Firm Accounts (Live - for production)
PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_LIVE=your_live_sweep_account_id
PUBLIC_ALPACA_FIRM_DEPOSIT_ACCOUNT_LIVE=your_live_deposit_account_id
PUBLIC_ALPACA_FIRM_REWARDS_ACCOUNT_LIVE=your_live_rewards_account_id
```

## Updated Implementation

### 1. Update Edge Function

The `alpaca-journals` edge function already exists. We just need to use it for instant funding:

```typescript
// In QuickSandboxFunding component
const response = await edgeFunctionClient.post('alpaca-journals', {
  entry_type: 'JNLC',  // Cash journal
  from_account: FIRM_SWEEP_ACCOUNT_ID,  // Your firm account
  to_account: accountId,  // User account
  amount: amount.toString(),
  description: `Instant sandbox funding: $${amount}`
});
```

### 2. Benefits of This Approach

✅ **Instant**: Journals execute immediately
✅ **No bank relationships needed**: Direct account-to-account transfer
✅ **Flexible**: Can move money in both directions
✅ **Sandbox & Live**: Works in both environments
✅ **Audit trail**: All journals are tracked and visible in dashboard

## How Journals Work

### Journal Types

1. **JNLC (Cash Journal)**
   - Transfer cash between accounts
   - What you need for instant funding

2. **JNLS (Securities Journal)**
   - Transfer stocks/securities between accounts
   - Useful for stock rewards or transfers

### Journal Flow

```
┌─────────────────────────────────────────────────────────┐
│ Your Firm Sweep Account                                 │
│ Balance: $100,000                                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Journal: JNLC
                 │ Amount: $1,000
                 │ Status: Executed (Instant)
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ User Account (test10@test.com)                          │
│ Balance: $0 → $1,000                                    │
└─────────────────────────────────────────────────────────┘
```

### Journal Limits

- Small amounts: Execute immediately
- Large amounts: May go to pending status for manual review
- Sandbox: Usually no limits
- Live: Limits configured with Alpaca

## Implementation Checklist

### For Sandbox (Current)
- [ ] Get firm sweep account ID from Alpaca dashboard
- [ ] Add to environment variables
- [ ] Update QuickSandboxFunding to use journals API
- [ ] Test instant funding with journals
- [ ] Verify funds appear immediately in user account

### For Live (Future)
- [ ] Request firm accounts from Alpaca during onboarding
- [ ] Fund your sweep account with initial capital
- [ ] Set up journal limits with Alpaca
- [ ] Configure live firm account IDs
- [ ] Implement balance monitoring for firm accounts
- [ ] Set up alerts for low firm account balances

## Code Changes Needed

### 1. Add Environment Variables

```env
# Add to .env
PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX=get_from_alpaca_dashboard
```

### 2. Update QuickSandboxFunding Component

```typescript
const addFunds = async (amount: number) => {
  const FIRM_SWEEP_ACCOUNT = import.meta.env.PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX;
  
  const response = await edgeFunctionClient.post('alpaca-journals', {
    entry_type: 'JNLC',
    from_account: FIRM_SWEEP_ACCOUNT,
    to_account: accountId,
    amount: amount.toString(),
    description: `Instant sandbox funding: $${amount}`
  });
};
```

### 3. No Edge Function Changes Needed

The `alpaca-journals` edge function already supports this! It's already deployed and ready to use.

## Monitoring Firm Accounts

### View Balances
- Alpaca Broker Dashboard → Firm Accounts
- Shows all firm account balances and activities

### Track Journals
- All journal entries are logged
- Visible in dashboard with full audit trail
- Can query via API: `GET /v1/journals`

### Alerts to Set Up
- Low sweep account balance
- High journal volume
- Failed journal entries
- Pending journals requiring approval

## Cost Considerations

### Sandbox
- Firm accounts are free
- Unlimited journals
- No real money involved

### Live
- Deposit account requires minimum balance
- Sweep account needs funding (your capital)
- Journal fees may apply (check with Alpaca)
- Consider float costs (money sitting in sweep account)

## Security Best Practices

1. **Limit Access**: Only authorized systems can create journals
2. **Validate Amounts**: Set maximum instant funding limits
3. **Monitor Activity**: Track all journal entries
4. **Rate Limiting**: Prevent abuse of instant funding
5. **Audit Trail**: Keep logs of all funding operations

## Next Steps

1. **Immediate**: Get your firm sweep account ID from Alpaca dashboard
2. **Update Code**: Modify QuickSandboxFunding to use journals
3. **Test**: Verify instant funding works
4. **Monitor**: Check firm account balance after journals
5. **Document**: Keep track of firm account IDs and purposes

## Questions to Ask Alpaca

When setting up firm accounts:

1. What's the minimum deposit account balance required?
2. What are the journal limits (amount and frequency)?
3. Are there fees for journal operations?
4. How do we fund the sweep account initially?
5. What happens if sweep account balance is insufficient?
6. Can we set up automatic alerts for low balances?

---

## Summary

**The key insight**: Use your firm's **Sweep Account** with the **Journals API** instead of the Transfers API for instant funding. This is the proper way to implement instant funding in both sandbox and live environments.

**Current blocker**: You need to get your firm sweep account ID from the Alpaca dashboard to implement this properly.
