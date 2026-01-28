/**
 * Test Script: Limit Sell Orders
 * 
 * This script tests limit sell order functionality for stocks,
 * ensuring compliance with Alpaca Limited Live Tech Requirement 4.2.
 * 
 * Requirements tested:
 * - 4.2: Stock limit sell orders with specific price
 * - Verify limit price included in submission
 * - Test order modification before fill
 * - Verify complete position closure
 * 
 * Usage:
 *   npx tsx scripts/test-limit-sell-orders.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY || '';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
  data?: any;
}

const results: TestResult[] = [];

function logResult(test: string, passed: boolean, details: string, data?: any) {
  results.push({ test, passed, details, data });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status}: ${test}`);
  console.log(`   ${details}`);
  if (data) {
    console.log(`   Data:`, JSON.stringify(data, null, 2));
  }
}

async function authenticateUser(): Promise<string | null> {
  console.log('\n🔐 Authenticating user...');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error || !data.session) {
    logResult('Authentication', false, `Failed to authenticate: ${error?.message}`);
    return null;
  }

  logResult('Authentication', true, 'User authenticated successfully');
  return data.session.access_token;
}

async function getPositions(token: string): Promise<any[]> {
  console.log('\n📊 Fetching current positions...');
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/alpaca-positions`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logResult('Get Positions', false, `Failed to fetch positions: ${error}`);
    return [];
  }

  const result = await response.json();
  
  if (result.success && Array.isArray(result.data)) {
    logResult('Get Positions', true, `Found ${result.data.length} positions`, result.data);
    return result.data;
  }

  logResult('Get Positions', false, 'Invalid response format');
  return [];
}

async function placeLimitSellOrder(
  token: string,
  symbol: string,
  qty: number,
  limitPrice: number
): Promise<any> {
  console.log(`\n📤 Placing limit sell order: ${qty} shares of ${symbol} at $${limitPrice}...`);
  
  const orderData = {
    symbol,
    qty,
    side: 'sell',
    type: 'limit',
    time_in_force: 'day',
    limit_price: limitPrice,
    trade_type: 'stock',
  };

  const response = await fetch(`${SUPABASE_URL}/functions/v1/alpaca-orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  const result = await response.json();

  if (result.success && result.data) {
    logResult(
      'Place Limit Sell Order',
      true,
      `Order placed successfully. Order ID: ${result.data.id}, Status: ${result.data.status}`,
      result.data
    );
    return result.data;
  }

  logResult('Place Limit Sell Order', false, `Failed to place order: ${result.error}`, result);
  return null;
}

async function getOrderDetails(token: string, orderId: string): Promise<any> {
  console.log(`\n🔍 Fetching order details for ${orderId}...`);
  
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/alpaca-orders?orderId=${orderId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    logResult('Get Order Details', false, `Failed to fetch order: ${error}`);
    return null;
  }

  const result = await response.json();
  
  if (result.success && result.data) {
    logResult('Get Order Details', true, `Order status: ${result.data.status}`, result.data);
    return result.data;
  }

  logResult('Get Order Details', false, 'Invalid response format');
  return null;
}

async function cancelOrder(token: string, orderId: string): Promise<boolean> {
  console.log(`\n🚫 Cancelling order ${orderId}...`);
  
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/alpaca-orders?orderId=${orderId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const result = await response.json();

  if (result.success) {
    logResult('Cancel Order', true, `Order ${orderId} cancelled successfully`);
    return true;
  }

  logResult('Cancel Order', false, `Failed to cancel order: ${result.error}`);
  return false;
}

async function verifyLimitPriceInSubmission(orderData: any, expectedLimitPrice: number): Promise<boolean> {
  console.log('\n✅ Verifying limit price in order submission...');
  
  if (!orderData) {
    logResult('Verify Limit Price', false, 'No order data provided');
    return false;
  }

  const hasLimitPrice = orderData.limit_price !== undefined;
  const correctLimitPrice = orderData.limit_price === expectedLimitPrice.toString() || 
                           orderData.limit_price === expectedLimitPrice;
  const isLimitType = orderData.type === 'limit';

  if (hasLimitPrice && correctLimitPrice && isLimitType) {
    logResult(
      'Verify Limit Price',
      true,
      `Limit price ${orderData.limit_price} correctly included in submission`,
      { limit_price: orderData.limit_price, type: orderData.type }
    );
    return true;
  }

  logResult(
    'Verify Limit Price',
    false,
    `Limit price verification failed. Has limit_price: ${hasLimitPrice}, Correct value: ${correctLimitPrice}, Is limit type: ${isLimitType}`,
    orderData
  );
  return false;
}

async function testOrderModification(token: string, symbol: string, qty: number): Promise<boolean> {
  console.log('\n🔄 Testing order modification (cancel and replace)...');
  
  // Place initial order
  const initialPrice = 200.00;
  const initialOrder = await placeLimitSellOrder(token, symbol, qty, initialPrice);
  
  if (!initialOrder) {
    logResult('Order Modification', false, 'Failed to place initial order');
    return false;
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Cancel the order
  const cancelled = await cancelOrder(token, initialOrder.id);
  
  if (!cancelled) {
    logResult('Order Modification', false, 'Failed to cancel initial order');
    return false;
  }

  // Place new order with different limit price
  const newPrice = 205.00;
  const newOrder = await placeLimitSellOrder(token, symbol, qty, newPrice);
  
  if (!newOrder) {
    logResult('Order Modification', false, 'Failed to place replacement order');
    return false;
  }

  // Verify new order has different price
  if (parseFloat(newOrder.limit_price) === newPrice) {
    logResult(
      'Order Modification',
      true,
      `Successfully modified order from $${initialPrice} to $${newPrice}`,
      { initial_order_id: initialOrder.id, new_order_id: newOrder.id }
    );
    
    // Clean up - cancel the new order
    await cancelOrder(token, newOrder.id);
    return true;
  }

  logResult('Order Modification', false, 'New order does not have expected limit price');
  return false;
}

async function testCompletePositionClosure(token: string): Promise<boolean> {
  console.log('\n🎯 Testing complete position closure with limit order...');
  
  // Get current positions
  const positions = await getPositions(token);
  
  if (positions.length === 0) {
    logResult('Complete Position Closure', false, 'No positions available to test closure');
    return false;
  }

  // Find a position with small quantity for testing
  const testPosition = positions.find(p => parseFloat(p.qty) <= 10 && parseFloat(p.qty) > 0);
  
  if (!testPosition) {
    logResult(
      'Complete Position Closure',
      false,
      'No suitable position found (need position with qty <= 10)'
    );
    return false;
  }

  const symbol = testPosition.symbol;
  const qty = parseFloat(testPosition.qty);
  const currentPrice = parseFloat(testPosition.current_price);
  
  // Place limit sell order for entire position at price above market
  const limitPrice = currentPrice * 1.10; // 10% above current price
  
  console.log(`   Attempting to close entire position: ${qty} shares of ${symbol} at $${limitPrice.toFixed(2)}`);
  
  const order = await placeLimitSellOrder(token, symbol, qty, parseFloat(limitPrice.toFixed(2)));
  
  if (!order) {
    logResult('Complete Position Closure', false, 'Failed to place closure order');
    return false;
  }

  // Verify order quantity matches position quantity
  const orderQty = parseFloat(order.qty);
  if (orderQty === qty) {
    logResult(
      'Complete Position Closure',
      true,
      `Limit sell order placed to close entire position of ${qty} shares at $${limitPrice.toFixed(2)}`,
      {
        symbol,
        position_qty: qty,
        order_qty: orderQty,
        limit_price: order.limit_price,
        order_id: order.id,
        note: 'Order will fill when market price reaches limit price'
      }
    );
    
    // Clean up - cancel the order since we don't want it to actually fill
    await cancelOrder(token, order.id);
    return true;
  }

  logResult(
    'Complete Position Closure',
    false,
    `Order quantity (${orderQty}) does not match position quantity (${qty})`
  );
  
  // Clean up
  await cancelOrder(token, order.id);
  return false;
}

async function runTests() {
  console.log('🚀 Starting Limit Sell Orders Test Suite');
  console.log('==========================================\n');

  // Authenticate
  const token = await authenticateUser();
  if (!token) {
    console.error('\n❌ Authentication failed. Cannot proceed with tests.');
    return;
  }

  // Get positions to find a suitable stock for testing
  const positions = await getPositions(token);
  
  if (positions.length === 0) {
    console.error('\n❌ No positions found. Please buy some stock first to test sell orders.');
    return;
  }

  // Find a position with sufficient quantity for testing
  const testPosition = positions.find(p => parseFloat(p.qty) >= 5);
  
  if (!testPosition) {
    console.error('\n❌ No position with sufficient quantity (>= 5 shares) found for testing.');
    return;
  }

  const symbol = testPosition.symbol;
  const availableQty = parseFloat(testPosition.qty_available || testPosition.qty);
  const currentPrice = parseFloat(testPosition.current_price);
  
  console.log(`\n📈 Using position: ${symbol}`);
  console.log(`   Available quantity: ${availableQty}`);
  console.log(`   Current price: $${currentPrice.toFixed(2)}`);

  // Test 1: Place limit sell order with specific price
  const testQty = Math.min(5, Math.floor(availableQty / 2)); // Use half or 5 shares, whichever is smaller
  const limitPrice = parseFloat((currentPrice * 1.05).toFixed(2)); // 5% above current price
  
  const order = await placeLimitSellOrder(token, symbol, testQty, limitPrice);

  if (order) {
    // Test 2: Verify limit price included in submission
    await verifyLimitPriceInSubmission(order, limitPrice);

    // Test 3: Get order details to verify it's in the system
    await new Promise(resolve => setTimeout(resolve, 1000));
    await getOrderDetails(token, order.id);

    // Clean up - cancel the test order
    await cancelOrder(token, order.id);
  }

  // Test 4: Test order modification (cancel and replace)
  await testOrderModification(token, symbol, testQty);

  // Test 5: Test complete position closure
  await testCompletePositionClosure(token);

  // Print summary
  console.log('\n\n📊 Test Summary');
  console.log('==========================================');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.details}`);
  });

  console.log('\n==========================================');
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Limit sell order functionality is working correctly.');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please review the results above.`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('\n💥 Fatal error running tests:', error);
  process.exit(1);
});
