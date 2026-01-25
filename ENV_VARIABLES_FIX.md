# Environment Variables Fix for Trading Mode Switching

## Issue Found

The AlpacaClient is looking for environment variables with different names than what's in your `.env` files.

## What AlpacaClient Expects

### For Sandbox/Paper Mode (`trading_mode = 'paper'`)
```typescript
PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY
PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET
PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL
PUBLIC_ALPACA_DATA_SANDBOX_BASE_URL
PUBLIC_ALPACA_TRADING_SANDBOX_BASE_URL
```

### For Live Mode (`trading_mode = 'live'`)
```typescript
PUBLIC_ALPACA_BROKER_LIVE_API_KEY
PUBLIC_ALPACA_BROKER_LIVE_API_SECRET
PUBLIC_ALPACA_BROKER_LIVE_BASE_URL
PUBLIC_ALPACA_DATA_LIVE_BASE_URL
PUBLIC_ALPACA_TRADING_LIVE_BASE_URL
```

## What You Currently Have

Your `.env` file has:
```env
PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY=CK7RW6V4AXVA1K0IX1X3
PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET=7OUtdbK617dHqRDiOAHYVg797fF7OCC2AVuZwKzQ
PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL=https://broker-api.sandbox.alpaca.markets

PUBLIC_ALPACA_BROKER_LIVE_API_KEY=
PUBLIC_ALPACA_BROKER_LIVE_API_SECRET=
PUBLIC_ALPACA_BROKER_LIVE_BASE_URL=https://broker-api.alpaca.markets
```

## What's Missing

You need to add these to your `.env` file:

```env
# Sandbox/Paper Trading URLs
PUBLIC_ALPACA_DATA_SANDBOX_BASE_URL=https://data.sandbox.alpaca.markets
PUBLIC_ALPACA_TRADING_SANDBOX_BASE_URL=https://paper-api.alpaca.markets

# Live Trading URLs (when you go live)
PUBLIC_ALPACA_DATA_LIVE_BASE_URL=https://data.alpaca.markets
PUBLIC_ALPACA_TRADING_LIVE_BASE_URL=https://api.alpaca.markets
```

## Complete .env Template

Here's what your `.env` file should look like:

```env
# Supabase Configuration
PUBLIC_SUPABASE_URL=https://bfbqlzpbkivyrnjkvqgl.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ============================================
# SANDBOX/PAPER TRADING (Current)
# ============================================
PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY=CK7RW6V4AXVA1K0IX1X3
PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET=7OUtdbK617dHqRDiOAHYVg797fF7OCC2AVuZwKzQ
PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL=https://broker-api.sandbox.alpaca.markets
PUBLIC_ALPACA_DATA_SANDBOX_BASE_URL=https://data.sandbox.alpaca.markets
PUBLIC_ALPACA_TRADING_SANDBOX_BASE_URL=https://paper-api.alpaca.markets

# ============================================
# LIVE TRADING (For Production)
# ============================================
PUBLIC_ALPACA_BROKER_LIVE_API_KEY=
PUBLIC_ALPACA_BROKER_LIVE_API_SECRET=
PUBLIC_ALPACA_BROKER_LIVE_BASE_URL=https://broker-api.alpaca.markets
PUBLIC_ALPACA_DATA_LIVE_BASE_URL=https://data.alpaca.markets
PUBLIC_ALPACA_TRADING_LIVE_BASE_URL=https://api.alpaca.markets
```

## How the Switching Works

1. **Database Setting**: `app_settings.trading_mode` = `'paper'` or `'live'`

2. **Auth Context**: Edge functions read the mode from database
   ```typescript
   authContext.tradingMode // 'paper' or 'live'
   ```

3. **AlpacaClient**: Selects URLs and keys based on mode
   ```typescript
   if (authContext.tradingMode === 'paper') {
     // Use PUBLIC_ALPACA_BROKER_SANDBOX_* variables
   } else {
     // Use PUBLIC_ALPACA_BROKER_LIVE_* variables
   }
   ```

## Verification Checklist

- [ ] Add missing URL environment variables to `.env`
- [ ] Verify sandbox keys are correct
- [ ] Keep live keys empty until ready to go live
- [ ] Restart your dev server after updating `.env`
- [ ] Deploy edge functions with updated environment variables
- [ ] Test that sandbox mode works correctly
- [ ] Verify trading mode indicator shows correct mode

## Deployment Note

When deploying edge functions, Supabase reads environment variables from:
1. Your Supabase project's environment variables (Dashboard → Settings → Edge Functions)
2. Local `.env` file (for local development)

Make sure to add these variables in both places!

## Testing the Switch

1. **Check current mode in database:**
   ```sql
   SELECT setting_value FROM app_settings WHERE setting_key = 'trading_mode';
   ```

2. **Check in UI:**
   - Go to Settings page
   - Look at Trading Mode Indicator
   - Should show 🟢 SANDBOX

3. **Check in logs:**
   - Edge function logs should show: `App-level trading mode: paper`
   - AlpacaClient logs should show: `tradingMode: 'paper'`

4. **Test API calls:**
   - Make a test API call (e.g., get account)
   - Check logs to see which URL was used
   - Should be `broker-api.sandbox.alpaca.markets`
