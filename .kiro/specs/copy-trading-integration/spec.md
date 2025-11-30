# Copy Trading Integration Spec

## Overview
Integrate copy trading logic into the trading system to automatically replicate trades from leaders to their followers with proper allocation and risk management.

## Goals
1. Automatically copy trades when leaders execute them
2. Calculate proper position sizes based on follower allocation percentages
3. Handle edge cases (insufficient funds, market hours, etc.)
4. Provide real-time notifications to followers
5. Track copy trading performance and attribution

## User Stories

### As a Leader
- When I place a trade, it should automatically be copied to my followers
- I should see how many followers copied my trade
- I should be able to see my follower count and total AUM being copied

### As a Follower
- When a leader I follow places a trade, it should automatically execute in my account
- The position size should be proportional to my allocation percentage
- I should receive a notification when a trade is copied
- I should be able to see which trades came from which leader

## Position Sizing Logic - Detailed Explanation

### Core Principle
**Copy the trade proportionally based on:**
1. Leader's trade value as % of their portfolio
2. Follower's allocation percentage to that leader
3. Follower's total portfolio value

### Formula
```typescript
// Step 1: Calculate leader's trade value
leaderTradeValue = leaderShares × price

// Step 2: Calculate follower's trade value
followerTradeValue = (leaderTradeValue / leaderPortfolio) × allocation × followerPortfolio

// Step 3: Convert to shares
followerShares = followerTradeValue / price
```

### Why This Works
- Leader's trade represents X% of their portfolio
- Follower allocated Y% to copy this leader
- Follower's trade should be (X% × Y%) of their portfolio
- This ensures proper proportional sizing regardless of portfolio sizes

### Examples

#### Example 1: Basic Case
```
Leader Trade:
- Symbol: AAPL
- Shares: 100
- Price: $150
- Trade Value: $15,000
- Portfolio: $100,000
- Trade is 15% of portfolio

Follower (20% allocation):
- Portfolio: $50,000
- Calculation: ($15,000 / $100,000) × 0.20 × $50,000 = $1,500
- Shares: $1,500 / $150 = 10 shares
```

#### Example 2: Multiple Followers
```
Leader Trade:
- Symbol: TSLA
- Shares: 50
- Price: $200
- Trade Value: $10,000
- Portfolio: $200,000
- Trade is 5% of portfolio

Follower A (10% allocation, $30,000 portfolio):
- Trade value: ($10,000 / $200,000) × 0.10 × $30,000 = $150
- Shares: $150 / $200 = 0.75 → 0 shares (below minimum)

Follower B (25% allocation, $100,000 portfolio):
- Trade value: ($10,000 / $200,000) × 0.25 × $100,000 = $1,250
- Shares: $1,250 / $200 = 6.25 → 6 shares

Follower C (50% allocation, $80,000 portfolio):
- Trade value: ($10,000 / $200,000) × 0.50 × $80,000 = $2,000
- Shares: $2,000 / $200 = 10 shares
```

#### Example 3: Sell Orders
```
Leader Trade:
- Symbol: NVDA
- Shares: -30 (selling)
- Price: $500
- Trade Value: $15,000 (sell)
- Portfolio: $150,000
- Trade is 10% of portfolio

Follower (40% allocation, $60,000 portfolio):
- Trade value: ($15,000 / $150,000) × 0.40 × $60,000 = $2,400
- Shares: $2,400 / $500 = 4.8 → 4 shares (sell)
```

### Important Notes

1. **Price Slippage**: Leader and follower may get slightly different prices due to market movement
   - Solution: Accept this as normal market behavior
   - Log actual execution prices for both

2. **Fractional Shares**: Calculation may result in fractional shares
   - Option A: Round down to whole shares
   - Option B: Use Alpaca's fractional shares feature
   - Recommendation: Round down for simplicity

3. **Minimum Order Size**: Some brokers have minimum order requirements
   - Check if calculated shares meet minimum (usually 1 share or $1)
   - Skip trade if below minimum

4. **Maximum Position Size**: Follower may have position limits
   - Check if trade would exceed limits
   - Skip or reduce size if needed

## Technical Requirements

### 1. Trade Execution Hook
- Intercept all trade executions from leaders
- Identify if the trader has followers
- Queue copy trades for execution

### 2. Position Sizing Algorithm
```typescript
// Follower position size calculation based on DOLLAR AMOUNT
leaderTradeValue = leaderShares * currentPrice
followerTradeValue = leaderTradeValue * followerAllocation
followerShares = followerTradeValue / currentPrice

// Example:
// Leader: Buys 100 shares of AAPL at $150 = $15,000 trade
// Follower: 20% allocation to this leader
// Follower trade value = $15,000 * 0.20 = $3,000
// Follower shares = $3,000 / $150 = 20 shares

// Alternative formula (same result):
followerShares = leaderShares * followerAllocation

// Example:
// Leader: 100 shares
// Follower: 20% allocation
// Follower shares = 100 * 0.20 = 20 shares
```

### 3. Copy Trade Execution Flow
```
1. Leader places trade → Trade execution service
   - Leader buys 100 shares of AAPL at $150 = $15,000 trade
   - Leader portfolio: $100,000

2. Check if leader has followers → Database query
   - Find all active followers with their allocation percentages
   - Get follower portfolio values

3. For each follower:
   a. Calculate position size
      - Follower A (20% allocation, $50,000 portfolio):
        Trade value: ($15,000 / $100,000) × 0.20 × $50,000 = $1,500
        Shares: $1,500 / $150 = 10 shares
      
      - Follower B (50% allocation, $80,000 portfolio):
        Trade value: ($15,000 / $100,000) × 0.50 × $80,000 = $6,000
        Shares: $6,000 / $150 = 40 shares
   
   b. Check buying power
      - Verify follower has sufficient funds for calculated trade value
   
   c. Validate market hours
      - Ensure market is open for trading
   
   d. Execute trade via Alpaca
      - Place market order for calculated shares
   
   e. Record copy trade attribution
      - Link follower trade to leader trade
      - Store calculation details for audit
   
   f. Send notification
      - "Copied 10 shares of AAPL from @leader ($1,500)"

4. Update leader stats (followers who copied, total volume)
   - "2 followers copied your trade ($7,500 total volume)"
```

### 4. Database Schema Updates

#### copy_trades table
```sql
CREATE TABLE copy_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_trade_id UUID REFERENCES trades(id),
  follower_user_id UUID REFERENCES profiles(id),
  leader_user_id UUID REFERENCES profiles(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL, -- 'buy' or 'sell'
  quantity DECIMAL NOT NULL,
  leader_quantity DECIMAL NOT NULL,
  allocation_percentage DECIMAL NOT NULL,
  executed_price DECIMAL,
  status TEXT NOT NULL, -- 'pending', 'executed', 'failed', 'skipped'
  failure_reason TEXT,
  alpaca_order_id TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_copy_trades_follower ON copy_trades(follower_user_id);
CREATE INDEX idx_copy_trades_leader ON copy_trades(leader_user_id);
CREATE INDEX idx_copy_trades_leader_trade ON copy_trades(leader_trade_id);
```

#### copy_trading_stats table
```sql
CREATE TABLE copy_trading_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  role TEXT NOT NULL, -- 'leader' or 'follower'
  total_trades_copied INTEGER DEFAULT 0,
  successful_copies INTEGER DEFAULT 0,
  failed_copies INTEGER DEFAULT 0,
  total_volume_copied DECIMAL DEFAULT 0,
  last_copy_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. Edge Cases to Handle

#### Insufficient Buying Power
- Skip the trade
- Log reason: "Insufficient buying power"
- Notify follower

#### Market Closed
- Queue for next market open
- Or skip if leader's trade was time-sensitive

#### Fractional Shares
- Round down to nearest whole share
- Or use Alpaca's fractional shares if enabled

#### Position Limits
- Check if follower already has max positions
- Skip if limit reached

#### Minimum Order Size
- Skip if calculated shares < 1 (or minimum)
- Log reason: "Position too small"

### 6. API Endpoints Needed

#### POST /api/copy-trading/execute
```typescript
{
  leaderTradeId: string;
  leaderUserId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
}
```

#### GET /api/copy-trading/stats/:userId
```typescript
{
  role: 'leader' | 'follower';
  totalTradesCopied: number;
  successRate: number;
  totalVolume: number;
  recentCopies: CopyTrade[];
}
```

### 7. Real-time Notifications

#### For Followers
- "🔔 Trade copied from @leader: Bought 10 shares of AAPL"
- "⚠️ Trade skipped: Insufficient buying power"

#### For Leaders
- "👥 5 followers copied your AAPL trade"
- "📊 Total volume copied: $5,000"

### 8. Performance Considerations

- Execute copy trades asynchronously (don't block leader's trade)
- Use queue system for high-volume leaders
- Batch notifications
- Cache follower lists

## Implementation Plan

### Phase 1: Core Copy Logic (Day 1)
- [ ] Create copy trade execution service
- [ ] Implement position sizing algorithm
- [ ] Add database tables and migrations
- [ ] Create API endpoints

### Phase 2: Integration (Day 1-2)
- [ ] Hook into existing trade execution flow
- [ ] Add copy trade triggers
- [ ] Implement edge case handling
- [ ] Add error logging

### Phase 3: Notifications & UI (Day 2)
- [ ] Real-time notifications for followers
- [ ] Leader stats dashboard
- [ ] Copy trade history view
- [ ] Performance attribution

### Phase 4: Testing & Optimization (Day 2-3)
- [ ] Unit tests for position sizing
- [ ] Integration tests for copy flow
- [ ] Load testing for high-volume scenarios
- [ ] Performance optimization

## Success Metrics

- Copy trades execute within 5 seconds of leader trade
- 95%+ success rate for valid copy trades
- Accurate position sizing (within 1% of target)
- Zero data loss or duplicate trades
- Real-time notifications delivered

## Dependencies

- Existing trade execution service
- Alpaca API integration
- Supabase Edge Functions
- WebSocket for real-time updates
- Notification service

## Risks & Mitigations

### Risk: Race conditions with concurrent trades
**Mitigation:** Use database transactions and locks

### Risk: Alpaca API rate limits
**Mitigation:** Implement queue with rate limiting

### Risk: Follower account issues (suspended, etc.)
**Mitigation:** Validate account status before execution

### Risk: Price slippage between leader and follower
**Mitigation:** Accept market orders, log actual prices

## Next Steps

1. Review and approve spec
2. Create detailed tasks
3. Set up development environment
4. Begin Phase 1 implementation

---

**Ready to build tomorrow! 🚀**
