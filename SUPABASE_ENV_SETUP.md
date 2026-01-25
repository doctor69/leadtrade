# Supabase Environment Variables Setup

## Required Environment Variables for Market Data

The `alpaca-market-quotes` edge function needs your Alpaca API keys to fetch market data.

### Steps to Add Environment Variables

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl/settings/functions

2. **Navigate to Edge Functions Settings**
   - Click on "Edge Functions" in the left sidebar
   - Click on "Settings" or "Secrets"

3. **Add These Environment Variables**

   ```
   PUBLIC_ALPACA_DATA_API_KEY=<your-alpaca-api-key>
   PUBLIC_ALPACA_DATA_API_SECRET=<your-alpaca-api-secret>
   ```

   **Where to find your Alpaca keys:**
   - Go to https://app.alpaca.markets/paper/dashboard/overview
   - Click on "API Keys" in the left menu
   - Copy your API Key ID and Secret Key

4. **Alternative: Use Existing Keys**

   If you already have these environment variables set:
   - `PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY`
   - `PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET`

   You can use those instead. Just update the function to use those variable names.

## Quick Fix Option

If you want to use your existing broker API keys, I can update the function to use:
- `PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY`
- `PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET`

These are likely already set in your Supabase project since other functions are working.

Let me know which approach you prefer!
