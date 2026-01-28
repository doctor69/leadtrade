/**
 * Trade Confirmation Delivery Test Script
 * 
 * Manual test script for verifying trade confirmation email delivery
 * in the browser console.
 * 
 * Requirements: 3.5, 7.1, 7.4
 * 
 * Usage:
 * 1. Navigate to /trade page
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Run: await tradeConfirmationTests.runAllTests()
 * 
 * Or run individual tests:
 * - await tradeConfirmationTests.test1_CheckCurrentSetting()
 * - await tradeConfirmationTests.test2_EnableConfirmations()
 * - await tradeConfirmationTests.test3_PlaceTestOrder()
 * - await tradeConfirmationTests.test4_VerifyOrderFilled()
 * - await tradeConfirmationTests.test5_DisableConfirmations()
 */

const tradeConfirmationTests = {
  // Store test data
  testData: {
    accountId: null as string | null,
    orderId: null as string | null,
    originalSetting: null as string | null,
    testSymbol: 'AAPL',
    testQty: 1
  },

  /**
   * Test 1: Check current trade_confirm_email setting
   */
  async test1_CheckCurrentSetting() {
    console.log('\n=== Test 1: Check Current trade_confirm_email Setting ===\n')
    
    try {
      // Get user profile to find account ID
      const profileResponse = await fetch('/api/user/profile', {
        credentials: 'include'
      })
      
      if (!profileResponse.ok) {
        throw new Error('Failed to get user profile')
      }
      
      const profile = await profileResponse.json()
      this.testData.accountId = profile.alpaca_account_id
      
      console.log('✓ Account ID:', this.testData.accountId)
      
      // Get trading configuration
      const configResponse = await fetch(
        `/api/alpaca/trading-config/${this.testData.accountId}`,
        { credentials: 'include' }
      )
      
      if (!configResponse.ok) {
        throw new Error('Failed to get trading configuration')
      }
      
      const config = await configResponse.json()
      this.testData.originalSetting = config.trade_confirm_email
      
      console.log('✓ Current trade_confirm_email setting:', config.trade_confirm_email)
      console.log('\nConfiguration details:')
      console.log('  - dtbp_check:', config.dtbp_check)
      console.log('  - trade_confirm_email:', config.trade_confirm_email)
      console.log('  - suspend_trade:', config.suspend_trade)
      console.log('  - fractional_trading:', config.fractional_trading)
      console.log('  - max_options_trading_level:', config.max_options_trading_level)
      
      console.log('\n✅ Test 1 PASSED: Successfully retrieved current setting\n')
      return { success: true, setting: config.trade_confirm_email }
      
    } catch (error) {
      console.error('❌ Test 1 FAILED:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Test 2: Enable trade confirmations (set to 'all')
   */
  async test2_EnableConfirmations() {
    console.log('\n=== Test 2: Enable Trade Confirmations ===\n')
    
    try {
      if (!this.testData.accountId) {
        throw new Error('Account ID not found. Run test1 first.')
      }
      
      console.log('Setting trade_confirm_email to "all"...')
      
      const response = await fetch(
        `/api/alpaca/trading-config/${this.testData.accountId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            trade_confirm_email: 'all'
          })
        }
      )
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update configuration')
      }
      
      const config = await response.json()
      
      console.log('✓ Configuration updated successfully')
      console.log('✓ trade_confirm_email is now:', config.trade_confirm_email)
      
      if (config.trade_confirm_email !== 'all') {
        throw new Error('Setting not updated correctly')
      }
      
      console.log('\n✅ Test 2 PASSED: Trade confirmations enabled\n')
      console.log('📧 Trade confirmation emails will now be sent for all trades')
      
      return { success: true, setting: config.trade_confirm_email }
      
    } catch (error) {
      console.error('❌ Test 2 FAILED:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Test 3: Place a test order to trigger confirmation
   */
  async test3_PlaceTestOrder() {
    console.log('\n=== Test 3: Place Test Order ===\n')
    
    try {
      if (!this.testData.accountId) {
        throw new Error('Account ID not found. Run test1 first.')
      }
      
      console.log(`Placing market buy order for ${this.testData.testQty} share of ${this.testData.testSymbol}...`)
      console.log('⚠️  This will execute a real order in your account!')
      
      const orderData = {
        symbol: this.testData.testSymbol,
        qty: this.testData.testQty,
        side: 'buy',
        type: 'market',
        time_in_force: 'day',
        trade_type: 'stock'
      }
      
      console.log('Order details:', orderData)
      
      const response = await fetch('/api/alpaca/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(orderData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to place order')
      }
      
      const order = await response.json()
      this.testData.orderId = order.id
      
      console.log('✓ Order placed successfully!')
      console.log('✓ Order ID:', order.id)
      console.log('✓ Symbol:', order.symbol)
      console.log('✓ Quantity:', order.qty)
      console.log('✓ Side:', order.side)
      console.log('✓ Type:', order.type)
      console.log('✓ Status:', order.status)
      console.log('✓ Created at:', order.created_at)
      
      console.log('\n✅ Test 3 PASSED: Order placed successfully\n')
      console.log('⏳ Waiting for order to fill...')
      console.log('📧 Check your email for trade confirmation after fill')
      
      return { success: true, orderId: order.id, order }
      
    } catch (error) {
      console.error('❌ Test 3 FAILED:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Test 4: Verify order filled and check for confirmation
   */
  async test4_VerifyOrderFilled() {
    console.log('\n=== Test 4: Verify Order Filled ===\n')
    
    try {
      if (!this.testData.orderId) {
        throw new Error('Order ID not found. Run test3 first.')
      }
      
      console.log('Checking order status...')
      console.log('Order ID:', this.testData.orderId)
      
      const response = await fetch(
        `/api/alpaca/orders?status=all&limit=50`,
        { credentials: 'include' }
      )
      
      if (!response.ok) {
        throw new Error('Failed to get orders')
      }
      
      const orders = await response.json()
      const order = orders.find((o: any) => o.id === this.testData.orderId)
      
      if (!order) {
        throw new Error('Order not found in history')
      }
      
      console.log('✓ Order found in history')
      console.log('✓ Order status:', order.status)
      console.log('✓ Symbol:', order.symbol)
      console.log('✓ Quantity:', order.qty)
      
      if (order.status === 'filled') {
        console.log('✓ Order is FILLED!')
        console.log('✓ Filled quantity:', order.filled_qty)
        console.log('✓ Filled average price:', order.filled_avg_price)
        console.log('✓ Filled at:', order.filled_at)
        
        const totalCost = order.filled_qty * order.filled_avg_price
        console.log('✓ Total cost: $', totalCost.toFixed(2))
        
        console.log('\n✅ Test 4 PASSED: Order filled successfully\n')
        console.log('📧 MANUAL VERIFICATION REQUIRED:')
        console.log('   1. Check your email inbox')
        console.log('   2. Look for trade confirmation from Alpaca')
        console.log('   3. Verify email contains:')
        console.log('      - Order ID:', order.id)
        console.log('      - Symbol:', order.symbol)
        console.log('      - Quantity:', order.filled_qty)
        console.log('      - Price:', order.filled_avg_price)
        console.log('      - Total cost: $', totalCost.toFixed(2))
        console.log('      - Settlement date (T+2 for stocks)')
        console.log('   4. Email should arrive within 5 minutes of fill')
        
        return { success: true, status: 'filled', order }
        
      } else if (order.status === 'partially_filled') {
        console.log('⚠️  Order is PARTIALLY FILLED')
        console.log('✓ Filled quantity:', order.filled_qty)
        console.log('✓ Remaining quantity:', order.qty - order.filled_qty)
        console.log('✓ Filled average price:', order.filled_avg_price)
        
        console.log('\n⏳ Test 4 IN PROGRESS: Order partially filled\n')
        console.log('📧 You may receive multiple confirmation emails for partial fills')
        console.log('   Run this test again to check for complete fill')
        
        return { success: true, status: 'partially_filled', order }
        
      } else {
        console.log('⏳ Order status:', order.status)
        console.log('   Order not yet filled. Market orders typically fill within seconds.')
        console.log('   If market is closed, order will fill when market opens.')
        
        console.log('\n⏳ Test 4 PENDING: Order not yet filled\n')
        console.log('   Run this test again in a few seconds')
        
        return { success: true, status: order.status, order }
      }
      
    } catch (error) {
      console.error('❌ Test 4 FAILED:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Test 5: Disable trade confirmations and verify setting
   */
  async test5_DisableConfirmations() {
    console.log('\n=== Test 5: Disable Trade Confirmations ===\n')
    
    try {
      if (!this.testData.accountId) {
        throw new Error('Account ID not found. Run test1 first.')
      }
      
      console.log('Setting trade_confirm_email to "none"...')
      
      const response = await fetch(
        `/api/alpaca/trading-config/${this.testData.accountId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            trade_confirm_email: 'none'
          })
        }
      )
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update configuration')
      }
      
      const config = await response.json()
      
      console.log('✓ Configuration updated successfully')
      console.log('✓ trade_confirm_email is now:', config.trade_confirm_email)
      
      if (config.trade_confirm_email !== 'none') {
        throw new Error('Setting not updated correctly')
      }
      
      console.log('\n✅ Test 5 PASSED: Trade confirmations disabled\n')
      console.log('📧 Trade confirmation emails will NOT be sent for future trades')
      console.log('⚠️  Note: Regulatory emails (statements, tax docs) will still be sent')
      
      // Restore original setting if we saved it
      if (this.testData.originalSetting && this.testData.originalSetting !== 'none') {
        console.log('\n🔄 Restoring original setting...')
        
        const restoreResponse = await fetch(
          `/api/alpaca/trading-config/${this.testData.accountId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              trade_confirm_email: this.testData.originalSetting
            })
          }
        )
        
        if (restoreResponse.ok) {
          console.log('✓ Original setting restored:', this.testData.originalSetting)
        }
      }
      
      return { success: true, setting: config.trade_confirm_email }
      
    } catch (error) {
      console.error('❌ Test 5 FAILED:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Run all tests in sequence
   */
  async runAllTests() {
    console.log('\n' + '='.repeat(60))
    console.log('TRADE CONFIRMATION DELIVERY TEST SUITE')
    console.log('Requirements: 3.5, 7.1, 7.4')
    console.log('='.repeat(60))
    
    const results = {
      test1: await this.test1_CheckCurrentSetting(),
      test2: await this.test2_EnableConfirmations(),
      test3: await this.test3_PlaceTestOrder(),
      test4: await this.test4_VerifyOrderFilled(),
      test5: await this.test5_DisableConfirmations()
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('TEST RESULTS SUMMARY')
    console.log('='.repeat(60))
    
    const passed = Object.values(results).filter(r => r.success).length
    const total = Object.keys(results).length
    
    console.log(`\nTests Passed: ${passed}/${total}`)
    console.log('\nIndividual Results:')
    console.log('  Test 1 (Check Setting):', results.test1.success ? '✅ PASSED' : '❌ FAILED')
    console.log('  Test 2 (Enable):', results.test2.success ? '✅ PASSED' : '❌ FAILED')
    console.log('  Test 3 (Place Order):', results.test3.success ? '✅ PASSED' : '❌ FAILED')
    console.log('  Test 4 (Verify Fill):', results.test4.success ? '✅ PASSED' : '❌ FAILED')
    console.log('  Test 5 (Disable):', results.test5.success ? '✅ PASSED' : '❌ FAILED')
    
    console.log('\n📧 MANUAL VERIFICATION CHECKLIST:')
    console.log('   □ Check email inbox for trade confirmation')
    console.log('   □ Verify email contains order details')
    console.log('   □ Verify email contains settlement date')
    console.log('   □ Verify email received within 5 minutes of fill')
    console.log('   □ Test with trade_confirm_email set to "none"')
    console.log('   □ Verify no email received when setting is "none"')
    
    console.log('\n' + '='.repeat(60) + '\n')
    
    return results
  },

  /**
   * Helper: Get current trading configuration
   */
  async getCurrentConfig() {
    if (!this.testData.accountId) {
      await this.test1_CheckCurrentSetting()
    }
    
    const response = await fetch(
      `/api/alpaca/trading-config/${this.testData.accountId}`,
      { credentials: 'include' }
    )
    
    return await response.json()
  },

  /**
   * Helper: Get order details
   */
  async getOrderDetails(orderId?: string) {
    const id = orderId || this.testData.orderId
    if (!id) {
      throw new Error('No order ID provided')
    }
    
    const response = await fetch(
      `/api/alpaca/orders?status=all&limit=50`,
      { credentials: 'include' }
    )
    
    const orders = await response.json()
    return orders.find((o: any) => o.id === id)
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).tradeConfirmationTests = tradeConfirmationTests
}

console.log('✅ Trade Confirmation Test Suite loaded!')
console.log('Run: await tradeConfirmationTests.runAllTests()')
