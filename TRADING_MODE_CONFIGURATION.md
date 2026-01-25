# Trading Mode Configuration

## Overview

LeadTrade uses an **app-level trading mode** setting that controls whether the entire application operates in **sandbox** (paper trading) or **live** (real money) mode. This is controlled via the database and affects all users and all API calls.

## Current Architecture

### Database Control
The trading mode is stored in the `app_settings` table:

```sql
SELECT * FROM app_settings WHERE setting_key = 'trading_mode';
```

**Possible values:**
- `paper` - Sandbox/paper trading mode (default)
- `live` - Live trading with real money

### How It Works

1. **Edge Functions**: All Supabase Edge Functions read the trading mode from `app_settings` table
2. **AlpacaClient**: Automatically selects the correct API endpoints based on trading mode:
   - **Sandbox**: `broker-api.sandbox.alpaca.markets`, `paper-api.alpaca.markets`
   - **Live**: `broker-api.alpaca.markets`, `api.alpaca.markets`
3. **Client-Side**: Components can check the mode using `getAppTradingMode()` helper

## Switching Between Modes

### Method 1: Direct Database Update (Recommended)

```sql
-- Switch to LIVE mode (⚠️ USE WITH CAUTION)
UPDATE app_settings 
SET setting_value = 'live' 
WHERE setting_key = 'trading_mode';

-- Switch to SANDBOX mode (safe for testing)
UPDATE app_settings 
SET setting_value = 'paper' 
WHERE setting_key = 'trading_mode';
```

### Method 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** → `app_settings`
3. Find the row where `setting_key = 'trading_mode'`
4. Edit `setting_value` to either `paper` or `live`
5. Save changes

### Method 3: Using SQL Editor

1. Go to **SQL Editor** in Supabase dashboard
2. Run the appropriate UPDATE query above
3. Execute the query

## Verification

### Check Current Mode in UI
Visit the **Settings** page in your app - the trading mode indicator will show:
- 🟢 **SANDBOX** - Safe for testing
- 🔴 **LIVE** - Real money trading

### Check Current Mode in Database
```sql
SELECT setting_value FROM app_settings WHERE setting_key = 'trading_mode';
```

### Check in Edge Function Logs
Edge functions log the trading mode on each request:
```
App-level trading mode: paper
```

## Impact of Trading Mode

### Sandbox Mode (`paper`)
- ✅ All trades are simulated
- ✅ No real money involved
- ✅ Instant funding via Transfer API
- ✅ Perfect for development and testing
- ✅ Account approval is automated
- ✅ Market data is real but trades are simulated

### Live Mode (`live`)
- ⚠️ All trades execute with real money
- ⚠️ Real ACH transfers (3-5 business days)
- ⚠️ Requires proper business agreements with Alpaca
- ⚠️ Account approval may involve manual review
- ⚠️ All regulatory requirements apply
- ⚠️ Real market execution and fees

## Components Affected

### Automatically Adapts to Mode
These components/functions automatically use the correct mode:

1. **All Edge Functions** (`supabase/functions/*`)
   - Read mode from `app_settings` table
   - Use appropriate Alpaca API endpoints

2. **AlpacaClient** (`_shared/alpaca-client.ts`)
   - Selects correct base URLs
   - Handles authentication for the right environment

3. **QuickSandboxFunding** (`src/components/account/QuickSandboxFunding.tsx`)
   - Only shows in sandbox mode
   - Provides instant funding buttons

4. **TradingModeIndicator** (`src/components/admin/TradingModeIndicator.tsx`)
   - Shows current mode with visual indicator
   - Provides SQL commands to switch modes

## API Endpoints by Mode

### Sandbox Endpoints
```
Broker API:  https://broker-api.sandbox.alpaca.markets
Trading API: https://paper-api.alpaca.markets
Data API:    https://data.sandbox.alpaca.markets
```

### Live Endpoints
```
Broker API:  https://broker-api.alpaca.markets
Trading API: https://api.alpaca.markets
Data API:    https://data.alpaca.markets
```

## Environment Variables

Make sure you have the correct API keys configured:

### Sandbox Keys (Current)
```env
PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY=your_sandbox_key
PUBLIC_ALPACA_BROKER_SANDBOX_SECRET_KEY=your_sandbox_secret
```

### Live Keys (For Production)
```env
PUBLIC_ALPACA_BROKER_LIVE_API_KEY=your_live_key
PUBLIC_ALPACA_BROKER_LIVE_SECRET_KEY=your_live_secret
```

## Safety Checklist Before Going Live

Before switching to live mode, ensure:

- [ ] Business agreement with Alpaca is signed
- [ ] Live API keys are configured
- [ ] All testing is complete in sandbox
- [ ] Compliance and legal requirements are met
- [ ] Customer support infrastructure is ready
- [ ] Monitoring and alerting systems are in place
- [ ] Backup and disaster recovery plans are tested
- [ ] Team is trained on live operations
- [ ] Insurance and regulatory approvals are obtained

## Helper Functions

### Client-Side (TypeScript)

```typescript
import { getAppTradingMode } from '@/lib/appSettings';

// Get current trading mode
const mode = await getAppTradingMode(); // Returns 'paper' | 'live'

// Check if in sandbox
const isSandbox = mode === 'paper';

// Check if in live mode
const isLive = mode === 'live';
```

### Edge Functions (Deno)

```typescript
// Trading mode is automatically available in AuthContext
export async function handler(authContext: AuthContext) {
  const mode = authContext.tradingMode; // 'paper' | 'live'
  
  // AlpacaClient automatically uses the correct endpoints
  const client = new AlpacaClient(authContext);
}
```

## Troubleshooting

### Mode Not Updating
1. Check database value: `SELECT * FROM app_settings WHERE setting_key = 'trading_mode'`
2. Refresh the page to reload the setting
3. Check edge function logs for the mode being used
4. Verify RLS policies allow reading from `app_settings`

### Wrong API Endpoints
1. Verify environment variables are set correctly
2. Check that edge functions are deployed with latest code
3. Confirm `authContext.tradingMode` is correct in logs

### Instant Funding Not Working
- Instant funding only works in **sandbox mode**
- In live mode, use proper ACH relationships and transfers
- Check that `QuickSandboxFunding` component is hidden in live mode

## Best Practices

1. **Always test in sandbox first** before switching to live
2. **Document the switch** when changing modes
3. **Notify your team** before switching to live mode
4. **Monitor closely** after switching modes
5. **Have a rollback plan** ready
6. **Keep sandbox and live API keys separate**
7. **Use different databases** for sandbox and live if possible

## Related Documentation

- [Alpaca Going Live Status](./ALPACA_GOING_LIVE_STATUS.md)
- [Alpaca Integration Setup](https://docs.alpaca.markets/docs/integration-setup-with-alpaca)
- [Sandbox vs Live Differences](https://docs.alpaca.markets/docs/integration-setup-with-alpaca#sandbox)

---

**Current Status**: Your app is in **SANDBOX** mode by default. This is the safe setting for development and testing.
