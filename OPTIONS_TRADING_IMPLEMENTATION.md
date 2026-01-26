# Options Trading Implementation Guide

## Current Status
- ✅ Options contracts API working (fetching option chains)
- ✅ Options order placement code ready
- ❌ Account not enabled for options trading (403 error)

## What's Needed

### 1. For Existing Accounts (Your Current Situation)
To enable options on an existing account, you need to:

1. **PATCH the account** with additional required fields:
   - `investment_experience_with_options`
   - `annual_income_min/max`
   - `total_net_worth_min/max`
   - `liquid_net_worth_min/max`
   - `liquidity_needs`
   - `risk_tolerance`
   - `investment_objective`
   - `investment_time_horizon`

2. **Sign options agreement**:
   ```json
   {
     "agreement": "options_agreement",
     "signed_at": "2024-01-26T18:00:00Z",
     "ip_address": "user_ip"
   }
   ```

3. **Request options approval**:
   ```
   POST /v1/accounts/{account_id}/options_approval
   {
     "level": 2,
     "approval_status": "APPROVED"  // Sandbox only
   }
   ```

### 2. For New Accounts (During Signup)
Include in account creation:
```json
{
  "enabled_assets": ["us_equity", "crypto", "us_option"],
  "identity": {
    // ... existing fields ...
    "investment_experience_with_options": "over_5_years",
    "annual_income_min": "10000",
    "annual_income_max": "50000",
    // ... other required fields
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

## Options Approval Levels

| Level | Allowed Trades | Requirements |
|-------|---------------|--------------|
| 0 | None (disabled) | N/A |
| 1 | Covered calls, Cash-secured puts | Must own underlying shares or have sufficient buying power |
| 2 | Level 1 + Buy calls/puts | Must have sufficient options buying power |

## Implementation Plan

### Phase 1: Enable Options for Existing Account (Immediate)
1. Create UI component to collect missing information
2. PATCH account with required fields
3. Submit options agreement
4. Request options approval (level 2)

### Phase 2: Update Signup Flow
1. Add options trading checkbox during signup
2. Collect additional required fields if enabled
3. Include options agreement in signup
4. Auto-request options approval after account creation

### Phase 3: Settings Page
1. Add options trading toggle
2. Allow users to upgrade/downgrade approval level
3. Show current options approval status

## API Endpoints Needed

### Already Implemented
- ✅ `GET /v1/options/contracts` - List option contracts
- ✅ `POST /v1/trading/accounts/{account_id}/orders` - Place options orders

### Need to Implement
- ⚠️ `PATCH /v1/accounts/{account_id}` - Update account with options fields
- ⚠️ `POST /v1/accounts/{account_id}/agreements` - Sign options agreement
- ✅ `POST /v1/accounts/{account_id}/options_approval` - Request approval (exists but needs proper call)

## Sandbox Testing
For sandbox, you can use fixtures:
```json
{
  "level": 2,
  "approval_status": "APPROVED"  // or "REJECTED", "LOWER_LEVEL_APPROVED"
}
```

## Next Steps
1. Create a quick "Enable Options Trading" UI component
2. Collect missing account information
3. Submit PATCH request with all required fields
4. Sign options agreement
5. Request options approval with sandbox fixture
