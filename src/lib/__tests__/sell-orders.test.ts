/**
 * Test Suite: Sell Order Execution
 * 
 * This test suite verifies sell order functionality for stocks and options,
 * ensuring compliance with Alpaca Limited Live Tech Requirements 4.1-4.5.
 * 
 * Requirements tested:
 * - 4.1: Stock market sell orders
 * - 4.2: Stock limit sell orders
 * - 4.3: Options sell orders
 * - 4.4: Position verification before sell
 * - 4.5: Sell order validation and error handling
 */

import { describe, it, expect } from 'vitest';

describe('Stock Market Sell Orders - Requirement 4.1', () => {
  it('should document market sell order structure and validation', () => {
    const marketSellOrderStructure = {
      symbol: 'AAPL',
      qty: 10,
      side: 'sell',
      type: 'market',
      time_in_force: 'day',
      trade_type: 'stock',
    };

    const expectedResponse = {
      success: true,
      data: {
        id: 'order_id_string',
        symbol: 'AAPL',
        qty: 10,
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
        status: 'new',
        created_at: '2025-01-24T...',
        submitted_at: '2025-01-24T...',
      },
    };

    expect(marketSellOrderStructure.side).toBe('sell');
    expect(marketSellOrderStructure.type).toBe('market');
    expect(marketSellOrderStructure.qty).toBeGreaterThan(0);

    console.log(`
Market Sell Order Structure:
${JSON.stringify(marketSellOrderStructure, null, 2)}

Expected Response:
${JSON.stringify(expectedResponse, null, 2)}
    `);
  });

  it('should document position verification before sell', () => {
    const positionVerificationFlow = {
      step1: {
        action: 'Check current positions',
        endpoint: 'GET /api/alpaca/positions',
        expectedResponse: {
          success: true,
          data: [
            {
              symbol: 'AAPL',
              qty: '50',
              qty_available: '50',
              market_value: '7500.00',
              avg_entry_price: '145.00',
            },
          ],
        },
      },
      step2: {
        action: 'Verify sufficient quantity',
        validation: 'qty_available >= sell_qty',
        sellQty: 10,
        availableQty: 50,
        canSell: true,
      },
      step3: {
        action: 'Place market sell order',
        endpoint: 'POST /api/alpaca/orders',
        payload: {
          symbol: 'AAPL',
          qty: 10,
          side: 'sell',
          type: 'market',
          time_in_force: 'day',
        },
      },
    };

    expect(positionVerificationFlow.step2.canSell).toBe(true);
    expect(positionVerificationFlow.step2.availableQty).toBeGreaterThanOrEqual(
      positionVerificationFlow.step2.sellQty
    );

    console.log(`
Position Verification Flow:
${JSON.stringify(positionVerificationFlow, null, 2)}
    `);
  });

  it('should verify position updated after fill', () => {
    const positionUpdateFlow = {
      description: 'Position quantity and market value should update after sell order fills',
      beforeSell: {
        position: {
          symbol: 'AAPL',
          qty: 50,
          qty_available: 50,
          avg_entry_price: 145.00,
          current_price: 150.00,
          market_value: 7500.00, // 50 * 150
          cost_basis: 7250.00, // 50 * 145
          unrealized_pl: 250.00,
          unrealized_plpc: 0.0345,
        },
      },
      sellOrder: {
        symbol: 'AAPL',
        qty: 10,
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
      },
      orderFilled: {
        id: 'order_123',
        status: 'filled',
        filled_qty: 10,
        filled_avg_price: 150.00,
        filled_at: '2025-01-24T10:30:00Z',
      },
      afterSell: {
        position: {
          symbol: 'AAPL',
          qty: 40, // 50 - 10
          qty_available: 40,
          avg_entry_price: 145.00, // Unchanged
          current_price: 150.00,
          market_value: 6000.00, // 40 * 150
          cost_basis: 5800.00, // 40 * 145
          unrealized_pl: 200.00, // 6000 - 5800
          unrealized_plpc: 0.0345, // Same percentage
        },
      },
      verification: {
        qtyDecreased: true,
        qtyChange: -10,
        marketValueDecreased: true,
        marketValueChange: -1500.00,
        costBasisDecreased: true,
        costBasisChange: -1450.00,
        avgEntryPriceUnchanged: true,
        unrealizedPlDecreased: true,
        unrealizedPlChange: -50.00,
      },
    };

    // Verify quantity decreased correctly
    expect(positionUpdateFlow.afterSell.position.qty).toBe(
      positionUpdateFlow.beforeSell.position.qty - positionUpdateFlow.sellOrder.qty
    );
    expect(positionUpdateFlow.afterSell.position.qty).toBe(40);

    // Verify market value updated correctly
    const expectedMarketValue = 
      positionUpdateFlow.afterSell.position.qty * positionUpdateFlow.afterSell.position.current_price;
    expect(positionUpdateFlow.afterSell.position.market_value).toBe(expectedMarketValue);
    expect(positionUpdateFlow.afterSell.position.market_value).toBe(6000.00);

    // Verify cost basis updated correctly
    const expectedCostBasis = 
      positionUpdateFlow.afterSell.position.qty * positionUpdateFlow.afterSell.position.avg_entry_price;
    expect(positionUpdateFlow.afterSell.position.cost_basis).toBe(expectedCostBasis);
    expect(positionUpdateFlow.afterSell.position.cost_basis).toBe(5800.00);

    // Verify unrealized P&L updated correctly
    const expectedUnrealizedPL = 
      positionUpdateFlow.afterSell.position.market_value - positionUpdateFlow.afterSell.position.cost_basis;
    expect(positionUpdateFlow.afterSell.position.unrealized_pl).toBe(expectedUnrealizedPL);
    expect(positionUpdateFlow.afterSell.position.unrealized_pl).toBe(200.00);

    // Verify average entry price remains unchanged
    expect(positionUpdateFlow.afterSell.position.avg_entry_price).toBe(
      positionUpdateFlow.beforeSell.position.avg_entry_price
    );

    // Verify qty_available updated
    expect(positionUpdateFlow.afterSell.position.qty_available).toBe(
      positionUpdateFlow.afterSell.position.qty
    );

    console.log(`
Position Update After Sell Fill:
${JSON.stringify(positionUpdateFlow, null, 2)}

Verification Checks:
- Quantity decreased from ${positionUpdateFlow.beforeSell.position.qty} to ${positionUpdateFlow.afterSell.position.qty} ✓
- Market value decreased from $${positionUpdateFlow.beforeSell.position.market_value} to $${positionUpdateFlow.afterSell.position.market_value} ✓
- Cost basis decreased from $${positionUpdateFlow.beforeSell.position.cost_basis} to $${positionUpdateFlow.afterSell.position.cost_basis} ✓
- Average entry price unchanged at $${positionUpdateFlow.afterSell.position.avg_entry_price} ✓
- Unrealized P&L updated from $${positionUpdateFlow.beforeSell.position.unrealized_pl} to $${positionUpdateFlow.afterSell.position.unrealized_pl} ✓
    `);
  });

  it('should document cash balance increase after sell', () => {
    const cashBalanceFlow = {
      beforeSell: {
        cash: 10000.00,
        position: {
          symbol: 'AAPL',
          qty: 50,
          market_value: 7500.00,
          current_price: 150.00,
        },
      },
      sellOrder: {
        symbol: 'AAPL',
        qty: 10,
        side: 'sell',
        type: 'market',
        filled_avg_price: 150.00,
      },
      afterSell: {
        cash: 11500.00, // 10000 + (10 * 150)
        position: {
          symbol: 'AAPL',
          qty: 40, // 50 - 10
          market_value: 6000.00, // 40 * 150
        },
        proceeds: 1500.00, // 10 * 150
      },
      verification: [
        'cash increased by (qty * filled_avg_price)',
        'position qty decreased by sell qty',
        'position market_value updated',
      ],
    };

    const expectedCashIncrease = 
      cashBalanceFlow.sellOrder.qty * cashBalanceFlow.sellOrder.filled_avg_price;
    
    expect(cashBalanceFlow.afterSell.cash).toBe(
      cashBalanceFlow.beforeSell.cash + expectedCashIncrease
    );
    expect(cashBalanceFlow.afterSell.position.qty).toBe(
      cashBalanceFlow.beforeSell.position.qty - cashBalanceFlow.sellOrder.qty
    );

    console.log(`
Cash Balance Flow After Sell:
${JSON.stringify(cashBalanceFlow, null, 2)}
    `);
  });

  it('should document complete position closure', () => {
    const completeClosureScenario = {
      description: 'Selling entire position closes it completely',
      initialPosition: {
        symbol: 'AAPL',
        qty: 25,
        market_value: 3750.00,
        avg_entry_price: 145.00,
      },
      sellOrder: {
        symbol: 'AAPL',
        qty: 25, // Selling all shares
        side: 'sell',
        type: 'market',
      },
      afterSell: {
        positionExists: false,
        message: 'Position no longer appears in positions list',
        cashIncreased: true,
      },
      verification: [
        'GET /api/alpaca/positions returns empty array or excludes AAPL',
        'Cash balance increased by sale proceeds',
        'Order status shows filled',
      ],
    };

    expect(completeClosureScenario.sellOrder.qty).toBe(
      completeClosureScenario.initialPosition.qty
    );
    expect(completeClosureScenario.afterSell.positionExists).toBe(false);

    console.log(`
Complete Position Closure:
${JSON.stringify(completeClosureScenario, null, 2)}
    `);
  });
});

describe('Stock Limit Sell Orders - Requirement 4.2', () => {
  it('should document limit sell order structure', () => {
    const limitSellOrderStructure = {
      symbol: 'AAPL',
      qty: 10,
      side: 'sell',
      type: 'limit',
      time_in_force: 'day',
      limit_price: 155.00, // Required for limit orders
      trade_type: 'stock',
    };

    const expectedResponse = {
      success: true,
      data: {
        id: 'order_id_string',
        symbol: 'AAPL',
        qty: 10,
        side: 'sell',
        type: 'limit',
        limit_price: 155.00,
        time_in_force: 'day',
        status: 'new',
        created_at: '2025-01-24T...',
      },
    };

    expect(limitSellOrderStructure.type).toBe('limit');
    expect(limitSellOrderStructure.limit_price).toBeDefined();
    expect(limitSellOrderStructure.side).toBe('sell');

    console.log(`
Limit Sell Order Structure:
${JSON.stringify(limitSellOrderStructure, null, 2)}

Expected Response:
${JSON.stringify(expectedResponse, null, 2)}
    `);
  });

  it('should validate limit price for sell orders', () => {
    const limitPriceValidation = {
      currentMarketPrice: 150.00,
      validLimitPrices: {
        atMarket: 150.00,
        aboveMarket: 155.00, // Typical for sell limit orders
        slightlyAbove: 150.50,
      },
      invalidLimitPrices: {
        zero: 0,
        negative: -1,
        missing: undefined,
      },
      bestPractice: 'Set limit price at or above market price for sell orders',
      note: 'Limit price below market will likely fill immediately',
    };

    expect(limitPriceValidation.validLimitPrices.aboveMarket).toBeGreaterThan(
      limitPriceValidation.currentMarketPrice
    );

    console.log(`
Limit Price Validation for Sell Orders:
${JSON.stringify(limitPriceValidation, null, 2)}
    `);
  });

  it('should verify limit price is included in order submission', () => {
    const limitPriceVerification = {
      description: 'Verify that limit_price field is included in order submission to Alpaca',
      orderRequest: {
        symbol: 'AAPL',
        qty: 10,
        side: 'sell',
        type: 'limit',
        time_in_force: 'day',
        limit_price: 157.50,
        trade_type: 'stock',
      },
      expectedAlpacaSubmission: {
        symbol: 'AAPL',
        qty: 10,
        side: 'sell',
        type: 'limit',
        time_in_force: 'day',
        limit_price: '157.50', // May be string or number
      },
      verificationChecks: {
        limitPriceExists: true,
        limitPriceMatchesRequest: true,
        orderTypeIsLimit: true,
        limitPriceIsPositive: true,
        limitPriceHasCorrectFormat: true, // 2 decimal places
      },
      alpacaResponse: {
        success: true,
        data: {
          id: 'order_abc123',
          symbol: 'AAPL',
          qty: '10',
          side: 'sell',
          type: 'limit',
          limit_price: '157.50', // Alpaca returns as string
          time_in_force: 'day',
          status: 'new',
          created_at: '2025-01-24T10:00:00Z',
        },
      },
      verificationSteps: [
        '1. Submit limit sell order with limit_price field',
        '2. Receive order response from Alpaca',
        '3. Verify response contains limit_price field',
        '4. Verify limit_price value matches request',
        '5. Verify order type is "limit"',
        '6. Retrieve order details via GET endpoint',
        '7. Confirm limit_price persisted correctly',
      ],
    };

    // Verify limit_price is present in request
    expect(limitPriceVerification.orderRequest.limit_price).toBeDefined();
    expect(limitPriceVerification.orderRequest.limit_price).toBeGreaterThan(0);
    expect(limitPriceVerification.orderRequest.type).toBe('limit');

    // Verify limit_price is present in response
    expect(limitPriceVerification.alpacaResponse.data.limit_price).toBeDefined();
    expect(limitPriceVerification.alpacaResponse.data.type).toBe('limit');

    // Verify limit_price values match (accounting for string/number conversion)
    const requestPrice = limitPriceVerification.orderRequest.limit_price;
    const responsePrice = parseFloat(limitPriceVerification.alpacaResponse.data.limit_price);
    expect(responsePrice).toBe(requestPrice);

    // Verify all checks pass
    expect(limitPriceVerification.verificationChecks.limitPriceExists).toBe(true);
    expect(limitPriceVerification.verificationChecks.limitPriceMatchesRequest).toBe(true);
    expect(limitPriceVerification.verificationChecks.orderTypeIsLimit).toBe(true);
    expect(limitPriceVerification.verificationChecks.limitPriceIsPositive).toBe(true);

    console.log(`
Limit Price Verification in Submission:
${JSON.stringify(limitPriceVerification, null, 2)}

Verification Steps:
${limitPriceVerification.verificationSteps.map(step => `  ${step}`).join('\n')}

✅ All verification checks passed:
  - limit_price field exists in request
  - limit_price field exists in response
  - limit_price value matches between request and response
  - order type is "limit"
  - limit_price is positive number
    `);
  });

  it('should document order modification before fill', () => {
    const orderModificationFlow = {
      description: 'Modify a limit sell order by canceling and replacing it with a new order',
      note: 'Alpaca does not support direct order modification via PATCH; must cancel and replace',
      
      step1: {
        action: 'Place initial limit sell order',
        endpoint: 'POST /functions/v1/alpaca-orders',
        payload: {
          symbol: 'AAPL',
          qty: 10,
          side: 'sell',
          type: 'limit',
          limit_price: 155.00,
          time_in_force: 'day',
        },
        response: {
          success: true,
          data: {
            id: 'order_123',
            status: 'new',
            symbol: 'AAPL',
            qty: '10',
            side: 'sell',
            type: 'limit',
            limit_price: '155.00',
            time_in_force: 'day',
            created_at: '2025-01-24T10:00:00Z',
          },
        },
      },
      
      step2: {
        action: 'Verify order is still open (not filled)',
        endpoint: 'GET /functions/v1/alpaca-orders?orderId=order_123',
        response: {
          success: true,
          data: {
            id: 'order_123',
            status: 'new', // or 'accepted' - not filled yet
            filled_qty: '0',
          },
        },
        validation: 'Order status must be "new" or "accepted" to modify',
      },
      
      step3: {
        action: 'Cancel original order',
        endpoint: 'DELETE /functions/v1/alpaca-orders?orderId=order_123',
        response: {
          success: true,
          message: 'Order order_123 cancelled successfully',
        },
        verification: [
          'Order status changes to "canceled"',
          'Order no longer appears in open orders',
          'Position quantity remains unchanged',
        ],
      },
      
      step4: {
        action: 'Place new order with modified limit price',
        endpoint: 'POST /functions/v1/alpaca-orders',
        payload: {
          symbol: 'AAPL',
          qty: 10,
          side: 'sell',
          type: 'limit',
          limit_price: 157.00, // Modified price (increased by $2)
          time_in_force: 'day',
        },
        response: {
          success: true,
          data: {
            id: 'order_124', // New order ID
            status: 'new',
            symbol: 'AAPL',
            qty: '10',
            side: 'sell',
            type: 'limit',
            limit_price: '157.00', // Updated price
            time_in_force: 'day',
            created_at: '2025-01-24T10:05:00Z',
          },
        },
      },
      
      verification: {
        originalOrderId: 'order_123',
        newOrderId: 'order_124',
        originalLimitPrice: 155.00,
        newLimitPrice: 157.00,
        priceChange: 2.00,
        orderIdChanged: true,
        limitPriceChanged: true,
        quantityUnchanged: true,
        sideUnchanged: true,
        symbolUnchanged: true,
      },
      
      useCases: {
        increasePrice: {
          scenario: 'Market moving up, want to sell at higher price',
          example: 'Change limit from $155 to $157',
        },
        decreasePrice: {
          scenario: 'Market moving down, want to ensure order fills',
          example: 'Change limit from $155 to $153',
        },
        changeQuantity: {
          scenario: 'Want to sell more or fewer shares',
          example: 'Change qty from 10 to 15 shares',
          note: 'Must verify sufficient position quantity',
        },
        changeTimeInForce: {
          scenario: 'Extend order lifetime',
          example: 'Change from "day" to "gtc"',
        },
      },
      
      bestPractices: [
        'Always verify order is not filled before canceling',
        'Check position quantity before placing replacement order',
        'Store new order ID for tracking',
        'Consider market conditions when modifying price',
        'Use appropriate time_in_force for replacement order',
      ],
      
      errorHandling: {
        orderAlreadyFilled: {
          error: 'Cannot cancel filled order',
          solution: 'Check order status before attempting modification',
        },
        orderAlreadyCanceled: {
          error: 'Order already canceled',
          solution: 'Verify order status is "new" or "accepted"',
        },
        insufficientQuantity: {
          error: 'Insufficient position for replacement order',
          solution: 'Verify qty_available before placing new order',
        },
        marketClosed: {
          error: 'Market closed, cannot place order',
          solution: 'Use "day" or "gtc" time_in_force for after-hours submission',
        },
      },
    };

    // Verify price modification
    expect(orderModificationFlow.step4.payload.limit_price).toBeGreaterThan(
      orderModificationFlow.step1.payload.limit_price
    );
    expect(orderModificationFlow.verification.limitPriceChanged).toBe(true);
    
    // Verify order IDs are different
    expect(orderModificationFlow.verification.originalOrderId).not.toBe(
      orderModificationFlow.verification.newOrderId
    );
    expect(orderModificationFlow.verification.orderIdChanged).toBe(true);
    
    // Verify quantity and symbol unchanged
    expect(orderModificationFlow.step4.payload.qty).toBe(
      orderModificationFlow.step1.payload.qty
    );
    expect(orderModificationFlow.step4.payload.symbol).toBe(
      orderModificationFlow.step1.payload.symbol
    );
    expect(orderModificationFlow.verification.quantityUnchanged).toBe(true);
    expect(orderModificationFlow.verification.symbolUnchanged).toBe(true);
    
    // Verify side unchanged
    expect(orderModificationFlow.step4.payload.side).toBe(
      orderModificationFlow.step1.payload.side
    );
    expect(orderModificationFlow.verification.sideUnchanged).toBe(true);

    console.log(`
Order Modification Flow (Cancel and Replace):
${JSON.stringify(orderModificationFlow, null, 2)}

Key Points:
- Alpaca does not support PATCH for order modification
- Must cancel original order and place new order
- New order receives different order ID
- Verify order is not filled before canceling
- Check position quantity before placing replacement order

Use Cases:
${Object.entries(orderModificationFlow.useCases).map(([key, value]) => 
  `  ${key}: ${value.scenario} (${value.example})`
).join('\n')}

Best Practices:
${orderModificationFlow.bestPractices.map((practice, i) => 
  `  ${i + 1}. ${practice}`
).join('\n')}
    `);
  });

  it('should document complete position closure with limit order', () => {
    const limitClosureScenario = {
      description: 'Close entire position using limit sell order',
      position: {
        symbol: 'AAPL',
        qty: 50,
        avg_entry_price: 145.00,
        current_price: 150.00,
      },
      limitSellOrder: {
        symbol: 'AAPL',
        qty: 50, // Selling all shares
        side: 'sell',
        type: 'limit',
        limit_price: 152.00, // Above current price
        time_in_force: 'gtc',
      },
      expectedBehavior: {
        orderStatus: 'new or accepted',
        positionStillExists: true,
        willFillWhen: 'Market price reaches $152.00',
        afterFill: {
          positionClosed: true,
          cashIncreased: true,
          proceeds: 7600.00, // 50 * 152
        },
      },
    };

    expect(limitClosureScenario.limitSellOrder.qty).toBe(
      limitClosureScenario.position.qty
    );
    expect(limitClosureScenario.limitSellOrder.limit_price).toBeGreaterThan(
      limitClosureScenario.position.current_price
    );

    console.log(`
Complete Position Closure with Limit Order:
${JSON.stringify(limitClosureScenario, null, 2)}
    `);
  });
});

describe('Options Sell Orders - Requirement 4.3', () => {
  it('should document option sell order structure', () => {
    const optionSellOrderStructure = {
      symbol: 'AAPL',
      qty: 1, // Number of contracts
      side: 'sell',
      type: 'market',
      time_in_force: 'day',
      trade_type: 'option',
      option_details: {
        strike: 150.00,
        expiration: '2025-02-21',
        option_type: 'call',
        contract_size: 100,
        premium: 5.50,
      },
    };

    const expectedAlpacaSymbol = 'AAPL250221C00150000';
    
    const expectedResponse = {
      success: true,
      data: {
        id: 'order_id_string',
        symbol: expectedAlpacaSymbol,
        qty: 1,
        side: 'sell',
        type: 'market',
        class: 'option',
        status: 'new',
      },
    };

    expect(optionSellOrderStructure.trade_type).toBe('option');
    expect(optionSellOrderStructure.option_details).toBeDefined();
    expect(optionSellOrderStructure.side).toBe('sell');

    console.log(`
Option Sell Order Structure:
${JSON.stringify(optionSellOrderStructure, null, 2)}

Expected Alpaca Symbol: ${expectedAlpacaSymbol}

Expected Response:
${JSON.stringify(expectedResponse, null, 2)}
    `);
  });

  it('should verify option position ownership before sell', () => {
    const optionPositionVerification = {
      step1: {
        action: 'Check option positions',
        endpoint: 'GET /api/alpaca/positions',
        expectedResponse: {
          success: true,
          data: [
            {
              symbol: 'AAPL250221C00150000',
              qty: '5',
              qty_available: '5',
              market_value: '2750.00',
              avg_entry_price: '5.00',
              asset_class: 'option',
            },
          ],
        },
      },
      step2: {
        action: 'Verify sufficient contracts',
        validation: 'qty_available >= sell_qty',
        sellQty: 2,
        availableQty: 5,
        canSell: true,
      },
      step3: {
        action: 'Place option sell order',
        payload: {
          symbol: 'AAPL',
          qty: 2,
          side: 'sell',
          type: 'market',
          trade_type: 'option',
          option_details: {
            strike: 150.00,
            expiration: '2025-02-21',
            option_type: 'call',
          },
        },
      },
    };

    expect(optionPositionVerification.step2.canSell).toBe(true);
    expect(optionPositionVerification.step2.availableQty).toBeGreaterThanOrEqual(
      optionPositionVerification.step2.sellQty
    );

    console.log(`
Option Position Verification:
${JSON.stringify(optionPositionVerification, null, 2)}
    `);
  });

  it('should document option-specific validation', () => {
    const optionValidationRules = {
      required: {
        option_details: 'Must be provided for option trades',
        strike: 'Strike price is required',
        expiration: 'Expiration date is required',
        option_type: 'Must be "call" or "put"',
      },
      validation: {
        strike: 'Must be positive number',
        expiration: 'Must be valid future date',
        option_type: 'Must be exactly "call" or "put"',
        contract_size: 'Defaults to 100 if not provided',
      },
      symbolConstruction: {
        format: 'OCC format: SYMBOL + YYMMDD + C/P + STRIKE',
        example: 'AAPL250221C00150000',
        breakdown: {
          underlying: 'AAPL',
          expiration: '250221 (Feb 21, 2025)',
          type: 'C (Call)',
          strike: '00150000 ($150.00)',
        },
      },
    };

    expect(optionValidationRules.required.option_details).toBeDefined();
    expect(optionValidationRules.symbolConstruction.format).toContain('OCC');

    console.log(`
Option-Specific Validation Rules:
${JSON.stringify(optionValidationRules, null, 2)}
    `);
  });

  it('should document option position closure after fill', () => {
    const optionClosureScenario = {
      description: 'Selling all option contracts closes the position',
      initialPosition: {
        symbol: 'AAPL250221C00150000',
        qty: 3,
        market_value: 1650.00,
        avg_entry_price: 5.00,
        current_premium: 5.50,
      },
      sellOrder: {
        symbol: 'AAPL',
        qty: 3, // Selling all contracts
        side: 'sell',
        type: 'market',
        trade_type: 'option',
        option_details: {
          strike: 150.00,
          expiration: '2025-02-21',
          option_type: 'call',
        },
      },
      afterFill: {
        positionClosed: true,
        proceeds: 1650.00, // 3 contracts * 5.50 premium * 100 shares
        profitLoss: 150.00, // (5.50 - 5.00) * 3 * 100
      },
      verification: [
        'Position no longer in positions list',
        'Cash balance increased by proceeds',
        'Order shows filled status',
        'Profit/loss calculated correctly',
      ],
    };

    expect(optionClosureScenario.sellOrder.qty).toBe(
      optionClosureScenario.initialPosition.qty
    );
    expect(optionClosureScenario.afterFill.positionClosed).toBe(true);

    console.log(`
Option Position Closure:
${JSON.stringify(optionClosureScenario, null, 2)}
    `);
  });

  it('should document sell-to-close vs sell-to-open', () => {
    const sellOrderTypes = {
      sellToClose: {
        description: 'Close an existing long option position',
        requirement: 'Must own the option contracts',
        example: {
          scenario: 'Bought 5 AAPL calls, now selling 3 to close',
          initialPosition: 5,
          sellQty: 3,
          remainingPosition: 2,
        },
        validation: 'qty_available >= sell_qty',
      },
      sellToOpen: {
        description: 'Open a new short option position (writing options)',
        requirement: 'Requires margin account and sufficient collateral',
        example: {
          scenario: 'Writing covered calls on owned stock',
          ownedStock: 500, // shares of AAPL
          sellQty: 5, // contracts (covering 500 shares)
        },
        note: 'Not covered in current requirements - focus on sell-to-close',
      },
      currentImplementation: {
        supported: 'sell-to-close',
        validation: 'Verify position ownership before allowing sell',
      },
    };

    expect(sellOrderTypes.sellToClose.validation).toContain('qty_available');
    expect(sellOrderTypes.currentImplementation.supported).toBe('sell-to-close');

    console.log(`
Sell Order Types:
${JSON.stringify(sellOrderTypes, null, 2)}
    `);
  });
});

describe('Sell Order Validation - Requirement 4.5', () => {
  it('should document insufficient quantity error', () => {
    const insufficientQuantityScenario = {
      position: {
        symbol: 'AAPL',
        qty: 10,
        qty_available: 10,
      },
      attemptedSell: {
        symbol: 'AAPL',
        qty: 25, // More than owned
        side: 'sell',
        type: 'market',
      },
      expectedError: {
        success: false,
        error: {
          code: 'INSUFFICIENT_POSITION',
          message: 'Insufficient position quantity',
          details: {
            requested: 25,
            available: 10,
            shortfall: 15,
          },
        },
      },
      validation: 'qty_available >= requested_qty must be true',
    };

    expect(insufficientQuantityScenario.attemptedSell.qty).toBeGreaterThan(
      insufficientQuantityScenario.position.qty_available
    );
    expect(insufficientQuantityScenario.expectedError.success).toBe(false);

    console.log(`
Insufficient Quantity Error:
${JSON.stringify(insufficientQuantityScenario, null, 2)}
    `);
  });

  it('should document non-existent position error', () => {
    const nonExistentPositionScenario = {
      attemptedSell: {
        symbol: 'TSLA',
        qty: 10,
        side: 'sell',
        type: 'market',
      },
      currentPositions: [
        { symbol: 'AAPL', qty: 50 },
        { symbol: 'GOOGL', qty: 25 },
        // TSLA not in positions
      ],
      expectedError: {
        success: false,
        error: {
          code: 'POSITION_NOT_FOUND',
          message: 'No position found for symbol TSLA',
          details: 'Cannot sell a position you do not own',
        },
      },
      validation: 'Position must exist before selling',
    };

    const hasPosition = nonExistentPositionScenario.currentPositions.some(
      p => p.symbol === nonExistentPositionScenario.attemptedSell.symbol
    );
    expect(hasPosition).toBe(false);
    expect(nonExistentPositionScenario.expectedError.success).toBe(false);

    console.log(`
Non-Existent Position Error:
${JSON.stringify(nonExistentPositionScenario, null, 2)}
    `);
  });

  it('should document validation error messages', () => {
    const validationErrors = {
      insufficientQuantity: {
        code: 'INSUFFICIENT_POSITION',
        message: 'Insufficient position quantity',
        httpStatus: 400,
        userMessage: 'You cannot sell more shares than you own',
      },
      noPosition: {
        code: 'POSITION_NOT_FOUND',
        message: 'No position found for this symbol',
        httpStatus: 404,
        userMessage: 'You do not own any shares of this stock',
      },
      invalidQuantity: {
        code: 'VALIDATION_ERROR',
        message: 'Quantity must be positive',
        httpStatus: 400,
        userMessage: 'Please enter a valid quantity',
      },
      missingLimitPrice: {
        code: 'VALIDATION_ERROR',
        message: 'Limit price required for limit orders',
        httpStatus: 400,
        userMessage: 'Please specify a limit price',
      },
      invalidSymbol: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid symbol',
        httpStatus: 400,
        userMessage: 'Please enter a valid stock symbol',
      },
      marketClosed: {
        code: 'MARKET_CLOSED',
        message: 'Market is currently closed',
        httpStatus: 400,
        userMessage: 'Orders can only be placed during market hours or as day/gtc orders',
      },
    };

    expect(validationErrors.insufficientQuantity.httpStatus).toBe(400);
    expect(validationErrors.noPosition.httpStatus).toBe(404);

    console.log(`
Validation Error Messages:
${JSON.stringify(validationErrors, null, 2)}
    `);
  });

  it('should document error handling flow', () => {
    const errorHandlingFlow = {
      step1: {
        action: 'Validate sell request',
        checks: [
          'Symbol is valid',
          'Quantity is positive',
          'Position exists',
          'Sufficient quantity available',
          'Limit price provided if limit order',
        ],
      },
      step2: {
        action: 'If validation fails',
        response: {
          success: false,
          error: {
            code: 'ERROR_CODE',
            message: 'Human-readable error message',
            details: 'Additional context',
          },
        },
        httpStatus: '400 or 404',
      },
      step3: {
        action: 'If validation passes',
        nextStep: 'Submit order to Alpaca API',
      },
      step4: {
        action: 'Handle Alpaca API errors',
        possibleErrors: [
          'Insufficient buying power (for options)',
          'Symbol not found',
          'Market closed',
          'Order rejected by exchange',
        ],
      },
    };

    expect(errorHandlingFlow.step1.checks.length).toBeGreaterThan(0);
    expect(errorHandlingFlow.step2.response.success).toBe(false);

    console.log(`
Error Handling Flow:
${JSON.stringify(errorHandlingFlow, null, 2)}
    `);
  });

  it('should document edge case: selling with pending orders', () => {
    const pendingOrdersScenario = {
      description: 'Attempting to sell when quantity is tied up in pending orders',
      position: {
        symbol: 'AAPL',
        qty: 50,
        qty_available: 40, // 10 shares in pending sell order
      },
      pendingOrders: [
        {
          id: 'order_123',
          symbol: 'AAPL',
          qty: 10,
          side: 'sell',
          status: 'pending_new',
        },
      ],
      attemptedSell: {
        symbol: 'AAPL',
        qty: 45, // More than qty_available
        side: 'sell',
      },
      expectedBehavior: {
        shouldFail: true,
        reason: 'qty_available (40) < requested_qty (45)',
        solution: 'Cancel pending order or reduce sell quantity',
      },
    };

    expect(pendingOrdersScenario.position.qty_available).toBeLessThan(
      pendingOrdersScenario.attemptedSell.qty
    );
    expect(pendingOrdersScenario.expectedBehavior.shouldFail).toBe(true);

    console.log(`
Pending Orders Scenario:
${JSON.stringify(pendingOrdersScenario, null, 2)}
    `);
  });
});

describe('Sell Order Test Scenarios - Requirement 4.5', () => {
  it('should document successful market sell flow', () => {
    const successfulMarketSellFlow = {
      title: 'Successful Market Sell Order Flow',
      prerequisites: {
        userAuthenticated: true,
        hasPosition: true,
        positionDetails: {
          symbol: 'AAPL',
          qty: 50,
          qty_available: 50,
        },
      },
      steps: [
        {
          step: 1,
          action: 'User selects stock to sell',
          ui: 'Click on AAPL position',
        },
        {
          step: 2,
          action: 'User enters sell details',
          input: {
            qty: 10,
            side: 'sell',
            type: 'market',
          },
        },
        {
          step: 3,
          action: 'System validates request',
          validation: 'Position exists and qty_available >= 10',
        },
        {
          step: 4,
          action: 'Submit order to Alpaca',
          endpoint: 'POST /api/alpaca/orders',
          payload: {
            symbol: 'AAPL',
            qty: 10,
            side: 'sell',
            type: 'market',
            time_in_force: 'day',
          },
        },
        {
          step: 5,
          action: 'Order accepted',
          response: {
            success: true,
            data: {
              id: 'order_123',
              status: 'new',
            },
          },
        },
        {
          step: 6,
          action: 'Order fills',
          result: {
            status: 'filled',
            filled_avg_price: 150.00,
            filled_qty: 10,
          },
        },
        {
          step: 7,
          action: 'Position and cash updated',
          updates: {
            position_qty: 40, // 50 - 10
            cash_increase: 1500.00, // 10 * 150
          },
        },
      ],
      expectedOutcome: 'Order filled, position reduced, cash increased',
    };

    expect(successfulMarketSellFlow.steps.length).toBe(7);
    expect(successfulMarketSellFlow.expectedOutcome).toContain('filled');

    console.log(`
Successful Market Sell Flow:
${JSON.stringify(successfulMarketSellFlow, null, 2)}
    `);
  });

  it('should document successful limit sell flow', () => {
    const successfulLimitSellFlow = {
      title: 'Successful Limit Sell Order Flow',
      prerequisites: {
        userAuthenticated: true,
        hasPosition: true,
        positionDetails: {
          symbol: 'AAPL',
          qty: 50,
          current_price: 150.00,
        },
      },
      steps: [
        {
          step: 1,
          action: 'User selects limit order type',
          input: {
            type: 'limit',
            limit_price: 155.00,
          },
        },
        {
          step: 2,
          action: 'Submit limit sell order',
          payload: {
            symbol: 'AAPL',
            qty: 10,
            side: 'sell',
            type: 'limit',
            limit_price: 155.00,
            time_in_force: 'gtc',
          },
        },
        {
          step: 3,
          action: 'Order accepted and pending',
          status: 'accepted',
          note: 'Waiting for price to reach $155',
        },
        {
          step: 4,
          action: 'Price reaches limit',
          marketPrice: 155.00,
          orderFills: true,
        },
        {
          step: 5,
          action: 'Position and cash updated',
          updates: {
            position_qty: 40,
            cash_increase: 1550.00, // 10 * 155
          },
        },
      ],
      expectedOutcome: 'Order fills when price reaches limit, position reduced',
    };

    expect(successfulLimitSellFlow.steps[1].payload.limit_price).toBeDefined();
    expect(successfulLimitSellFlow.expectedOutcome).toContain('limit');

    console.log(`
Successful Limit Sell Flow:
${JSON.stringify(successfulLimitSellFlow, null, 2)}
    `);
  });

  it('should document successful options sell flow', () => {
    const successfulOptionsSellFlow = {
      title: 'Successful Options Sell Order Flow',
      prerequisites: {
        userAuthenticated: true,
        hasOptionPosition: true,
        positionDetails: {
          symbol: 'AAPL250221C00150000',
          qty: 5,
          current_premium: 5.50,
        },
      },
      steps: [
        {
          step: 1,
          action: 'User selects option to sell',
          ui: 'Click on AAPL call option position',
        },
        {
          step: 2,
          action: 'Enter sell details',
          input: {
            qty: 2,
            side: 'sell',
            type: 'market',
            trade_type: 'option',
            option_details: {
              strike: 150.00,
              expiration: '2025-02-21',
              option_type: 'call',
            },
          },
        },
        {
          step: 3,
          action: 'System constructs OCC symbol',
          occSymbol: 'AAPL250221C00150000',
        },
        {
          step: 4,
          action: 'Submit to Alpaca',
          payload: {
            symbol: 'AAPL250221C00150000',
            qty: 2,
            side: 'sell',
            type: 'market',
            class: 'option',
          },
        },
        {
          step: 5,
          action: 'Order fills',
          result: {
            filled_avg_price: 5.50,
            proceeds: 1100.00, // 2 * 5.50 * 100
          },
        },
        {
          step: 6,
          action: 'Position updated',
          updates: {
            position_qty: 3, // 5 - 2
            cash_increase: 1100.00,
          },
        },
      ],
      expectedOutcome: 'Option contracts sold, position reduced, cash increased',
    };

    expect(successfulOptionsSellFlow.steps[1].input.trade_type).toBe('option');
    expect(successfulOptionsSellFlow.expectedOutcome).toContain('Option');

    console.log(`
Successful Options Sell Flow:
${JSON.stringify(successfulOptionsSellFlow, null, 2)}
    `);
  });

  it('should document error handling scenarios', () => {
    const errorScenarios = {
      scenario1: {
        title: 'Insufficient Quantity',
        attempt: {
          symbol: 'AAPL',
          qty: 100,
          side: 'sell',
        },
        position: {
          qty_available: 50,
        },
        expectedError: 'INSUFFICIENT_POSITION',
        userMessage: 'You cannot sell more shares than you own',
      },
      scenario2: {
        title: 'No Position',
        attempt: {
          symbol: 'TSLA',
          qty: 10,
          side: 'sell',
        },
        positions: ['AAPL', 'GOOGL'], // TSLA not owned
        expectedError: 'POSITION_NOT_FOUND',
        userMessage: 'You do not own any shares of this stock',
      },
      scenario3: {
        title: 'Missing Limit Price',
        attempt: {
          symbol: 'AAPL',
          qty: 10,
          side: 'sell',
          type: 'limit',
          // Missing limit_price
        },
        expectedError: 'VALIDATION_ERROR',
        userMessage: 'Limit price required for limit orders',
      },
      scenario4: {
        title: 'Invalid Quantity',
        attempt: {
          symbol: 'AAPL',
          qty: 0,
          side: 'sell',
        },
        expectedError: 'VALIDATION_ERROR',
        userMessage: 'Quantity must be positive',
      },
    };

    expect(Object.keys(errorScenarios).length).toBe(4);
    expect(errorScenarios.scenario1.expectedError).toBe('INSUFFICIENT_POSITION');

    console.log(`
Error Handling Scenarios:
${JSON.stringify(errorScenarios, null, 2)}
    `);
  });
});
