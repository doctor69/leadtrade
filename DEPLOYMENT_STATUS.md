# SSE Event Streaming - Deployment Status

## Current Status: ⏳ Awaiting Deployment

The SSE implementation is complete and ready, but the edge function needs to be deployed to Supabase.

## What You're Seeing

**Error**: `Preflight response is not successful. Status code: 503`

**Meaning**: The edge function `alpaca-events` is not deployed or not responding.

## Quick Fix

Run these commands to deploy:

```bash
# 1. Verify Supabase CLI is logged in
supabase status

# 2. Deploy the edge function
supabase functions deploy alpaca-events

# 3. Verify deployment
supabase functions list
```

## Expected Output After Deployment

When successfully deployed, you should see:

```
┌─────────────────┬──────────┬─────────────────────┐
│ NAME            │ STATUS   │ UPDATED AT          │
├─────────────────┼──────────┼─────────────────────┤
│ alpaca-events   │ DEPLOYED │ 2026-02-03 00:30:00 │
└─────────────────┴──────────┴─────────────────────┘
```

## Verify Deployment

After deploying, the errors should change from:
- ❌ `503 Service Unavailable` (function not deployed)
- ✅ `401 Unauthorized` (function deployed, needs auth - this is correct!)

The component will then connect successfully when you're logged in.

## Environment Variables Required

Make sure these are set in your Supabase project:

```bash
supabase secrets set PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY=your_key
supabase secrets set PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET=your_secret
supabase secrets set PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL=https://broker-api.sandbox.alpaca.markets
```

## Test Deployment

Run the test script:

```bash
chmod +x test-edge-function.sh
./test-edge-function.sh
```

Or manually test:

```bash
# Should return CORS headers (not 503)
curl -X OPTIONS \
  "https://YOUR_PROJECT.supabase.co/functions/v1/alpaca-events/trades" \
  -v
```

## Component Status

✅ **Client Implementation**: Complete
✅ **React Hooks**: Complete  
✅ **UI Component**: Complete and enabled
✅ **Edge Function Code**: Complete
⏳ **Edge Function Deployment**: Pending
⏳ **Environment Variables**: Pending

## Next Steps

1. Deploy the edge function (see commands above)
2. Set environment variables
3. Refresh the dashboard
4. Navigate to "Events" tab
5. You should see real-time events!

## Troubleshooting

If you still see errors after deployment:

1. **Check logs**: `supabase functions logs alpaca-events`
2. **Verify secrets**: `supabase secrets list`
3. **Test manually**: Use the test script above
4. **Check auth**: Make sure you're logged in to the app

## Documentation

- Full guide: `docs/SSE_EVENT_STREAMING.md`
- Deployment guide: `docs/SSE_DEPLOYMENT.md`
- Quick start: `docs/SSE_QUICK_START.md`
