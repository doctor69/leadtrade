# SSE Event Streaming - Deployment Guide

## Prerequisites

1. Supabase CLI installed
2. Supabase project linked
3. Alpaca API credentials configured

## Deployment Steps

### 1. Deploy the Edge Function

```bash
# Deploy the alpaca-events edge function
supabase functions deploy alpaca-events

# Verify deployment
supabase functions list
```

### 2. Set Environment Variables

The edge function requires these environment variables to be set in your Supabase project:

```bash
# Paper trading (sandbox) credentials
supabase secrets set PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY=your_sandbox_key
supabase secrets set PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET=your_sandbox_secret
supabase secrets set PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL=https://broker-api.sandbox.alpaca.markets

# Live trading credentials (optional)
supabase secrets set PUBLIC_ALPACA_BROKER_LIVE_API_KEY=your_live_key
supabase secrets set PUBLIC_ALPACA_BROKER_LIVE_API_SECRET=your_live_secret
supabase secrets set PUBLIC_ALPACA_BROKER_LIVE_BASE_URL=https://broker-api.alpaca.markets
```

### 3. Test the Deployment

```bash
# Test the edge function
curl -X GET "https://YOUR_PROJECT.supabase.co/functions/v1/alpaca-events/trades" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Accept: text/event-stream"
```

### 4. Enable in the UI

Once deployed, enable the EventStreamFeed component:

```tsx
<EventStreamFeed 
  accountId="your-alpaca-account-id"
  enabled={true}  // Set to true after deployment
/>
```

## Troubleshooting

### 503 Error on CORS Preflight

**Symptom**: `Preflight response is not successful. Status code: 503`

**Cause**: Edge function not deployed or not responding

**Solution**:
1. Verify deployment: `supabase functions list`
2. Check logs: `supabase functions logs alpaca-events`
3. Redeploy: `supabase functions deploy alpaca-events`

### 401 Unauthorized

**Symptom**: `Unauthorized` error in response

**Cause**: Missing or invalid Supabase auth token

**Solution**:
1. Verify user is logged in
2. Check Supabase session is valid
3. Ensure Authorization header is being sent

### Connection Timeout

**Symptom**: Connection attempts timeout after several retries

**Cause**: Alpaca API credentials not configured or invalid

**Solution**:
1. Verify environment variables are set
2. Check Alpaca API credentials are valid
3. Ensure correct base URL for paper/live mode

### No Events Received

**Symptom**: Connection successful but no events appear

**Cause**: No activity on the account or incorrect account ID

**Solution**:
1. Verify account ID is correct
2. Check account has trading activity
3. Try with pagination parameters (since/until)

## Monitoring

### View Edge Function Logs

```bash
# Real-time logs
supabase functions logs alpaca-events --follow

# Recent logs
supabase functions logs alpaca-events --limit 100
```

### Check Function Status

```bash
# List all functions and their status
supabase functions list

# Get function details
supabase functions inspect alpaca-events
```

## Performance Considerations

1. **Connection Limits**: Each user creates a persistent SSE connection. Monitor concurrent connections.

2. **Bandwidth**: SSE streams can consume bandwidth. Consider:
   - Using pagination (since/until) to limit historical events
   - Implementing client-side event filtering
   - Clearing old events periodically

3. **Reconnection**: The client implements exponential backoff (1s → 30s) to avoid overwhelming the server.

## Security

1. **Authentication**: All requests require valid Supabase auth token
2. **Authorization**: Users can only access their own account events
3. **Rate Limiting**: Consider implementing rate limiting for production

## Cost Optimization

1. **Disable When Not Needed**: Set `enabled={false}` when component is not visible
2. **Use Pagination**: Limit historical events with `since` and `until` parameters
3. **Clear Events**: Call `clearEvents()` periodically to free memory

## Production Checklist

- [ ] Edge function deployed
- [ ] Environment variables configured
- [ ] CORS headers verified
- [ ] Authentication tested
- [ ] Error handling tested
- [ ] Reconnection logic tested
- [ ] Monitoring/logging configured
- [ ] Performance tested under load
- [ ] Security review completed

## Next Steps

After deployment:
1. Test with paper trading account
2. Monitor logs for errors
3. Test reconnection behavior
4. Verify event data format
5. Enable in production with live accounts

## Support

For issues:
1. Check edge function logs
2. Verify Alpaca API status
3. Review Supabase project settings
4. Consult documentation: `docs/SSE_EVENT_STREAMING.md`
