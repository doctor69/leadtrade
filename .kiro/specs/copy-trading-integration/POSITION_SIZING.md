# Copy Trading Position Sizing - CORRECTED

## The Correct Formula

```typescript
// Step 1: Calculate what % of leader's portfolio this trade represents
tradePercentageOfLeaderPortfolio = (leaderShares × price) / leaderTotalPortfolioValue

// Step 2: Apply follower's allocation percentage
followerTradePercentage = tradePercentageOfLeaderPortfolio × followerAllocation

// Step 3: Calculate follower's trade value
followerTradeValue = followerTradePercentage × followerTotalPortfolioValue

// Step 4: Convert to shares
followerShares = followerTradeValue / price
```

## Simplified Formula

```typescript
// Calculate trade value first
leaderTradeValue = leaderShares × price

// Calculate follower's trade value
followerTradeValue = (leaderTradeValue / leaderPortfolio) × followerAllocation × followerPortfolio

// Convert to shares
followerShares = followerTradeValue / price
```

## Complete Example

### Leader Trade
- Symbol: AAPL
- Shares: 100
- Price: $150
- Trade Value: $15,000
- **Total Portfolio Value: $100,000**

### Follower (20% allocation)
- **Total Portfolio Value: $50,000**

### Calculation

**Step 1:** Calculate follower's trade value
```
followerTradeValue = ($15,000 / $100,000) × 0.20 × $50,000
followerTradeValue = 0.15 × 0.20 × $50,000
followerTradeValue = $1,500
```

**Step 2:** Convert to shares
```
followerShares = $1,500 / $150 = 10 shares
```

**Verification:**
- Leader trade: 15% of portfolio ($15,000 / $100,000)
- Follower allocation: 20%
- Follower trade: 3% of portfolio (15% × 20%)
- $1,500 / $50,000 = 3% ✓

### Verification
- Leader: 100 shares = $15,000 (15% of $100k portfolio)
- Follower: 10 shares = $1,500 (3% of $50k portfolio)
- Follower allocated 20% to leader
- 15% × 20% = 3% ✓

## More Examples

### Example 2: Different Portfolio Sizes

**Leader:**
- Portfolio: $200,000
- Trade: 50 shares of TSLA at $200 = $10,000
- Trade % of portfolio: $10,000 / $200,000 = 5%

**Follower A (30% allocation):**
- Portfolio: $30,000
- Trade %: 5% × 30% = 1.5%
- Trade value: 1.5% × $30,000 = $450
- Shares: $450 / $200 = 2.25 → 2 shares

**Follower B (50% allocation):**
- Portfolio: $100,000
- Trade %: 5% × 50% = 2.5%
- Trade value: 2.5% × $100,000 = $2,500
- Shares: $2,500 / $200 = 12.5 → 12 shares

### Example 3: Large Trade

**Leader:**
- Portfolio: $50,000
- Trade: 200 shares of NVDA at $500 = $100,000
- Trade % of portfolio: $100,000 / $50,000 = 200% (using leverage/margin)

**Follower (10% allocation):**
- Portfolio: $80,000
- Trade %: 200% × 10% = 20%
- Trade value: 20% × $80,000 = $16,000
- Shares: $16,000 / $500 = 32 shares

## Implementation

```typescript
interface CopyTradeCalculation {
  leaderShares: number;
  price: number;
  leaderPortfolioValue: number;
  followerAllocation: number; // 0.0 to 1.0
  followerPortfolioValue: number;
}

function calculateFollowerShares(params: CopyTradeCalculation): number {
  const {
    leaderShares,
    price,
    leaderPortfolioValue,
    followerAllocation,
    followerPortfolioValue
  } = params;

  // Step 1: Calculate leader's trade value
  const leaderTradeValue = leaderShares * price;
  
  // Step 2: Calculate follower's trade value
  // (leaderTradeValue / leaderPortfolio) × allocation × followerPortfolio
  const followerTradeValue = 
    (leaderTradeValue / leaderPortfolioValue) * 
    followerAllocation * 
    followerPortfolioValue;
  
  // Step 3: Convert to shares
  const followerShares = followerTradeValue / price;
  
  // Step 4: Round down to whole shares
  return Math.floor(followerShares);
}
```

## Testing Scenarios

```typescript
// Test 1: Basic case
const result1 = calculateFollowerShares({
  leaderShares: 100,
  price: 150,
  leaderPortfolioValue: 100000,
  followerAllocation: 0.20,
  followerPortfolioValue: 50000
});
expect(result1).toBe(10); // (100/100000) * 0.20 * 50000 = 10

// Test 2: Equal portfolios
const result2 = calculateFollowerShares({
  leaderShares: 50,
  price: 200,
  leaderPortfolioValue: 100000,
  followerAllocation: 0.50,
  followerPortfolioValue: 100000
});
expect(result2).toBe(25); // (50/100000) * 0.50 * 100000 = 25

// Test 3: Small allocation
const result3 = calculateFollowerShares({
  leaderShares: 100,
  price: 150,
  leaderPortfolioValue: 100000,
  followerAllocation: 0.05,
  followerPortfolioValue: 50000
});
expect(result3).toBe(2); // (100/100000) * 0.05 * 50000 = 2.5 → 2

// Test 4: Below minimum
const result4 = calculateFollowerShares({
  leaderShares: 10,
  price: 150,
  leaderPortfolioValue: 100000,
  followerAllocation: 0.05,
  followerPortfolioValue: 20000
});
expect(result4).toBe(0); // (10/100000) * 0.05 * 20000 = 0.1 → 0 (skip)
```

## Key Insights

1. **Portfolio-relative sizing**: The formula ensures trades are sized relative to both portfolios
2. **Allocation percentage**: Acts as a multiplier on the leader's trade percentage
3. **Price independence**: The price cancels out in the simplified formula
4. **Scalable**: Works for any portfolio size or allocation percentage

## Common Mistakes to Avoid

❌ **Wrong:** Just multiply shares by allocation
```typescript
followerShares = leaderShares * allocation // WRONG!
```

❌ **Wrong:** Use shares instead of trade value
```typescript
followerShares = (leaderShares / leaderPortfolio) * allocation * followerPortfolio // WRONG!
```

✓ **Correct:** Use trade value
```typescript
leaderTradeValue = leaderShares * price
followerTradeValue = (leaderTradeValue / leaderPortfolio) * allocation * followerPortfolio
followerShares = followerTradeValue / price
```

## Summary

The correct formula accounts for:
1. ✅ Leader's portfolio size
2. ✅ Follower's portfolio size  
3. ✅ Follower's allocation percentage
4. ✅ Trade size relative to leader's portfolio

**Final Formula:**
```typescript
leaderTradeValue = leaderShares × price
followerTradeValue = (leaderTradeValue / leaderPortfolio) × allocation × followerPortfolio
followerShares = followerTradeValue / price
```

This ensures followers get the right position size based on their portfolio and allocation! 🎯
