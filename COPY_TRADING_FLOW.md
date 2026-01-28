# Copy Trading Flow - How Trade Percentages Work

## Overview
The copy trading system automatically replicates a leader's trades to their followers using proportional sizing based on portfolio percentages.

## The Flow

### 1. Leader Places a Trade
When a leader places a trade through the UI:
- Order is sent to `alpaca-orders` edge function
- Order is executed on leader's Alpaca account

### 2. System Checks for Followers
After successful order placement:
```typescript
// Check if leader has active followers
const { data: followers } = await supabase
  .from('copy_trading_subscriptions')
  .select('follower_id')
  .eq('leader_id', leaderId)
  .eq('is_active', true);
```

### 3. Get Leader's Portfolio Value
```typescript
// Fetch leader's account data from Alpaca
const accountResponse = await alpacaClient.brokerRequest(
  `/v1/trading/accounts/${accountId}/account`
);

const leaderPortfolioValue = parseFloat(
  accountResponse.data.equity || 
  accountResponse.data.portfolio_value
);
```

### 4. Trigger Copy Trades (Non-blocking)
```typescript
fetch('/functions/v1/execute-copy-trades', {
  body: JSON.stringify({
    leaderId: userId,
    orderData: orderPayload,        // Trade details (symbol, qty, side, etc.)
    leaderPortfolioValue: 50000     // Leader's total portfolio value
  })
});
```

### 5. Calculate Leader's Trade Percentage
In `execute-copy-trades` function:
```typescript
// Example: Leader buys 10 shares of AAPL at $150
const tradeValue = orderData.qty * orderData.limit_price
// tradeValue = 10 * 150 = $1,500

const leaderTradePercentage = (tradeValue / leaderPortfolioValue) * 100
// leaderTradePercentage = (1500 / 50000) * 100 = 3%
```

### 6. Calculate Each Follower's Trade
For each follower with active subscription:

```typescript
// Get follower's data
const followerAllocationPercentage = 20  // Follower allocated 20% to this leader
const followerPortfolioValue = 10000     // Follower's total portfolio

// Apply the formula: (Leader's trade %) × (Follower's allocation %)
const followerTradePercentage = (leaderTradePercentage * followerAllocationPercentage) / 100
// followerTradePercentage = (3 * 20) / 100 = 0.6%

// Calculate dollar amount
const followerTradeValue = (followerPortfolioValue * followerTradePercentage) / 100
// followerTradeValue = (10000 * 0.6) / 100 = $60

// Calculate shares
const followerQty = Math.floor(followerTradeValue / estimatedPrice)
// followerQty = Math.floor(60 / 150) = 0 shares (too small!)
```

## Real Example

**Leader:**
- Portfolio: $100,000
- Trade: Buy 50 shares AAPL @ $150 = $7,500
- Trade percentage: 7.5% of portfolio

**Follower A:**
- Portfolio: $50,000
- Allocation to leader: 20%
- Trade: 7.5% of 20% = 1.5% of total portfolio
- Trade value: $50,000 × 1.5% = $750
- Shares: 750 / 150 = 5 shares

**Follower B:**
- Portfolio: $20,000
- Allocation to leader: 50%
- Trade: 7.5% of 50% = 3.75% of total portfolio
- Trade value: $20,000 × 3.75% = $750
- Shares: 750 / 150 = 5 shares

**Follower C:**
- Portfolio: $200,000
- Allocation to leader: 10%
- Trade: 7.5% of 10% = 0.75% of total portfolio
- Trade value: $200,000 × 0.75% = $1,500
- Shares: 1500 / 150 = 10 shares

## Key Points

1. **Proportional Sizing**: Followers trade the same percentage of their allocated amount as the leader trades of their portfolio
2. **Multiple Leaders**: Followers can allocate to multiple leaders (e.g., 20% + 30% + 50% = 100%)
3. **Risk Management**: If leader trades 10% of portfolio, follower with 20% allocation only risks 2% of total portfolio
4. **Automatic**: Happens in background, doesn't slow down leader's trade
5. **Price Estimation**: Uses limit_price if available, otherwise needs market price lookup

## Data Sources

| Data Point | Source | When |
|------------|--------|------|
| Leader Portfolio Value | Alpaca API `/accounts/{id}/account` | When leader places trade |
| Trade Details | Order payload from UI | When leader places trade |
| Follower Allocation % | `copy_trading_subscriptions` table | When copying trade |
| Follower Portfolio Value | Alpaca API `/accounts/{id}/account` | When copying trade |

## Formula Summary

```
Follower Trade Amount = 
  Follower Portfolio × 
  (Follower Allocation % / 100) × 
  (Leader Trade % / 100)

Where:
  Leader Trade % = (Leader Trade Value / Leader Portfolio) × 100
```
