# Enabling Options Trading - Complete Guide

## Current Situation
Your existing sandbox account **cannot** have options trading enabled after creation through the API. The `/v1/accounts/{account_id}/options_approval` endpoint returns "Not Found" because options must be enabled during account creation.

## Solution: Create New Account with Options

### For New Accounts (During Signup)
When creating a new account, include these fields:

```json
{
  "enabled_assets": [
    "us_equity",
    "crypto",
    "us_option"  // ← This enables options
  ],
  "identity": {
    // ... existing fields ...
    "annual_income_min": "50000",
    "annual_income_max": "100000",
    "total_net_worth_min": "50000",
    "total_net_worth_max": "100000",
    "liquid_net_worth_min": "25000",
    "liquid_net_worth_max": "50000",
    "liquidity_needs": "somewhat_important",
    "investment_experience_with_stocks": "over_5_years",
    "investment_experience_with_options": "over_5_years",
    "risk_tolerance": "moderate",
    "investment_objective": "growth",
    "investment_time_horizon": "5_to_10_years",
    "marital_status": "SINGLE",
    "number_of_dependents": 0
  },
  "agreements": [
    // ... existing agreements ...
    {
      "agreement": "options_agreement",
      "signed_at": "2024-01-26T18:00:00Z",
      "ip_address": "user_ip"
    }
  ]
}
```

### After Account Creation
Once the account is created with options enabled, you can request approval:

```
POST /v1/accounts/{account_id}/options_approval
{
  "level": 2
}
```

## Testing in Sandbox

For sandbox testing, you can use approval fixtures:

```json
{
  "level": 2,
  "approval_status": "APPROVED"  // Sandbox only - simulates instant approval
}
```

## For Your Current Account

Since your existing account wasn't created with options enabled, you have these options:

1. **Create a new test account** with options enabled (recommended for testing)
2. **Contact Alpaca support** to manually enable options on your existing account
3. **Use the account as-is** for stock trading only

## Implementation Status

✅ **Completed:**
- Options contracts API (fetching option chains)
- Options order placement code
- Options trading UI components
- Settings page for options management

❌ **Blocked:**
- Cannot enable options on existing accounts via API
- Requires account recreation or manual intervention

## Next Steps

1. Update the account creation flow to include options fields
2. Add checkbox during signup: "Enable Options Trading"
3. If checked, include all required fields and agreements
4. After account creation, automatically request options approval

## Code Changes Needed

### 1. Update AccountCreationForm.tsx
Add options trading checkbox and collect required fields

### 2. Update signup API
Include options fields when creating account if user opts in

### 3. Hide options UI for non-enabled accounts
The TradeForm should check if options are enabled before showing options selector

## Workaround for Testing

If you need to test options trading immediately:
1. Go to Alpaca dashboard
2. Create a new sandbox account manually with options enabled
3. Link that account to your LeadTrade profile
4. Test options trading with the new account
