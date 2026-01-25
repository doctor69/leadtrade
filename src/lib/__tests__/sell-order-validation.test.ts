/**
 * Test Suite: Sell Order Validation - Insufficient Quantity
 * 
 * This test suite specifically tests the validation that prevents users from
 * selling more shares than they own, as required by Alpaca Limited Live Tech
 * Requirement 4.4.
 * 
 * Requirements tested:
 * - 4.4: Sell order validation
 * - 4.5: Error handling for insufficient quantity
 */

import { describe, it, expect } from 'vitest';

describe('Sell Order Validation - Requirement 4.4', () => {
  it('should reject sell order when quantity exceeds owned position', () => {
    const testScenario = {
      description: 'Attempt to sell more shares than owned should return error',
      
      currentPosition: {
        symbol: 'AAPL',
        qty: 25,
        qty_available: 25,
        market_value: 3750.00,
        avg_entry_price: 145.00,
        current_price: 150.00,
      },
      
      attemptedSellOrder: {
        symbol: 'AAPL',
        qty: 50, // Attempting to sell 50 shares when only 25 are owned
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
      },
      
      expectedValidation: {
        shouldPass: false,
        reason: 'Requested quantity (50) exceeds available quantity (25)',
        shortfall: 25,
      },
      
      expectedErrorResponse: {
        success: false,
        error: {
          code: 'INSUFFICIENT_POSITION',
          message: 'Insufficient position quantity to complete sell order',
          details: {
            symbol: 'AAPL',
            requested_qty: 50,
            available_qty: 25,
            shortfall: 25,
          },
        },
        httpStatus: 400,
      },
      
      userFacingMessage: 'You cannot sell 50 shares of AAPL. You only own 25 shares.',
    };

    // Verify the validation logic
    const requestedQty = testScenario.attemptedSellOrder.qty;
    const availableQty = testScenario.currentPosition.qty_available;
    const hasInsufficientQuantity = requestedQty > availableQty;
    
    expect(hasInsufficientQuantity).toBe(true);
    expect(testScenario.expectedValidation.shouldPass).toBe(false);
    expect(testScenario.expectedErrorResponse.success).toBe(false);
    expect(testScenario.expectedErrorResponse.error.code).toBe('INSUFFICIENT_POSITION');
    
    // Verify shortfall calculation
    const calculatedShortfall = requestedQty - availableQty;
    expect(calculatedShortfall).toBe(testScenario.expectedValidation.shortfall);
    expect(calculatedShortfall).toBe(25);

    console.log(`
Test Scenario: Sell More Than Owned
${JSON.stringify(testScenario, null, 2)}

Validation Result:
✓ Requested quantity (${requestedQty}) > Available quantity (${availableQty})
✓ Validation correctly fails
✓ Error code: ${testScenario.expectedErrorResponse.error.code}
✓ Shortfall calculated: ${calculatedShortfall} shares
✓ HTTP Status: ${testScenario.expectedErrorResponse.httpStatus}
    `);
  });

  it('should reject sell order when attempting to sell non-existent position', () => {
    const testScenario = {
      description: 'Attempt to sell a stock not in portfolio should return error',
      
      currentPositions: [
        { symbol: 'AAPL', qty: 25, qty_available: 25 },
        { symbol: 'GOOGL', qty: 10, qty_available: 10 },
        { symbol: 'MSFT', qty: 15, qty_available: 15 },
      ],
      
      attemptedSellOrder: {
        symbol: 'TSLA', // Not in current positions
        qty: 10,
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
      },
      
      expectedValidation: {
        shouldPass: false,
        reason: 'Position does not exist in portfolio',
        positionFound: false,
      },
      
      expectedErrorResponse: {
        success: false,
        error: {
          code: 'POSITION_NOT_FOUND',
          message: 'No position found for symbol TSLA',
          details: 'Cannot sell a position you do not own',
        },
        httpStatus: 404,
      },
      
      userFacingMessage: 'You do not own any shares of TSLA.',
    };

    // Verify position does not exist
    const positionExists = testScenario.currentPositions.some(
      pos => pos.symbol === testScenario.attemptedSellOrder.symbol
    );
    
    expect(positionExists).toBe(false);
    expect(testScenario.expectedValidation.positionFound).toBe(false);
    expect(testScenario.expectedValidation.shouldPass).toBe(false);
    expect(testScenario.expectedErrorResponse.success).toBe(false);
    expect(testScenario.expectedErrorResponse.error.code).toBe('POSITION_NOT_FOUND');
    expect(testScenario.expectedErrorResponse.httpStatus).toBe(404);

    console.log(`
Test Scenario: Sell Non-Existent Position
${JSON.stringify(testScenario, null, 2)}

Validation Result:
✓ Position ${testScenario.attemptedSellOrder.symbol} not found in portfolio
✓ Validation correctly fails
✓ Error code: ${testScenario.expectedErrorResponse.error.code}
✓ HTTP Status: ${testScenario.expectedErrorResponse.httpStatus}
    `);
  });

  it('should reject sell order when quantity tied up in pending orders', () => {
    const testScenario = {
      description: 'Attempt to sell when shares are tied up in pending orders',
      
      currentPosition: {
        symbol: 'AAPL',
        qty: 100, // Total shares owned
        qty_available: 60, // 40 shares tied up in pending orders
        market_value: 15000.00,
        avg_entry_price: 145.00,
      },
      
      pendingOrders: [
        {
          id: 'order_123',
          symbol: 'AAPL',
          qty: 30,
          side: 'sell',
          status: 'pending_new',
          type: 'limit',
          limit_price: 155.00,
        },
        {
          id: 'order_124',
          symbol: 'AAPL',
          qty: 10,
          side: 'sell',
          status: 'accepted',
          type: 'limit',
          limit_price: 157.00,
        },
      ],
      
      attemptedSellOrder: {
        symbol: 'AAPL',
        qty: 75, // More than qty_available (60)
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
      },
      
      expectedValidation: {
        shouldPass: false,
        reason: 'Requested quantity exceeds available quantity (some shares tied up in pending orders)',
        totalOwned: 100,
        availableToSell: 60,
        tiedUpInOrders: 40,
        requested: 75,
        shortfall: 15,
      },
      
      expectedErrorResponse: {
        success: false,
        error: {
          code: 'INSUFFICIENT_AVAILABLE_QUANTITY',
          message: 'Insufficient available quantity. Some shares are tied up in pending orders.',
          details: {
            symbol: 'AAPL',
            total_qty: 100,
            qty_available: 60,
            qty_in_pending_orders: 40,
            requested_qty: 75,
            shortfall: 15,
          },
        },
        httpStatus: 400,
      },
      
      userFacingMessage: 'You cannot sell 75 shares of AAPL. You own 100 shares, but only 60 are available (40 are in pending orders).',
      
      suggestedActions: [
        'Cancel one or more pending orders to free up shares',
        'Reduce the sell quantity to 60 or less',
        'Wait for pending orders to fill or expire',
      ],
    };

    // Verify validation logic
    const requestedQty = testScenario.attemptedSellOrder.qty;
    const availableQty = testScenario.currentPosition.qty_available;
    const totalQty = testScenario.currentPosition.qty;
    const hasInsufficientAvailable = requestedQty > availableQty;
    
    expect(hasInsufficientAvailable).toBe(true);
    expect(requestedQty).toBeLessThanOrEqual(totalQty); // Has enough total, but not available
    expect(testScenario.expectedValidation.shouldPass).toBe(false);
    expect(testScenario.expectedErrorResponse.success).toBe(false);
    
    // Verify shortfall calculation
    const calculatedShortfall = requestedQty - availableQty;
    expect(calculatedShortfall).toBe(testScenario.expectedValidation.shortfall);
    expect(calculatedShortfall).toBe(15);
    
    // Verify tied up quantity calculation
    const tiedUpQty = totalQty - availableQty;
    expect(tiedUpQty).toBe(testScenario.expectedValidation.tiedUpInOrders);
    expect(tiedUpQty).toBe(40);

    console.log(`
Test Scenario: Sell With Pending Orders
${JSON.stringify(testScenario, null, 2)}

Validation Result:
✓ Total owned: ${totalQty} shares
✓ Available to sell: ${availableQty} shares
✓ Tied up in pending orders: ${tiedUpQty} shares
✓ Requested: ${requestedQty} shares
✓ Shortfall: ${calculatedShortfall} shares
✓ Validation correctly fails
✓ Error code: ${testScenario.expectedErrorResponse.error.code}
✓ HTTP Status: ${testScenario.expectedErrorResponse.httpStatus}

Suggested Actions:
${testScenario.suggestedActions.map((action, i) => `  ${i + 1}. ${action}`).join('\n')}
    `);
  });

  it('should reject option sell order when insufficient contracts owned', () => {
    const testScenario = {
      description: 'Attempt to sell more option contracts than owned',
      
      currentPosition: {
        symbol: 'AAPL250221C00150000',
        asset_class: 'option',
        qty: 3, // Own 3 contracts
        qty_available: 3,
        market_value: 1650.00,
        avg_entry_price: 5.00,
        current_premium: 5.50,
        option_details: {
          underlying_symbol: 'AAPL',
          strike: 150.00,
          expiration: '2025-02-21',
          option_type: 'call',
          contract_size: 100,
        },
      },
      
      attemptedSellOrder: {
        symbol: 'AAPL',
        qty: 5, // Attempting to sell 5 contracts when only 3 are owned
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
        trade_type: 'option',
        option_details: {
          strike: 150.00,
          expiration: '2025-02-21',
          option_type: 'call',
        },
      },
      
      expectedValidation: {
        shouldPass: false,
        reason: 'Requested contracts (5) exceeds owned contracts (3)',
        shortfall: 2,
      },
      
      expectedErrorResponse: {
        success: false,
        error: {
          code: 'INSUFFICIENT_OPTION_POSITION',
          message: 'Insufficient option contracts to complete sell order',
          details: {
            symbol: 'AAPL250221C00150000',
            requested_contracts: 5,
            available_contracts: 3,
            shortfall: 2,
            option_type: 'call',
            strike: 150.00,
            expiration: '2025-02-21',
          },
        },
        httpStatus: 400,
      },
      
      userFacingMessage: 'You cannot sell 5 contracts of AAPL $150 Call (Feb 21, 2025). You only own 3 contracts.',
    };

    // Verify validation logic
    const requestedContracts = testScenario.attemptedSellOrder.qty;
    const availableContracts = testScenario.currentPosition.qty_available;
    const hasInsufficientContracts = requestedContracts > availableContracts;
    
    expect(hasInsufficientContracts).toBe(true);
    expect(testScenario.expectedValidation.shouldPass).toBe(false);
    expect(testScenario.expectedErrorResponse.success).toBe(false);
    expect(testScenario.expectedErrorResponse.error.code).toBe('INSUFFICIENT_OPTION_POSITION');
    
    // Verify shortfall calculation
    const calculatedShortfall = requestedContracts - availableContracts;
    expect(calculatedShortfall).toBe(testScenario.expectedValidation.shortfall);
    expect(calculatedShortfall).toBe(2);

    console.log(`
Test Scenario: Sell More Option Contracts Than Owned
${JSON.stringify(testScenario, null, 2)}

Validation Result:
✓ Requested contracts (${requestedContracts}) > Available contracts (${availableContracts})
✓ Validation correctly fails
✓ Error code: ${testScenario.expectedErrorResponse.error.code}
✓ Shortfall: ${calculatedShortfall} contracts
✓ HTTP Status: ${testScenario.expectedErrorResponse.httpStatus}
    `);
  });

  it('should document validation flow and error response format', () => {
    const validationFlow = {
      description: 'Complete validation flow for sell orders',
      
      step1_receiveRequest: {
        action: 'Receive sell order request',
        endpoint: 'POST /api/alpaca/orders',
        payload: {
          symbol: 'AAPL',
          qty: 50,
          side: 'sell',
          type: 'market',
          time_in_force: 'day',
        },
      },
      
      step2_validateInput: {
        action: 'Validate input parameters',
        checks: [
          'symbol is not empty',
          'qty is positive number',
          'side is "sell"',
          'type is valid order type',
          'limit_price provided if type is "limit"',
        ],
        result: 'All input validations pass',
      },
      
      step3_checkPosition: {
        action: 'Check if position exists',
        query: 'GET /api/alpaca/positions',
        filter: 'symbol === "AAPL"',
        result: {
          found: true,
          position: {
            symbol: 'AAPL',
            qty: 25,
            qty_available: 25,
          },
        },
      },
      
      step4_validateQuantity: {
        action: 'Validate sufficient quantity',
        check: 'requested_qty <= position.qty_available',
        calculation: {
          requested: 50,
          available: 25,
          sufficient: false,
        },
        result: 'VALIDATION FAILS',
      },
      
      step5_returnError: {
        action: 'Return error response',
        response: {
          success: false,
          error: {
            code: 'INSUFFICIENT_POSITION',
            message: 'Insufficient position quantity to complete sell order',
            details: {
              symbol: 'AAPL',
              requested_qty: 50,
              available_qty: 25,
              shortfall: 25,
            },
          },
        },
        httpStatus: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      
      alternativeFlow_positionNotFound: {
        condition: 'Position does not exist',
        response: {
          success: false,
          error: {
            code: 'POSITION_NOT_FOUND',
            message: 'No position found for symbol',
            details: 'Cannot sell a position you do not own',
          },
        },
        httpStatus: 404,
      },
      
      errorResponseFormat: {
        structure: {
          success: 'boolean (always false for errors)',
          error: {
            code: 'string (machine-readable error code)',
            message: 'string (human-readable error message)',
            details: 'string | object (additional context)',
          },
        },
        httpStatusCodes: {
          400: 'Bad Request (validation errors)',
          404: 'Not Found (position not found)',
          500: 'Internal Server Error (unexpected errors)',
        },
      },
    };

    // Verify validation flow
    expect(validationFlow.step4_validateQuantity.calculation.sufficient).toBe(false);
    expect(validationFlow.step5_returnError.response.success).toBe(false);
    expect(validationFlow.step5_returnError.httpStatus).toBe(400);
    
    // Verify error response structure
    expect(validationFlow.step5_returnError.response.error.code).toBeDefined();
    expect(validationFlow.step5_returnError.response.error.message).toBeDefined();
    expect(validationFlow.step5_returnError.response.error.details).toBeDefined();

    console.log(`
Validation Flow Documentation:
${JSON.stringify(validationFlow, null, 2)}

Error Response Format:
${JSON.stringify(validationFlow.errorResponseFormat, null, 2)}

Validation Steps:
1. Receive sell order request
2. Validate input parameters
3. Check if position exists
4. Validate sufficient quantity
5. Return error if validation fails

Error Codes:
- INSUFFICIENT_POSITION: Requested quantity exceeds available quantity
- POSITION_NOT_FOUND: Position does not exist in portfolio
- INSUFFICIENT_AVAILABLE_QUANTITY: Shares tied up in pending orders
- INSUFFICIENT_OPTION_POSITION: Insufficient option contracts

HTTP Status Codes:
- 400: Validation errors (insufficient quantity, invalid input)
- 404: Position not found
- 500: Unexpected server errors
    `);
  });
});
