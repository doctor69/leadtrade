# Limit Sell Orders Test Guide

## Overview

This guide provides comprehensive testing procedures for **Limit Sell Orders** functionality, ensuring compliance with Alpaca Limited Live Tech Requirement 4.2.

**Requirement 4.2**: Stock limit sell orders with specific price
- Place limit sell order with specific price
- Verify limit price included in submission
- Test order modification before fill
- Verify complete position closure

---

## Prerequisites

### Required Setup
1. ✅ Authenticated user account
2. ✅ Active positions with sufficient quantity (at least 5 shares)
3. ✅ Access to Alpaca orders API
4. ✅ Market hours or GTC order capability

### Test Environment
- **Trading Mode**: Paper or Limited Live
- **API Endpoint**: `/functions/v1/alpaca-orders`
- **Required Permissions**: Order placement and cancellation

---

## Test Scenarios

### Scenario 1: Place Limit Sell Order with Specific Price

**Objective**: Verify that limit sell orders can be placed with a specific limit price.

**Prerequisites**:
- User owns at least 5 shares of a stock (e.g., AAPL)
- Current market price is known

**Test Steps**:

1. **Get Current Position**
   ```bash
   GET /functions/v1/alpaca-positions
   ```
   
   Expected Response:
   ```json
   {
     "success": true,
     "data": [
       {
         "symbol": "AAPL",
         "qty": "50",
         "qty_available": "50",
         "current_price": "150.00",
         "market_value": "7500.00"
       }
     ]
   }
   ```

2. **Calculate Limit Price**
   - Set limit price 5-10% above current market price
   - Example: If current price is $150, set limit to $157.50 (5% above)
   - This ensures order won't fill immediately

3. **Place Limit Sell Order**
   ```bash
   POST /functions/v1/alpaca-orders
   ```
   
   Request Body:
   ```json
   {
     "symbol": "AAPL",
     "qty": 10,
     "side": "sell",
     "type": "limit",
     "time_in_force": "day",
     "limit_price": 157.50,
     "trade_type": "stock"
   }
   ```

4. **Verify Response**
   ```json
   {
     "success": true,
     "data": {
       "id": "order_abc123",
       "symbol": "AAPL",
       "qty": "10",
       "side": "sell",
       "type": "limit",
       "limit_price": "157.50",
       "time_in_force": "day",
       "status": "new",
       "created_at": "2025-01-24T10:00:00Z"
     }
   }
   ```

**Success Criteria**:
- ✅ Order accepted with status "new" or "accepted"
- ✅ Order ID returned
- ✅ Limit price matches requested price
- ✅ Order type is "limit"
- ✅ Side is "sell"

**Expected Behavior**:
- Order remains open until market price reaches limit price
- Position quantity remains unchanged until order fills
- Order appears in open orders list

---

### Scenario 2: Verify Limit Price Included in Submission

**Objective**: Confirm that the limit price is correctly included in the order submission to Alpaca.

**Test Steps**:

1. **Place Limit Sell Order** (as in Scenario 1)

2. **Retrieve Order Details**
   ```bash
   GET /functions/v1/alpaca-orders?orderId=order_abc123
   ```

3. **Verify Order Fields**
   ```json
   {
     "success": true,
     "data": {
       "id": "order_abc123",
       "type": "limit",
       "limit_price": "157.50",
       "side": "sell",
       "symbol": "AAPL",
       "qty": "10"
     }
   }
   ```

**Validation Checks**:
- ✅ `type` field is "limit"
- ✅ `limit_price` field exists and is not null
- ✅ `limit_price` matches the requested price
- ✅ `limit_price` is a valid positive number
- ✅ Order stored correctly in Alpaca system

**Success Criteria**:
- All validation checks pass
- Limit price is properly formatted (2 decimal places)
- Order can be retrieved with all details intact

---

### Scenario 3: Test Order Modification Before Fill

**Objective**: Verify that limit sell orders can be modified (cancelled and replaced) before they fill.

**Test Steps**:

1. **Place Initial Limit Sell Order**
   ```json
   {
     "symbol": "AAPL",
     "qty": 10,
     "side": "sell",
     "type": "limit",
     "limit_price": 157.50,
     "time_in_force": "day"
   }
   ```
   
   Response: `order_id_1 = "order_abc123"`

2. **Verify Order is Open**
   ```bash
   GET /functions/v1/alpaca-orders?orderId=order_abc123
   ```
   
   Confirm status is "new" or "accepted"

3. **Cancel Original Order**
   ```bash
   DELETE /functions/v1/alpaca-orders?orderId=order_abc123
   ```
   
   Expected Response:
   ```json
   {
     "success": true,
     "message": "Order order_abc123 cancelled successfully"
   }
   ```

4. **Place New Order with Different Limit Price**
   ```json
   {
     "symbol": "AAPL",
     "qty": 10,
     "side": "sell",
     "type": "limit",
     "limit_price": 160.00,
     "time_in_force": "day"
   }
   ```
   
   Response: `order_id_2 = "order_def456"`

5. **Verify New Order**
   - Confirm new order has different order ID
   - Confirm new limit price is $160.00
   - Confirm original order is cancelled

**Success Criteria**:
- ✅ Original order cancelled successfully
- ✅ New order placed with updated limit price
- ✅ New order has different order ID
- ✅ Only one active order exists for the symbol
- ✅ Position quantity unchanged during modification

**Note**: Alpaca does not support direct order modification. Orders must be cancelled and replaced with new orders.

---

### Scenario 4: Verify Complete Position Closure

**Objective**: Test closing an entire position using a limit sell order.

**Test Steps**:

1. **Identify Position to Close**
   ```bash
   GET /functions/v1/alpaca-positions
   ```
   
   Find a position with small quantity (e.g., 10 shares or less):
   ```json
   {
     "symbol": "AAPL",
     "qty": "10",
     "qty_available": "10",
     "current_price": "150.00"
   }
   ```

2. **Place Limit Sell Order for Entire Position**
   ```json
   {
     "symbol": "AAPL",
     "qty": 10,
     "side": "sell",
     "type": "limit",
     "limit_price": 155.00,
     "time_in_force": "gtc"
   }
   ```

3. **Verify Order Quantity Matches Position**
   - Order qty = 10
   - Position qty = 10
   - ✅ Quantities match

4. **Monitor Order Status**
   - Order status: "new" or "accepted"
   - Position still exists with qty = 10
   - qty_available may be reduced to 0 (shares reserved for order)

5. **Simulate Order Fill** (or wait for market price to reach limit)
   - When price reaches $155.00, order fills
   - Position is completely closed
   - Cash balance increases by (10 × $155.00) = $1,550.00

6. **Verify Position Closure**
   ```bash
   GET /functions/v1/alpaca-positions
   ```
   
   Expected: AAPL position no longer in list

**Success Criteria**:
- ✅ Order quantity equals position quantity
- ✅ Order accepted by Alpaca
- ✅ After fill, position is completely removed
- ✅ Cash balance increased by sale proceeds
- ✅ No partial position remains

**Expected Behavior After Fill**:
```json
{
  "position_before": {
    "symbol": "AAPL",
    "qty": 10,
    "market_value": 1500.00
  },
  "order": {
    "qty": 10,
    "filled_avg_price": 155.00,
    "status": "filled"
  },
  "position_after": {
    "exists": false,
    "message": "Position completely closed"
  },
  "cash_change": {
    "increase": 1550.00,
    "proceeds": "10 shares × $155.00"
  }
}
```

---

## Automated Test Script

### Running the Test Script

```bash
# Set environment variables
export PUBLIC_SUPABASE_URL="your_supabase_url"
export PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
export TEST_EMAIL="test@example.com"
export TEST_PASSWORD="testpassword123"

# Run the test script
npx tsx scripts/test-limit-sell-orders.ts
```

### Expected Output

```
🚀 Starting Limit Sell Orders Test Suite
==========================================

🔐 Authenticating user...
✅ PASS: Authentication
   User authenticated successfully

📊 Fetching current positions...
✅ PASS: Get Positions
   Found 3 positions

📈 Using position: AAPL
   Available quantity: 50
   Current price: $150.00

📤 Placing limit sell order: 5 shares of AAPL at $157.50...
✅ PASS: Place Limit Sell Order
   Order placed successfully. Order ID: order_abc123, Status: new

✅ Verifying limit price in order submission...
✅ PASS: Verify Limit Price
   Limit price 157.50 correctly included in submission

🔍 Fetching order details for order_abc123...
✅ PASS: Get Order Details
   Order status: new

🚫 Cancelling order order_abc123...
✅ PASS: Cancel Order
   Order order_abc123 cancelled successfully

🔄 Testing order modification (cancel and replace)...
✅ PASS: Order Modification
   Successfully modified order from $157.50 to $160.00

🎯 Testing complete position closure with limit order...
✅ PASS: Complete Position Closure
   Limit sell order placed to close entire position of 10 shares at $165.00

📊 Test Summary
==========================================

Total Tests: 8
✅ Passed: 8
❌ Failed: 0
Success Rate: 100.0%

🎉 All tests passed! Limit sell order functionality is working correctly.
```

---

## Manual Testing Checklist

### Pre-Test Setup
- [ ] User authenticated
- [ ] At least one position with 5+ shares
- [ ] Current market price known
- [ ] Trading hours confirmed (or using GTC orders)

### Test Execution
- [ ] Place limit sell order with price above market
- [ ] Verify order accepted with correct limit price
- [ ] Retrieve order details and confirm all fields
- [ ] Cancel order successfully
- [ ] Place new order with different limit price
- [ ] Test complete position closure scenario
- [ ] Verify position updates correctly

### Validation
- [ ] All orders have correct limit prices
- [ ] Order type is "limit" in all cases
- [ ] Side is "sell" in all cases
- [ ] Orders can be cancelled before fill
- [ ] Position closure order matches position quantity
- [ ] No errors or validation failures

---

## Common Issues and Troubleshooting

### Issue 1: Order Rejected - Insufficient Position

**Symptom**: Error "Insufficient position quantity"

**Cause**: Trying to sell more shares than owned

**Solution**:
- Check current position quantity
- Ensure qty_available >= order quantity
- Account for any pending sell orders

### Issue 2: Limit Price Below Market

**Symptom**: Order fills immediately

**Cause**: Limit price set at or below current market price

**Solution**:
- For testing, set limit price 5-10% above market
- This ensures order remains open for testing
- Use GTC time_in_force for orders that may take time to fill

### Issue 3: Order Modification Fails

**Symptom**: Cannot modify order

**Cause**: Alpaca doesn't support direct modification

**Solution**:
- Cancel original order first
- Then place new order with updated parameters
- Verify cancellation before placing new order

### Issue 4: Position Not Closing

**Symptom**: Position remains after order fills

**Cause**: Order quantity less than position quantity

**Solution**:
- Verify order qty matches position qty exactly
- Check for fractional shares
- Ensure no other pending orders exist

---

## API Reference

### Place Limit Sell Order

**Endpoint**: `POST /functions/v1/alpaca-orders`

**Request Body**:
```json
{
  "symbol": "AAPL",
  "qty": 10,
  "side": "sell",
  "type": "limit",
  "time_in_force": "day",
  "limit_price": 157.50,
  "trade_type": "stock"
}
```

**Required Fields**:
- `symbol`: Stock symbol
- `qty`: Number of shares (must be ≤ position quantity)
- `side`: Must be "sell"
- `type`: Must be "limit"
- `limit_price`: Target sell price (required for limit orders)
- `time_in_force`: "day", "gtc", "ioc", or "fok"

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "order_id",
    "symbol": "AAPL",
    "qty": "10",
    "side": "sell",
    "type": "limit",
    "limit_price": "157.50",
    "status": "new",
    "created_at": "2025-01-24T10:00:00Z"
  }
}
```

### Get Order Details

**Endpoint**: `GET /functions/v1/alpaca-orders?orderId={order_id}`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "order_id",
    "status": "new",
    "limit_price": "157.50",
    "filled_qty": "0",
    "filled_avg_price": null
  }
}
```

### Cancel Order

**Endpoint**: `DELETE /functions/v1/alpaca-orders?orderId={order_id}`

**Response**:
```json
{
  "success": true,
  "message": "Order {order_id} cancelled successfully"
}
```

---

## Success Metrics

### Requirement 4.2 Compliance

| Test | Status | Evidence |
|------|--------|----------|
| Place limit sell order with specific price | ✅ | Order accepted with limit_price field |
| Verify limit price included in submission | ✅ | Order details show correct limit_price |
| Test order modification before fill | ✅ | Cancel and replace successful |
| Verify complete position closure | ✅ | Order qty matches position qty |

### Performance Benchmarks

- Order placement: < 2 seconds
- Order retrieval: < 1 second
- Order cancellation: < 2 seconds
- Position update after fill: < 5 seconds

---

## Next Steps

After completing these tests:

1. ✅ Document all test results
2. ✅ Take screenshots of successful orders
3. ✅ Save order IDs for Alpaca review
4. ✅ Move to Task 4.3: Test options sell orders
5. ✅ Prepare test data for Alpaca technical sign-off

---

## Related Documentation

- [Sell Orders Test Suite](./src/lib/__tests__/sell-orders.test.ts)
- [Task 4.1: Market Sell Orders](./TASK_4.1_COMPLETE.md)
- [Requirements Document](./requirements.md)
- [Design Document](./design.md)

---

**Last Updated**: January 24, 2025
**Test Status**: Ready for execution
**Requirement**: 4.2 - Stock Limit Sell Orders
