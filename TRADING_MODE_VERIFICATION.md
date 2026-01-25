# Trading Mode Switching - Verification Guide

## ✅ What's Been Configured

### 1. Database Control
- `app_settings` table has `trading_mode` key
- Default value: `paper` (sandbox)
- You can update via Supabase Dashboard

### 2. Environment Variables (Updated)
```env
# SANDBOX MODE
PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY=CK7RW6V4AXVA1K0IX1X3
PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET=7OUtdbK617dHqRDiOAHYVg797fF7OCC2AVuZwKzQ
PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL=https://broker-api.sandbox.alpaca.markets
PUBLIC_ALPACA_DATA_SANDBOX_BASE_URL=https://data.sandbox.alpaca.markets
PUBLIC_ALPACA_TRADING_SANDBOX_BASE_URL=https://paper-api.alpaca.markets

# LIVE MODE (Empty until you go live)
PUBLIC_ALPACA_BROKER_LIVE_API_KEY=
PUBLIC_ALPACA_BROKER_LIVE_API_SECRET=
PUBLIC_ALPACA_BROKER_LIVE_BASE_URL=https://broker-api.alpaca.markets
PUBLIC_ALPACA_DATA_LIVE_BASE_URL=https://data.alpaca.markets
PUBLIC_ALPACA_TRADING_LIVE_BASE_URL=https://api.alpaca.markets
```

### 3. Backend Logic (Edge Functions)
- `_shared/auth.ts`: Reads `trading_mode` from `app_settings` table
- `_shared/alpaca-client.ts`: Switches URLs and API keys based on mode
- All edge functions inherit the mode through `AuthContext`

### 4. Frontend Components
- `TradingModeIndicator`: Shows current mode on Settings page
- `QuickSandboxFunding`: Only shows in sandbox mode
- `appSettings.ts`: Helper to read app settings

## 🔄 How the Switching Works

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Database (app_settings table)                            │
│    trading_mode = 'paper' or 'live'                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Edge Function (_shared/auth.ts)                          │
│    - Reads trading_mode from database                       │
│    - Creates AuthContext with tradingMode                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. AlpacaClient (_shared/alpaca-client.ts)                  │
│    - Receives AuthContext                                   │
│    - Selects API URLs based on tradingMode                  │
│    - Selects API keys based on tradingMode                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. API Calls                                                 │
│    Paper: broker-api.sandbox.alpaca.markets                 │
│    Live:  broker-api.alpaca.markets                         │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Testing the Switch

### Step 1: Verify Current Mode
```sql
-- Run in Supabase SQL Editor
SELECT setting_key, setting_value, updated_at 
FROM app_settings 
WHERE setting_key = 'trading_mode';
```

Expected: `setting_value = 'paper'`

### Step 2: Check UI Indicator
1. Go to your app's Settings page
2. Look at the top card "App Trading Mode"
3. Should show: 🟢 SANDBOX

### Step 3: Test API Call
1. Make any API call (e.g., view account balance)
2. Check browser console or edge function logs
3. Should see: `App-level trading mode: paper`
4. Should see: `tradingMode: 'paper'`

### Step 4: Verify Correct Endpoints
Check edge function logs for API requests:
```
Alpaca API Request {
  url: "https://broker-api.sandbox.alpaca.markets/v1/...",
  tradingMode: "paper",
  hasApiKey: true,
  hasApiSecret: true
}
```

## 🔄 How to Switch Modes

### Switch to Live Mode (⚠️ Real Money)
```sql
UPDATE app_settings 
SET setting_value = 'live', updated_at = NOW() 
WHERE setting_key = 'trading_mode';
```

### Switch Back to Sandbox
```sql
UPDATE app_settings 
SET setting_value = 'paper', updated_at = NOW() 
WHERE setting_key = 'trading_mode';
```

### After Switching
1. Refresh your app
2. Check the Trading Mode Indicator
3. Verify logs show the new mode
4. Test an API call to confirm correct endpoints

## ⚠️ Before Going Live

Make sure you have:

1. **Live API Keys**
   ```env
   PUBLIC_ALPACA_BROKER_LIVE_API_KEY=your_live_key
   PUBLIC_ALPACA_BROKER_LIVE_API_SECRET=your_live_secret
   ```

2. **Supabase Environment Variables**
   - Add live keys to Supabase Dashboard
   - Settings → Edge Functions → Environment Variables

3. **Redeploy Edge Functions**
   ```bash
   npx supabase functions deploy alpaca-account --no-verify-jwt
   npx supabase functions deploy alpaca-orders --no-verify-jwt
   npx supabase functions deploy alpaca-positions --no-verify-jwt
   # ... deploy all edge functions
   ```

4. **Business Requirements**
   - Signed agreement with Alpaca
   - Compliance documentation
   - Insurance and regulatory approvals
   - See ALPACA_GOING_LIVE_STATUS.md

## 🐛 Troubleshooting

### Issue: Mode not switching
**Solution**: 
- Verify database value is correct
- Refresh the page
- Check edge function logs

### Issue: Wrong API endpoints
**Solution**:
- Check environment variables are set
- Redeploy edge functions
- Verify logs show correct tradingMode

### Issue: API key errors
**Solution**:
- Verify keys are set for the current mode
- Check Supabase environment variables
- Ensure keys match the mode (sandbox vs live)

### Issue: Instant funding not working
**Solution**:
- Only works in sandbox mode
- Check QuickSandboxFunding component is visible
- Verify trading_mode = 'paper' in database

## 📊 Current Status

✅ **Sandbox Mode Active**
- All trades are simulated
- Using sandbox API keys
- Instant funding available
- Safe for testing

❌ **Live Mode Not Configured**
- Live API keys are empty
- Need business agreement with Alpaca
- Need to complete compliance requirements

## 📝 Summary

Your app is now configured to switch between sandbox and live modes by simply updating one database value. The entire system (edge functions, API clients, UI components) will automatically adapt to the selected mode.

**To switch**: Just update `app_settings.trading_mode` in your Supabase dashboard!
