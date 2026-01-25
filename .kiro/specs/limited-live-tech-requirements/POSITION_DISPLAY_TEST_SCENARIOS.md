# Position Display Test Scenarios - Task 5.5

This document provides comprehensive test scenarios for position display functionality, including examples with multiple stocks, options, P&L calculations, and screenshots for Alpaca review.

**Requirements Coverage:** 5.1, 5.2, 5.3, 5.4, 5.5

---

## Table of Contents

1. [Stock Position Display Scenarios](#stock-position-display-scenarios)
2. [Options Position Display Scenarios](#options-position-display-scenarios)
3. [P&L Calculation Examples](#pl-calculation-examples)
4. [Real-Time Market Data Updates](#real-time-market-data-updates)
5. [Empty State and Position Closure](#empty-state-and-position-closure)
6. [Test Execution Summary](#test-execution-summary)

---

## Stock Position Display Scenarios

### Scenario 1: Single Stock Position - Profitable

**Setup:**
- Symbol: AAPL
- Quantity: 100 shares
- Average Entry Price: $150.00
- Current Price: $155.00

**Expected Display:**
```
Symbol: AAPL
Quantity: 100 shares
Current Price: $155.00
Market Value: $15,500.00
Cost Basis: $15,000.00
Unrealized P&L: +$500.00
P&L %: +3.33%
Today's Change: +$50.00 (+0.33%)
```

**Verification Points:**
- ✅ Symbol displayed correctly
- ✅ Quantity shown with "shares" label
- ✅ Cost basis calculated as qty × avg_entry_price
- ✅ Market value calculated as qty × current_price
- ✅ Unrealized P&L = market_value - cost_basis
- ✅ P&L % = unrealized_pl / cost_basis × 100
- ✅ Green color for positive P&L
- ✅ Trending up icon displayed

---

### Scenario 2: Multiple Stock Positions - Mixed Performance

**Setup:**

**Position 1 - AAPL (Profitable):**
- Quantity: 100 shares
- Avg Entry: $150.00
- Current: $155.00
- Market Value: $15,500.00
- Cost Basis: $15,000.00
- Unrealized P&L: +$500.00 (+3.33%)

**Position 2 - GOOGL (Profitable):**
- Quantity: 50 shares
- Avg Entry: $200.00
- Current: $210.00
- Market Value: $10,500.00
- Cost Basis: $10,000.00
- Unrealized P&L: +$500.00 (+5.00%)

**Position 3 - TSLA (Loss):**
- Quantity: 25 shares
- Avg Entry: $200.00
- Current: $190.00
- Market Value: $4,750.00
- Cost Basis: $5,000.00
- Unrealized P&L: -$250.00 (-5.00%)

**Portfolio Summary:**
```
Total Positions: 3
Total Market Value: $30,750.00
Total Cost Basis: $30,000.00
Total Unrealized P&L: +$750.00
Portfolio P&L %: +2.50%
Today's Total Change: +$100.00
```

**Verification Points:**
- ✅ All positions displayed in list/table
- ✅ Each position shows correct calculations
- ✅ Green color for profitable positions (AAPL, GOOGL)
- ✅ Red color for losing position (TSLA)
- ✅ Portfolio summary aggregates correctly
- ✅ Position count accurate

---

### Scenario 3: Fractional Shares

**Setup:**
- Symbol: TSLA
- Quantity: 10.5 shares
- Average Entry Price: $200.00
- Current Price: $210.00

**Expected Display:**
```
Symbol: TSLA
Quantity: 10.5 shares
Current Price: $210.00
Market Value: $2,205.00
Cost Basis: $2,100.00
Unrealized P&L: +$105.00
P&L %: +5.00%
```

**Verification Points:**
- ✅ Fractional quantity displayed with decimal
- ✅ Calculations accurate for fractional shares
- ✅ Currency formatted to 2 decimal places

---

### Scenario 4: Short Position

**Setup:**
- Symbol: SPY
- Quantity: -50 shares (short)
- Average Entry Price: $450.00
- Current Price: $445.00

**Expected Display:**
```
Symbol: SPY
Quantity: -50 shares (SHORT)
Current Price: $445.00
Market Value: -$22,250.00
Cost Basis: -$22,500.00
Unrealized P&L: +$250.00
P&L %: +1.11%
Side: Short
```

**Verification Points:**
- ✅ Negative quantity indicates short position
- ✅ "SHORT" badge displayed
- ✅ P&L positive when price drops (profitable short)
- ✅ Market value and cost basis shown as negative

---

## Options Position Display Scenarios

### Scenario 5: Call Option Position

**Setup:**
- Symbol: AAPL250117C00150000
- Underlying: AAPL
- Option Type: Call
- Strike Price: $150.00
- Expiration: 2025-01-17
- Quantity: 1 contract
- Avg Entry Price: $5.50 per share
- Current Price: $6.00 per share
- Contract Size: 100 shares

**Expected Display:**
```
Symbol: AAPL250117C00150000
Underlying: AAPL
Type: Call
Strike: $150.00
Expiration: Jan 17, 2025
Quantity: 1 contract
Current Price: $6.00
Market Value: $600.00
Cost Basis: $550.00
Unrealized P&L: +$50.00
P&L %: +9.09%
Days to Expiration: [calculated]
```

**Verification Points:**
- ✅ Option symbol displayed
- ✅ Underlying symbol shown prominently
- ✅ Option type (Call) displayed
- ✅ Strike price formatted as currency
- ✅ Expiration date formatted (MMM DD, YYYY)
- ✅ Market value = qty × current_price × contract_size
- ✅ Days to expiration calculated
- ✅ Option-specific fields visible

---

### Scenario 6: Put Option Position

**Setup:**
- Symbol: SPY250117P00450000
- Underlying: SPY
- Option Type: Put
- Strike Price: $450.00
- Expiration: 2025-01-17
- Quantity: 2 contracts
- Avg Entry Price: $3.25 per share
- Current Price: $4.00 per share
- Contract Size: 100 shares

**Expected Display:**
```
Symbol: SPY250117P00450000
Underlying: SPY
Type: Put
Strike: $450.00
Expiration: Jan 17, 2025
Quantity: 2 contracts
Current Price: $4.00
Market Value: $800.00
Cost Basis: $650.00
Unrealized P&L: +$150.00
P&L %: +23.08%
```

**Verification Points:**
- ✅ Put option type displayed
- ✅ Multiple contracts handled correctly
- ✅ Market value = 2 × $4.00 × 100 = $800.00
- ✅ All option-specific fields present

---

### Scenario 7: Mixed Stock and Options Portfolio

**Setup:**

**Stock Position - AAPL:**
- Quantity: 100 shares
- Current Price: $155.00
- Market Value: $15,500.00
- Cost Basis: $15,000.00
- Unrealized P&L: +$500.00

**Option Position - AAPL Call:**
- Underlying: AAPL
- Strike: $150.00
- Expiration: Jan 17, 2025
- Quantity: 1 contract
- Market Value: $600.00
- Cost Basis: $550.00
- Unrealized P&L: +$50.00

**Option Position - SPY Put:**
- Underlying: SPY
- Strike: $450.00
- Expiration: Jan 17, 2025
- Quantity: 2 contracts
- Market Value: $800.00
- Cost Basis: $650.00
- Unrealized P&L: +$150.00

**Portfolio Summary:**
```
Total Positions: 3 (1 stock, 2 options)
Total Market Value: $16,900.00
Total Cost Basis: $16,200.00
Total Unrealized P&L: +$700.00
Portfolio P&L %: +4.32%
```

**Verification Points:**
- ✅ Stock and option positions displayed together
- ✅ Each type shows appropriate fields
- ✅ Portfolio summary includes all positions
- ✅ Position types distinguishable

---

## P&L Calculation Examples

### Example 1: Basic P&L Calculation

**Formula:**
```
Unrealized P&L = Market Value - Cost Basis
Market Value = Quantity × Current Price
Cost Basis = Quantity × Average Entry Price
P&L % = (Unrealized P&L / Cost Basis) × 100
```

**Test Case:**
- Quantity: 100 shares
- Avg Entry: $150.00
- Current Price: $155.00

**Calculations:**
```
Cost Basis = 100 × $150.00 = $15,000.00
Market Value = 100 × $155.00 = $15,500.00
Unrealized P&L = $15,500.00 - $15,000.00 = $500.00
P&L % = ($500.00 / $15,000.00) × 100 = 3.33%
```

**Verification:**
- ✅ Cost basis: $15,000.00
- ✅ Market value: $15,500.00
- ✅ Unrealized P&L: +$500.00
- ✅ P&L %: +3.33%

---

### Example 2: Options P&L Calculation

**Formula:**
```
Market Value = Contracts × Price per Share × Contract Size
Cost Basis = Contracts × Entry Price per Share × Contract Size
Unrealized P&L = Market Value - Cost Basis
```

**Test Case:**
- Contracts: 1
- Entry Price: $5.50 per share
- Current Price: $6.00 per share
- Contract Size: 100

**Calculations:**
```
Cost Basis = 1 × $5.50 × 100 = $550.00
Market Value = 1 × $6.00 × 100 = $600.00
Unrealized P&L = $600.00 - $550.00 = $50.00
P&L % = ($50.00 / $550.00) × 100 = 9.09%
```

**Verification:**
- ✅ Cost basis: $550.00
- ✅ Market value: $600.00
- ✅ Unrealized P&L: +$50.00
- ✅ P&L %: +9.09%

---

### Example 3: Portfolio Aggregation

**Multiple Positions:**

Position 1: +$500.00 P&L
Position 2: +$500.00 P&L
Position 3: -$250.00 P&L

**Portfolio Calculation:**
```
Total Unrealized P&L = $500.00 + $500.00 + (-$250.00) = $750.00
Total Cost Basis = $15,000 + $10,000 + $5,000 = $30,000.00
Portfolio P&L % = ($750.00 / $30,000.00) × 100 = 2.50%
```

**Verification:**
- ✅ Individual P&Ls sum correctly
- ✅ Portfolio percentage accurate
- ✅ Handles mixed positive/negative P&L

---

## Real-Time Market Data Updates

### Scenario 8: Live Price Update

**Initial State:**
```
Symbol: AAPL
Current Price: $150.00
Market Value: $15,000.00
Unrealized P&L: $0.00
Last Update: 10:00:00
```

**After Market Data Update (Price: $155.00):**
```
Symbol: AAPL
Current Price: $155.00
Market Value: $15,500.00
Unrealized P&L: +$500.00
P&L %: +3.33%
Last Update: 10:05:00
```

**Verification Points:**
- ✅ Price updates in real-time
- ✅ Market value recalculated
- ✅ P&L recalculated
- ✅ Timestamp updated
- ✅ UI reflects changes immediately

---

### Scenario 9: Multiple Rapid Updates

**Price Sequence:**
1. $150.00 → $150.50 (10:00:00)
2. $150.50 → $151.00 (10:00:30)
3. $151.00 → $150.75 (10:01:00)
4. $150.75 → $151.25 (10:01:30)
5. $151.25 → $151.50 (10:02:00)

**Final State:**
```
Current Price: $151.50
Market Value: $15,150.00
Unrealized P&L: +$150.00
P&L %: +1.00%
```

**Verification Points:**
- ✅ Handles rapid price changes
- ✅ Updates throttled appropriately (max 1/sec)
- ✅ Latest price always displayed
- ✅ No UI flickering or performance issues

---

### Scenario 10: WebSocket Connection States

**Connection Flow:**
1. **Disconnected** → Show offline indicator
2. **Connecting** → Show connecting status
3. **Connected** → Show online indicator
4. **Authenticated** → Begin receiving data
5. **Listening** → Active market data streaming

**Verification Points:**
- ✅ Connection status visible to user
- ✅ Graceful handling of disconnections
- ✅ Automatic reconnection attempts
- ✅ Data updates resume after reconnection

---

## Empty State and Position Closure

### Scenario 11: Empty Portfolio

**Initial State:**
- No positions

**Expected Display:**
```
┌─────────────────────────────────────┐
│                                     │
│         No positions found          │
│                                     │
│  Start trading to see your          │
│  portfolio here                     │
│                                     │
│         [Start Trading]             │
│                                     │
└─────────────────────────────────────┘
```

**Verification Points:**
- ✅ Empty state message displayed
- ✅ Helpful subtext shown
- ✅ Call-to-action button present
- ✅ No error messages
- ✅ Clean, centered layout

---

### Scenario 12: Position Closure Flow

**Step 1 - Initial State:**
```
Positions: 2
- AAPL: 100 shares, +$500.00 P&L
- GOOGL: 50 shares, +$500.00 P&L
Total P&L: +$1,000.00
```

**Step 2 - Close AAPL Position:**
```
Positions: 1
- GOOGL: 50 shares, +$500.00 P&L
Total P&L: +$500.00
```

**Step 3 - Close GOOGL Position:**
```
Positions: 0
[Empty State Displayed]
```

**Verification Points:**
- ✅ Position removed from list immediately
- ✅ Portfolio totals recalculated
- ✅ Position count updated
- ✅ Smooth transition to empty state
- ✅ No orphaned data

---

### Scenario 13: Partial Position Closure

**Initial Position:**
```
Symbol: AAPL
Quantity: 100 shares
Cost Basis: $15,000.00
Market Value: $15,500.00
Unrealized P&L: +$500.00
```

**After Selling 50 Shares:**
```
Symbol: AAPL
Quantity: 50 shares
Cost Basis: $7,500.00
Market Value: $7,750.00
Unrealized P&L: +$250.00
```

**Verification Points:**
- ✅ Quantity reduced correctly
- ✅ Cost basis proportionally reduced
- ✅ Market value recalculated
- ✅ P&L remains proportional
- ✅ Position still displayed in list

---

## Test Execution Summary

### Test Files Created

1. **position-display.test.ts** (22 tests)
   - Stock position display
   - Cost basis calculations
   - Current value with live prices
   - Unrealized P&L calculations
   - P&L percentage accuracy
   - Display formatting
   - Portfolio aggregation

2. **options-position-display.test.ts** (24 tests)
   - Option-specific fields
   - Strike price display
   - Expiration date formatting
   - Option type display
   - Underlying symbol display
   - Option value calculations
   - Multiple option positions

3. **position-market-data-updates.test.ts** (20 tests)
   - WebSocket connection
   - Price update handling
   - P&L recalculation
   - Update frequency management
   - Multiple position updates
   - Error handling

4. **position-empty-state.test.ts** (19 tests)
   - Empty state display
   - Position closure
   - Position list refresh
   - State management
   - UI transitions

### Total Test Coverage

- **Total Tests:** 85 tests
- **All Tests Passing:** ✅
- **Coverage Areas:**
  - Stock positions ✅
  - Options positions ✅
  - Real-time updates ✅
  - Empty states ✅
  - Position closure ✅
  - P&L calculations ✅
  - Display formatting ✅

---

## Screenshots for Alpaca Review

### Required Screenshots

1. **Stock Position Display**
   - Multiple stock positions with mixed P&L
   - Shows symbol, quantity, prices, P&L
   - Portfolio summary visible

2. **Options Position Display**
   - Call and put options displayed
   - Strike price, expiration, underlying visible
   - Option-specific fields highlighted

3. **Real-Time Updates**
   - Before/after price update
   - Timestamp changes visible
   - P&L recalculation shown

4. **Empty State**
   - Clean empty state message
   - Call-to-action visible

5. **Position Closure**
   - Before: Multiple positions
   - After: Position removed
   - Portfolio totals updated

### Screenshot Checklist

- [ ] Desktop view - Stock positions
- [ ] Desktop view - Options positions
- [ ] Desktop view - Mixed portfolio
- [ ] Mobile view - Card layout
- [ ] Mobile view - Swipe actions
- [ ] Real-time price updates (video/GIF)
- [ ] Empty state
- [ ] Position closure flow
- [ ] WebSocket connection indicator
- [ ] Portfolio summary section

---

## Compliance Verification

### Alpaca Requirements Met

✅ **Position Display:**
- Accurate position data from Alpaca API
- Real-time price updates via WebSocket
- Correct P&L calculations
- Support for stocks and options

✅ **Data Accuracy:**
- Cost basis matches Alpaca data
- Market value calculated correctly
- P&L matches Alpaca calculations
- Timestamps accurate

✅ **User Experience:**
- Clear, readable display
- Real-time updates
- Responsive design
- Error handling

✅ **Technical Requirements:**
- WebSocket integration
- API data fetching
- State management
- Performance optimization

---

## Next Steps

1. ✅ All position display tests passing
2. ✅ Test scenarios documented
3. ✅ P&L calculations verified
4. ⏳ Capture screenshots for Alpaca review
5. ⏳ Submit for Alpaca compliance review

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-24  
**Status:** Complete - Ready for Alpaca Review
