# README Update Summary - v1.7.71

## Overview

Fixed the `alpaca-portfolio-history` Edge Function to use the correct Alpaca Broker API endpoint for retrieving portfolio history data, resolving API call failures and ensuring proper data retrieval.

## Changes Made

### 1. Version Update
- ✅ Updated version from v1.7.70 to v1.7.71

### 2. Recent Updates Section
- ✅ Added comprehensive documentation for Portfolio History: Broker API Endpoint Fix (v1.7.71)
- ✅ Documented correct API endpoint usage
- ✅ Explained the endpoint correction from Trading API to Broker API
- ✅ Detailed proper parameter passing approach
- ✅ Included technical implementation details
- ✅ Listed benefits of the fix

## Documentation Structure

### Recent Updates Entry (v1.7.71)
```
- Correct API Endpoint
  - Uses Broker API endpoint for portfolio history
  - Path: /v1/trading/accounts/{account_id}/account/portfolio/history
  - Proper account-specific data retrieval
  - Aligns with Alpaca Broker API architecture

- Direct brokerRequest Usage
  - Removed intermediate getPortfolioHistory method
  - Direct API call with proper path and parameters
  - Cleaner implementation
  - Better error handling visibility

- Parameter Passing Fix
  - Passes params object correctly to brokerRequest
  - Includes period, timeframe, page_size, pnl_reset
  - Optional parameters: date_end, asof, page_token
  - Proper query string construction

- Technical Implementation
- Technical Details
- Benefits
```

## Key Features Documented

1. **Correct Endpoint**: Uses Broker API `/v1/trading/accounts/{account_id}/account/portfolio/history`
2. **Direct API Call**: Simplified implementation with `brokerRequest` method
3. **Proper Parameters**: Correct parameter structure and passing
4. **Account-Specific**: Uses authenticated user's Alpaca account ID
5. **Error Handling**: Clear error messages and proper status codes

## Benefits Highlighted

- Fixes portfolio history data retrieval failures
- Uses correct Alpaca Broker API endpoint
- Proper account-specific data access
- Cleaner, more maintainable code
- Better alignment with Alpaca API architecture
- Improved error handling and debugging

## Code Changes Documented

### Modified File
- `supabase/functions/alpaca-portfolio-history/index.ts`

### Key Changes

**Before (v1.7.70):**
```typescript
// Incorrect: Used intermediate method that may have wrong endpoint
const response = await alpacaClient.getPortfolioHistory(authContext.alpacaAccountId, {
  period: validatedQuery.period,
  timeframe: validatedQuery.timeframe,
  end_date: validatedQuery.date_end,
  extended_hours: false
})
```

**After (v1.7.71):**
```typescript
// Correct: Direct Broker API call with proper endpoint
const response = await alpacaClient.brokerRequest(
  `/v1/trading/accounts/${authContext.alpacaAccountId}/account/portfolio/history`,
  { params }
)
```

### Logic Flow

1. **Validate Query Parameters**: Use Zod schema for validation
2. **Build Parameters Object**: Construct params with required and optional fields
3. **Check Account ID**: Verify user has linked Alpaca account
4. **Make Direct API Call**: Use `brokerRequest` with correct Broker API endpoint
5. **Handle Response**: Return data or error with proper status codes

## Technical Details

### Correct API Endpoint

**Broker API Endpoint:**
```
GET /v1/trading/accounts/{account_id}/account/portfolio/history
```

**Why This Endpoint:**
- Part of Alpaca Broker API (not Trading API)
- Account-specific portfolio history
- Requires account ID in path
- Returns comprehensive portfolio performance data

### Parameter Structure

**Required Parameters:**
```typescript
{
  period: '1D' | '1W' | '1M' | '3M' | '1A' | '2A' | '5A' | 'all',
  timeframe: '1Min' | '5Min' | '15Min' | '1H' | '1D',
  page_size: number (1-10000, default: 1000),
  pnl_reset: 'per_day' | 'per_position' (default: 'per_day')
}
```

**Optional Parameters:**
```typescript
{
  date_end?: string,      // End date for history
  asof?: string,          // As-of date for historical view
  page_token?: string     // Pagination token
}
```

### API Response Format

```typescript
{
  timestamp: string[],           // Array of timestamps
  equity: number[],              // Portfolio equity at each timestamp
  profit_loss: number[],         // P&L at each timestamp
  profit_loss_pct: number[],     // P&L percentage at each timestamp
  base_value: number,            // Starting portfolio value
  timeframe: string,             // Timeframe used
  next_page_token?: string       // Pagination token if more data
}
```

### brokerRequest Method

The `brokerRequest` method in `AlpacaClient`:
- Automatically selects correct Broker API base URL (sandbox or live)
- Adds authentication headers
- Constructs query string from params object
- Returns standardized response format

```typescript
async brokerRequest<T>(
  endpoint: string,
  options?: { params?: Record<string, string> }
): Promise<AlpacaResponse<T>>
```

## Architecture Benefits

### Before: Intermediate Method
- Used `getPortfolioHistory` method that may have incorrect endpoint
- Abstraction layer added complexity
- Harder to debug endpoint issues
- Parameter mapping could introduce errors

### After: Direct API Call
- Direct `brokerRequest` call with explicit endpoint
- Clear visibility into API call
- Easier to debug and maintain
- Proper parameter passing

## Use Cases

### Dashboard Portfolio Chart
```typescript
// Fetch 1-month portfolio history with daily timeframe
const response = await edgeFunctionClient.get('alpaca-portfolio-history', {
  period: '1M',
  timeframe: '1D'
});

if (response.success) {
  const { timestamp, equity, profit_loss } = response.data;
  // Render chart with data
}
```

### Intraday Performance
```typescript
// Fetch today's portfolio history with 5-minute intervals
const response = await edgeFunctionClient.get('alpaca-portfolio-history', {
  period: '1D',
  timeframe: '5Min'
});
```

### Historical Analysis
```typescript
// Fetch 1-year history with weekly timeframe
const response = await edgeFunctionClient.get('alpaca-portfolio-history', {
  period: '1A',
  timeframe: '1D',
  pnl_reset: 'per_day'
});
```

### Paginated Results
```typescript
// Fetch large dataset with pagination
const response = await edgeFunctionClient.get('alpaca-portfolio-history', {
  period: 'all',
  timeframe: '1D',
  page_size: 1000
});

if (response.data.next_page_token) {
  // Fetch next page
  const nextPage = await edgeFunctionClient.get('alpaca-portfolio-history', {
    period: 'all',
    timeframe: '1D',
    page_size: 1000,
    page_token: response.data.next_page_token
  });
}
```

## Error Handling

### Common Errors

1. **No Account Linked**
   ```typescript
   {
     code: 'NO_ACCOUNT',
     message: 'No Alpaca account linked to this user',
     status: 404
   }
   ```

2. **Invalid Parameters**
   ```typescript
   {
     code: 'INVALID_REQUEST',
     message: 'Invalid query parameters',
     details: [/* Zod validation errors */],
     status: 400
   }
   ```

3. **Alpaca API Error**
   ```typescript
   {
     code: 'ALPACA_API_ERROR',
     message: 'Failed to fetch portfolio history',
     details: {/* Alpaca error details */},
     status: 400
   }
   ```

### Error Recovery

```typescript
try {
  const response = await edgeFunctionClient.get('alpaca-portfolio-history', params);
  
  if (!response.success) {
    // Handle specific error codes
    if (response.error?.code === 'NO_ACCOUNT') {
      // Prompt user to create Alpaca account
    } else if (response.error?.code === 'INVALID_REQUEST') {
      // Show validation errors
    } else {
      // Generic error handling
    }
  }
} catch (error) {
  // Network or unexpected errors
  console.error('Failed to fetch portfolio history:', error);
}
```

## Testing Considerations

### Verification Steps

1. **Test Basic Request**:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
        "https://your-project.supabase.co/functions/v1/alpaca-portfolio-history?period=1M&timeframe=1D"
   ```

2. **Test Different Periods**:
   - 1D (intraday)
   - 1W (weekly)
   - 1M (monthly)
   - 1A (annual)
   - all (complete history)

3. **Test Different Timeframes**:
   - 1Min (minute bars)
   - 5Min (5-minute bars)
   - 15Min (15-minute bars)
   - 1H (hourly bars)
   - 1D (daily bars)

4. **Test Optional Parameters**:
   - date_end: Specific end date
   - asof: Historical view
   - page_token: Pagination

5. **Test Error Cases**:
   - Invalid period value
   - Invalid timeframe value
   - Missing authentication
   - Account without history

### Edge Cases

1. **New Account**: No history data available
2. **Large Dataset**: Requires pagination
3. **Intraday Request**: Only available during market hours
4. **Historical Date**: Using asof parameter for past view
5. **Invalid Date Range**: date_end before account creation

## Performance Considerations

### Caching Strategy

Portfolio history data can be cached based on parameters:

```typescript
// Cache key based on parameters
const cacheKey = `portfolio-history:${period}:${timeframe}:${date_end || 'latest'}`;

// Cache TTL based on timeframe
const cacheTTL = timeframe === '1Min' ? 60 * 1000 :      // 1 minute
                 timeframe === '5Min' ? 5 * 60 * 1000 :   // 5 minutes
                 timeframe === '1D' ? 60 * 60 * 1000 :    // 1 hour
                 5 * 60 * 1000;                           // 5 minutes default
```

### Data Volume

- **Intraday (1Min)**: Large dataset, use pagination
- **Daily (1D)**: Moderate dataset, usually single page
- **Weekly/Monthly**: Small dataset, fast response

### Optimization Tips

1. **Use Appropriate Timeframe**: Don't request 1Min data for 1-year period
2. **Implement Pagination**: For large datasets
3. **Cache Results**: Based on timeframe and update frequency
4. **Limit Page Size**: Balance between requests and data volume

## Integration Examples

### Portfolio Chart Component

```typescript
import { useEffect, useState } from 'react';
import { edgeFunctionClient } from '@/lib/edgeFunctionClient';

function PortfolioChart({ period = '1M', timeframe = '1D' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const response = await edgeFunctionClient.get('alpaca-portfolio-history', {
        period,
        timeframe
      });

      if (response.success) {
        setData(response.data);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [period, timeframe]);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data available</div>;

  return (
    <LineChart data={data.timestamp.map((t, i) => ({
      timestamp: t,
      equity: data.equity[i],
      profit_loss: data.profit_loss[i]
    }))} />
  );
}
```

### Performance Dashboard

```typescript
async function getPerformanceMetrics() {
  const response = await edgeFunctionClient.get('alpaca-portfolio-history', {
    period: '1A',
    timeframe: '1D'
  });

  if (response.success) {
    const { equity, profit_loss, profit_loss_pct, base_value } = response.data;
    
    return {
      currentValue: equity[equity.length - 1],
      totalReturn: profit_loss[profit_loss.length - 1],
      totalReturnPct: profit_loss_pct[profit_loss_pct.length - 1],
      startingValue: base_value,
      highWaterMark: Math.max(...equity),
      lowWaterMark: Math.min(...equity)
    };
  }
}
```

## Files Modified

- ✅ `supabase/functions/alpaca-portfolio-history/index.ts` - Fixed API endpoint and parameter passing
- ✅ `README.md` - Comprehensive documentation update with new v1.7.71 entry

## Summary

The README now provides complete documentation for the portfolio history API endpoint fix, including:
- Clear explanation of the correct Broker API endpoint
- Detailed parameter structure and usage
- Technical implementation details with before/after examples
- Comprehensive use cases and integration examples
- Error handling and testing considerations
- Performance optimization strategies
- Professional formatting with structured sections

The documentation follows the established README structure and style, making it easy for developers to understand the fix and properly integrate portfolio history data into their applications.

## Related Features

This fix complements:
- **Portfolio Chart Component**: Displays portfolio performance over time
- **Dashboard**: Shows portfolio value and P&L trends
- **Performance Analytics**: Calculates returns and metrics
- **API Service**: Caching and error handling for portfolio data
- **AlpacaClient**: Broker API integration with proper authentication

Together, these features provide a robust portfolio tracking system with accurate historical data, comprehensive visualization, and reliable API integration.

## Migration Notes

### For Existing Implementations
No migration required - this is an internal fix:
- API endpoint corrected automatically
- No changes to request/response format
- Existing client code continues to work
- Improved reliability and data accuracy

### For New Implementations
Recommended approach:
1. Use `alpaca-portfolio-history` Edge Function for all portfolio history needs
2. Specify appropriate period and timeframe for use case
3. Implement caching based on data update frequency
4. Handle pagination for large datasets
5. Provide loading states and error handling

## Best Practices

### Parameter Selection

1. **Dashboard Overview**: `period: '1M', timeframe: '1D'`
2. **Intraday Trading**: `period: '1D', timeframe: '5Min'`
3. **Long-term Analysis**: `period: '1A', timeframe: '1D'`
4. **Complete History**: `period: 'all', timeframe: '1D'` with pagination

### Caching Strategy

1. **Intraday Data**: Short cache (1-5 minutes)
2. **Daily Data**: Medium cache (15-60 minutes)
3. **Historical Data**: Long cache (1-24 hours)
4. **Invalidate on Trade**: Clear cache after order execution

### Error Handling

1. **No Data**: Show empty state with helpful message
2. **API Error**: Display error and retry button
3. **Network Error**: Show offline indicator
4. **Invalid Parameters**: Validate before API call

## Future Enhancements

### Advanced Analytics

Calculate additional metrics from portfolio history:
- Sharpe ratio
- Maximum drawdown
- Volatility
- Beta vs market
- Win/loss streaks

### Comparison Features

Compare portfolio performance against:
- Market indices (S&P 500, NASDAQ)
- Other users (anonymized)
- Benchmark portfolios
- Previous time periods

### Export Functionality

Export portfolio history data:
- CSV format for spreadsheet analysis
- PDF reports with charts
- JSON for programmatic access
- Email scheduled reports

### Real-time Updates

Enhance with real-time data:
- WebSocket integration for live updates
- Streaming portfolio value changes
- Real-time P&L calculations
- Intraday performance tracking

---

**Key Takeaway**: This fix ensures portfolio history data is retrieved correctly from the Alpaca Broker API, providing accurate historical performance data for portfolio tracking, analytics, and visualization features.
