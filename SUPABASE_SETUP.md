# Supabase Environment Variables Setup

Your Edge Functions are deployed but need environment variables to work properly. Here's how to add them:

## 🔧 Add Environment Variables to Supabase

1. **Go to your Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl
   - Navigate to **Settings** → **Edge Functions**

2. **Add the following environment variables**:

### Required Variables (from your .env file):

```bash
# Alpaca Broker API (Sandbox)
PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY=CK7RW6V4AXVA1K0IX1X3
PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET=7OUtdbK617dHqRDiOAHYVg797fF7OCC2AVuZwKzQ
PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL=https://broker-api.sandbox.alpaca.markets/v1

# Alpaca Data API (Sandbox)
PUBLIC_ALPACA_DATA_API_KEY=CK7RW6V4AXVA1K0IX1X3
PUBLIC_ALPACA_DATA_API_SECRET=7OUtdbK617dHqRDiOAHYVg797fF7OCC2AVuZwKzQ
PUBLIC_ALPACA_DATA_BASE_URL=https://data.sandbox.alpaca.markets

# App Configuration
PUBLIC_APP_URL=https://leadtrade.app
NODE_ENV=production
```

**Note**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically by Supabase and cannot be manually added.

## 📋 Step-by-Step Instructions:

1. **Open Supabase Dashboard**
2. **Go to Settings → Edge Functions**
3. **Click "Add Variable" for each of the variables above**
4. **Copy the exact variable name and value**
5. **Save each variable**

## 🧪 Test After Setup:

Once you've added the environment variables, test the functions:

```bash
# Test environment validation
npm run validate:env

# Check function status
npm run check:functions

# Test signup flow
npm run test:signup
```

## 🔍 Current Function Status:

- ✅ **Working (10/18)**: Basic functions that don't need Alpaca API
- ⚠️ **Need Config (8/18)**: Functions that need environment variables:
  - `signup` - Main signup function
  - `create-alpaca-account` - Alpaca account creation
  - `auth` - Authentication functions
  - `cancel-order`, `get-order`, `modify-order` - Trading functions
  - `market-websocket` - Real-time data
  - `rollback-user` - User management

## 🚨 Important Notes:

1. **Use the exact variable names** as shown above
2. **Don't include quotes** around the values in Supabase dashboard
3. **Save each variable individually**
4. **Functions will restart automatically** after adding variables

## 🎯 Expected Result:

After adding the environment variables, all functions should return:
- ✅ **200/401 status** (working, just need proper authentication)
- ❌ **No more 503 errors** (boot failures)

## 🔗 Quick Links:

- **Supabase Dashboard**: https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl
- **Edge Functions Settings**: https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl/settings/functions
- **Function Logs**: https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl/logs/edge-functions