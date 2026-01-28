# Limit Buy Orders Test Guide

## Overview

This guide provides comprehensive testing procedures for stock limit buy orders to verify compliance with Alpaca Limited Live Tech Requirements 3.2 and 3.4.

## Requirements Tested

- **3.2**: Place limit buy order with specific price
- **3.2**: Verify limit price included in submission
- **3.2**: Test order cancellation before fill
- **3.2**: Verify partial fill handling
- **3.4**: Verify order submission to Alpaca

## Test Environment Setup

### Prerequisites

1. Active Alpaca account (paper or limited live)
2. Sufficient buying power for test orders
3. Browser with developer console access
4. Logged into LeadTrade application

### Test Configuration

```typescript
const TEST_CONFIG = {
  symbol: 'AAPL',           // Liquid stock for testing
  quantity: 1,              // Small quantity for testing
  limitPriceOffset: -0.50,  // $0.50 below market to avoid immediate fill
};
```

## Manual Testing Procedures

### Method 1: Browser Console Testing

1. Navigate to the Trade page (`/trade`)
2. Open browser developer console (F12)
3. Copy and paste the test script from `scripts/test-limit-buy-orders.ts`
4. Run the test suite:

```javascript
// Run all tests
await limitBuyOrderTests.runAllTests();

// Or run individual tests
await limitBuyOrderTests.test1_PlaceLimitBuyOrder();
await limitBuyOrderTests.test2_VerifyLimitPrice();
await limitBuyOrderTests.test3_VerifyOrderHistory();
await limitBuyOrderTests.test4_CancelOrder();
await limitBuyOrderTests.test5_ValidateLimitPriceRequired();
```

### Method 2: UI Testing

#### Test 1: Place Limit Buy Order

1. Navigate to Trade page
2. Select a stock (e.g., AAPL)
3. Set order parameters:
   - Side: **Buy**
   - Order Type: **Limit Order**
   - Quantity: **1**
   - Limit Price: Set $0.50 below current market price
4. Click "Buy AAPL"
5. **Verify**:
   - Order submission success message appears
   - Order ID is displayed
   - Order appears in order history immediately

**Expected Result**: ✅ Order placed successfully with status "new" or "accepted"

#### Test 2: Verify Limit Price in Order

1. After placing order, navigate to order history
2. Find the test order
3. Click to view order details
4. **Verify**:
   - Order type shows "limit"
   - Limit price matches the price you entered
   - Limit price is displayed in order details

**Expected Result**: ✅ Limit price is present and correct in order details

#### Test 3: Verify Order in History

1. Navigate to order history or dashboard
2. Filter orders by status: "All" or "Open"
3. **Verify**:
   - Test order appears in the list
   - Order details are correct (symbol, quantity, limit price)
   - Order status is displayed
   - Timestamp is accurate

**Expected Result**: ✅ Order appears in history with all correct details

#### Test 4: Cancel Order Before Fill

1. Locate the open limit order in order history
2. Click "Cancel" button
3. Confirm cancellation
4. **Verify**:
   - Cancellation success message appears
   - Order status changes to "canceled"
   - Canceled timestamp is set
   - Order no longer appears in "Open Orders"

**Expected Result**: ✅ Order successfully canceled before fill

#### Test 5: Validate Limit Price Required

1. Navigate to Trade page
2. Select a stock
3. Set order parameters:
   - Side: Buy
   - Order Type: **Limit Order**
   - Quantity: 1
   - **Leave Limit Price empty**
4. Attempt to submit order
5. **Verify**:
   - Form validation prevents submission, OR
   - API returns error about missing limit price
   - Error message is clear and helpful

**Expected Result**: ✅ Order rejected with appropriate error message

## Automated Testing

### Run Unit Tests

```bash
npm run test -- src/lib/__tests__/limit-buy-orders.test.ts --run
```

The unit tests document expected behavior and validate data structures.

## Test Scenarios

### Scenario 1: Successful Limit Buy Order Flow

```
1. Get current market price for AAPL: $150.00
2. Place limit buy order:
   - Symbol: AAPL
   - Quantity: 1
   - Side: buy
   - Type: limit
   - Limit Price: $149.50 (below market)
   - Time in Force: day

3. Expected Response:
   {
     "success": true,
     "data": {
       "id": "order_abc123",
       "symbol": "AAPL",
       "qty": 1,
       "side": "buy",
       "type": "limit",
       "limit_price": 149.50,
       "time_in_force": "day",
       "status": "new"
     }
   }

4. Verify order in history
5. Cancel order
6. Verify status = "canceled"
```

### Scenario 2: Partial Fill Handling

**Note**: Partial fills are difficult to test automatically. Use this manual procedure:

1. Place a large limit order (100+ shares) for a less liquid stock
2. Set limit price near but not exactly at market price
3. Monitor order status via order history
4. Observe as partial fills occur:
   - `filled_qty` increases incrementally
   - `status` changes to "partially_filled"
   - `filled_avg_price` is calculated
5. Verify you can cancel a partially filled order
6. Confirm filled portion remains, unfilled portion is canceled

**Expected Behavior**:
- Order status: "partially_filled"
- `filled_qty` < `qty`
- `filled_avg_price` is defined
- Can cancel remaining quantity
- Filled quantity settles normally

### Scenario 3: Time-in-Force Options

Test each time-in-force option:

#### DAY Order
```javascript
{
  symbol: 'AAPL',
  qty: 1,
  side: 'buy',
  type: 'limit',
  limit_price: 149.50,
  time_in_force: 'day'
}
```
**Expected**: Automatically canceled at market close if not filled

#### GTC (Good-Til-Canceled)
```javascript
{
  symbol: 'AAPL',
  qty: 1,
  side: 'buy',
  type: 'limit',
  limit_price: 145.00,
  time_in_force: 'gtc'
}
```
**Expected**: Remains active across multiple trading days

#### IOC (Immediate-or-Cancel)
```javascript
{
  symbol: 'AAPL',
  qty: 10,
  side: 'buy',
  type: 'limit',
  limit_price: 150.50,
  time_in_force: 'ioc'
}
```
**Expected**: Fills immediately or cancels unfilled portion

#### FOK (Fill-or-Kill)
```javascript
{
  symbol: 'AAPL',
  qty: 100,
  side: 'buy',
  type: 'limit',
  limit_price: 150.00,
  time_in_force: 'fok'
}
```
**Expected**: Fills entire order immediately or cancels completely

## Edge Cases

### Edge Case 1: Limit Price Equals Market Price

```javascript
// Market price: $150.00
{
  symbol: 'AAPL',
  qty: 1,
  side: 'buy',
  type: 'limit',
  limit_price: 150.00  // Same as market
}
```

**Expected**: May fill immediately like a market order, or wait for better price

### Edge Case 2: Limit Price Far Below Market

```javascript
// Market price: $150.00
{
  symbol: 'AAPL',
  qty: 1,
  side: 'buy',
  type: 'limit',
  limit_price: 140.00  // $10 below market
}
```

**Expected**: Order stays open, unlikely to fill unless market drops significantly

### Edge Case 3: Invalid Limit Prices

Test validation for:
- Zero: `limit_price: 0` → Should reject
- Negative: `limit_price: -1` → Should reject
- Missing: No `limit_price` field → Should reject

## Verification Checklist

Use this checklist when testing for Alpaca review:

- [ ] Limit buy order places successfully
- [ ] Order ID is returned immediately
- [ ] Limit price is included in order submission
- [ ] Limit price is visible in order details
- [ ] Order appears in order history
- [ ] Order status is accurate
- [ ] Order can be canceled before fill
- [ ] Canceled orders show correct status
- [ ] Validation rejects orders without limit price
- [ ] Error messages are clear and helpful
- [ ] All time-in-force options work correctly
- [ ] Partial fills are handled correctly (if testable)
- [ ] Order timestamps are accurate

## Test Results Documentation

### Test Execution Log Template

```markdown
## Limit Buy Order Test Results

**Date**: 2025-01-24
**Tester**: [Your Name]
**Environment**: Paper Trading / Limited Live
**Account ID**: [Alpaca Account ID]

### Test 1: Place Limit Buy Order
- Status: ✅ PASSED / ❌ FAILED
- Order ID: order_abc123
- Symbol: AAPL
- Limit Price: $149.50
- Notes: Order placed successfully, received order ID immediately

### Test 2: Verify Limit Price
- Status: ✅ PASSED / ❌ FAILED
- Limit Price in Response: $149.50
- Notes: Limit price correctly included in order details

### Test 3: Order History
- Status: ✅ PASSED / ❌ FAILED
- Found in History: Yes
- Notes: Order appears in history with correct details

### Test 4: Cancel Order
- Status: ✅ PASSED / ❌ FAILED
- Cancellation Time: 2025-01-24T10:30:00Z
- Notes: Order canceled successfully before fill

### Test 5: Validation
- Status: ✅ PASSED / ❌ FAILED
- Error Message: "Limit price required for limit orders"
- Notes: Validation correctly rejects invalid orders

### Summary
- Total Tests: 5
- Passed: 5
- Failed: 0
- Overall Status: ✅ ALL TESTS PASSED
```

## Troubleshooting

### Issue: Order Fills Immediately

**Cause**: Limit price is at or above market price

**Solution**: Set limit price further below market price (e.g., $1-2 below)

### Issue: Cannot Cancel Order

**Cause**: Order already filled or in process of filling

**Solution**: Check order status first, may already be filled

### Issue: Validation Not Working

**Cause**: Client-side validation may be bypassed

**Solution**: Verify server-side validation in Edge Function response

### Issue: Order Not Appearing in History

**Cause**: Cache delay or filter settings

**Solution**: 
- Refresh the page
- Check filter settings (show "All" orders)
- Wait a few seconds for order to propagate

## API Endpoints Used

### Place Order
```
POST /api/alpaca/orders
Content-Type: application/json

{
  "symbol": "AAPL",
  "qty": 1,
  "side": "buy",
  "type": "limit",
  "limit_price": 149.50,
  "time_in_force": "day",
  "trade_type": "stock"
}
```

### Get Order Details
```
GET /api/alpaca/orders?orderId={order_id}
```

### Get Order History
```
GET /api/alpaca/orders?status=all&limit=50
```

### Cancel Order
```
DELETE /api/alpaca/orders?orderId={order_id}
```

## Success Criteria

For Alpaca tech sign-off, all of the following must be verified:

1. ✅ Limit buy orders can be placed successfully
2. ✅ Limit price is required and validated
3. ✅ Limit price is included in all order responses
4. ✅ Orders appear in order history immediately
5. ✅ Orders can be canceled before fill
6. ✅ Order status updates correctly
7. ✅ All time-in-force options work
8. ✅ Error handling is appropriate
9. ✅ API responses match Alpaca's format
10. ✅ No orphaned or stuck orders

## Next Steps

After completing limit buy order testing:

1. Document all test results
2. Take screenshots of successful tests
3. Save test order IDs for Alpaca review
4. Proceed to Task 3.3: Test Options Buy Orders
5. Update tasks.md with completion status

## References

- Alpaca Orders API: https://alpaca.markets/docs/api-references/broker-api/trading/orders/
- Requirements Document: `.kiro/specs/limited-live-tech-requirements/requirements.md`
- Design Document: `.kiro/specs/limited-live-tech-requirements/design.md`
- Task List: `.kiro/specs/limited-live-tech-requirements/tasks.md`
