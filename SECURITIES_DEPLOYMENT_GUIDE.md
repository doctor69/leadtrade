# Securities Search Deployment Guide

## ✅ What's Already Implemented

### Database
- ✅ `securities_cache` table exists with proper schema
- ✅ Indexes and RLS policies configured
- ✅ `tradable_securities` view created

### Edge Functions
- ✅ `alpaca-securities` - Main securities data with caching
- ✅ `alpaca-assets-search` - Fast search functionality  
- ✅ `alpaca-security/{symbol}` - Individual security lookup
- ✅ `market-assets` - Backward compatibility redirect

### Frontend Integration
- ✅ `apiService.getAssets()` updated to use new endpoints
- ✅ `StockSearch.tsx` component ready to use the API
- ✅ Search vs. listing logic implemented

## 🚀 Deployment Steps

### 1. Start Docker Desktop
```bash
# Make sure Docker Desktop is running
docker --version
```

### 2. Deploy Edge Functions
```bash
cd supabase

# Deploy all securities-related functions
supabase functions deploy alpaca-securities --project-ref bfbqlzpbkivyrnjkvqgl
supabase functions deploy alpaca-assets-search --project-ref bfbqlzpbkivyrnjkvqgl  
supabase functions deploy alpaca-security --project-ref bfbqlzpbkivyrnjkvqgl
supabase functions deploy market-assets --project-ref bfbqlzpbkivyrnjkvqgl
```

### 3. Set Environment Variables in Supabase Dashboard

Go to: **Supabase Dashboard > Project Settings > Edge Functions > Environment Variables**

Add these variables:
```
PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL=https://broker-api.sandbox.alpaca.markets
PUBLIC_ALPACA_BROKER_LIVE_BASE_URL=https://broker-api.alpaca.markets
PUBLIC_ALPACA_DATA_SANDBOX_BASE_URL=https://data.sandbox.alpaca.markets
PUBLIC_ALPACA_DATA_LIVE_BASE_URL=https://data.alpaca.markets

PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY=CK7RW6V4AXVA1K0IX1X3
PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET=7OUtdbK617dHqRDiOAHYVg797fF7OCC2AVuZwKzQ
PUBLIC_ALPACA_DATA_API_KEY=CK7RW6V4AXVA1K0IX1X3
PUBLIC_ALPACA_DATA_API_SECRET=7OUtdbK617dHqRDiOAHYVg797fF7OCC2AVuZwKzQ
```

### 4. Test the Endpoints

```bash
# Test securities listing
curl "https://bfbqlzpbkivyrnjkvqgl.supabase.co/functions/v1/alpaca-securities?limit=5"

# Test search functionality  
curl "https://bfbqlzpbkivyrnjkvqgl.supabase.co/functions/v1/alpaca-assets-search?search=AAPL"

# Test individual security
curl "https://bfbqlzpbkivyrnjkvqgl.supabase.co/functions/v1/alpaca-security/AAPL"

# Test backward compatibility
curl "https://bfbqlzpbkivyrnjkvqgl.supabase.co/functions/v1/market-assets?search=TSLA"
```

## 🔧 Expected API Responses

### Search Response Format
```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "id": "b0b6dd9d-8b9b-48a9-ba46-b9d54906e415",
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "asset_class": "us_equity",
        "exchange": "NASDAQ",
        "tradable": true,
        "display_name": "AAPL - Apple Inc.",
        "trading_info": {
          "can_trade": true,
          "can_margin": true,
          "can_short": true,
          "fractional": true
        }
      }
    ],
    "total_count": 1,
    "search_term": "AAPL",
    "metadata": {
      "exact_matches": 1,
      "fuzzy_matches": 0,
      "timestamp": "2024-10-26T20:30:00.000Z"
    }
  }
}
```

## 🎯 Frontend Usage

Once deployed, the `StockSearch.tsx` component will automatically work:

```typescript
// This will now work in the frontend
const response = await apiService.getAssets({
  search: 'AAPL',
  asset_class: 'us_equity'
});

if (response.success) {
  console.log('Found assets:', response.data);
}
```

## 🐛 Troubleshooting

### If search returns empty results:
1. Check if securities data is cached in database
2. Force refresh: `?force_refresh=true`
3. Check Alpaca API credentials in environment variables

### If functions return 500 errors:
1. Check function logs in Supabase dashboard
2. Verify environment variables are set
3. Check Alpaca API key permissions

### If database errors occur:
1. Verify `securities_cache` table exists
2. Check RLS policies allow service role access
3. Run the verification SQL script

## 📊 Performance Notes

- **First request**: ~2-3 seconds (fetches from Alpaca API)
- **Cached requests**: ~100-200ms (from database)
- **Cache duration**: 24 hours
- **Search limit**: 500 results max, 50 default

## 🔄 Cache Management

The system automatically:
- Fetches fresh data every 24 hours
- Stores data in `securities_cache` table
- Provides fast search via database indexes
- Supports force refresh with `?force_refresh=true`

Once deployed, the trade search functionality will work seamlessly!