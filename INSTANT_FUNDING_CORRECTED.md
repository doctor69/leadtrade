# Instant Funding Implementation - Architecture Correction

## Issue Identified

Initial implementation incorrectly created Astro API routes (`src/pages/api/alpaca/instant-funding/*`). These were unnecessary because:

1. **Astro API routes are ONLY for SSE streaming** (Server-Sent Events)
2. **Regular REST APIs** should call Supabase Edge Functions directly
3. This follows the established LeadTrade architecture pattern

## Corrected Architecture

```
Frontend Library (src/lib/alpaca-instant-funding.ts)
    ↓ (direct HTTP call with credentials: 'include')
Supabase Edge Function (supabase/functions/alpaca-instant-funding/index.ts)
    ↓ (authenticated API call)
Alpaca Broker API
```

## Files Removed

- ❌ `src/pages/api/alpaca/instant-funding/index.ts`
- ❌ `src/pages/api/alpaca/instant-funding/reports.ts`
- ❌ `src/pages/api/alpaca/instant-funding/settlements.ts`
- ❌ `src/pages/api/alpaca/instant-funding/[fundingId].ts`

These were unnecessary proxy layers that don't follow the project architecture.

## Files Updated

### 1. `src/lib/alpaca-instant-funding.ts`
**Changes:**
- Added Zod validation schemas for all types
- Removed `tradingMode` parameter (handled server-side)
- Changed to call Edge Functions directly via `import.meta.env.PUBLIC_SUPABASE_URL`
- Added `credentials: 'include'` for session-based auth
- Added response validation with Zod schemas

**Before:**
```typescript
export async function createInstantFunding(
  fundingData: CreateInstantFundingRequest,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<...> {
  const config = getAlpacaConfig(tradingMode);
  const response = await fetch(`${config.brokerBaseUrl}/v1/instant_funding`, {
    headers: {
      'APCA-API-KEY-ID': config.brokerApiKey,
      'APCA-API-SECRET-KEY': config.brokerApiSecret,
    },
    ...
  });
}
```

**After:**
```typescript
export async function createInstantFunding(
  fundingData: CreateInstantFundingRequest
): Promise<...> {
  const validation = CreateInstantFundingSchema.safeParse(fundingData);
  if (!validation.success) {
    return { success: false, error: '...' };
  }

  const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-instant-funding`;
  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fundingData),
    credentials: 'include'
  });

  const fundingValidation = InstantFundingSchema.safeParse(result);
  ...
}
```

### 2. `supabase/functions/alpaca-instant-funding/index.ts`
**Changes:**
- Updated path matching to use `alpaca-instant-funding` prefix
- Added check to skip sub-routes when matching funding ID

**Before:**
```typescript
if (pathParts.length === 3 && pathParts[1] === 'instant_funding') {
  const fundingId = pathParts[2]
  ...
}
```

**After:**
```typescript
if (pathParts.length === 3 && pathParts[1] === 'alpaca-instant-funding') {
  const fundingId = pathParts[2]
  
  // Skip if it's a known sub-route
  if (fundingId === 'limits' || fundingId === 'reports' || fundingId === 'settlements') {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  }
  ...
}
```

### 3. `docs/INSTANT_FUNDING.md`
**Changes:**
- Updated all endpoint references from `/api/alpaca/instant-funding` to `/functions/v1/alpaca-instant-funding`
- Added architecture section explaining the direct Edge Function calls
- Updated code examples to remove `tradingMode` parameter
- Clarified that trading mode is handled server-side

## Validation

✅ All tests passing (9/9)
✅ No TypeScript errors
✅ Follows established project patterns
✅ Matches architecture of other features (transfers, journals, etc.)

## Why This Matters

1. **Consistency**: All features now follow the same architecture pattern
2. **Performance**: Removes unnecessary proxy layer, reducing latency
3. **Simplicity**: Fewer files to maintain, clearer data flow
4. **Security**: Authentication handled consistently via Edge Functions

## Reference Implementation

For comparison, see these correctly implemented features:
- `src/lib/alpaca-transfers.ts` - Calls Edge Function directly
- `src/lib/alpaca-journals.ts` - Calls Edge Function directly
- `src/pages/api/alpaca/events/[eventType].ts` - SSE proxy (correct use of Astro API)

## Summary

The instant funding implementation is now architecturally correct:
- ✅ Frontend library with Zod validation
- ✅ Direct Edge Function calls with session auth
- ✅ No unnecessary Astro API proxy layer
- ✅ Consistent with other features
- ✅ All tests passing
