// Example usage of the Trade Execution Engine
import { TradeExecutionEngine } from './trade-execution-engine';
import { calculatePortfolioPercentage } from './portfolio-calculator';
import type { LeaderTradeData } from './trade-execution-engine';

/**
 * Example: Leader executes a trade and it gets copied to followers
 */
export async function exampleTradeExecution() {
  // Step 1: Leader places a trade (this would typically come from Alpaca webhook or order confirmation)
  const leaderUserId = 'leader-123';
  const leaderAccessToken = 'leader-alpaca-token';
  
  // Calculate what percentage of the leader's portfolio this trade represents
  const portfolioCalc = await calculatePortfolioPercentage(
    'AAPL',
    100, // 100 shares
    150.00, // $150 per share
    leaderAccessToken,
    'paper'
  );

  if (!portfolioCalc.success) {
    console.error('Failed to calculate portfolio percentage:', portfolioCalc.error);
    return;
  }

  // Step 2: Create the leader trade data
  const leaderTrade: LeaderTradeData = {
    leaderId: leaderUserId,
    symbol: 'AAPL',
    side: 'buy',
    quantity: 100,
    price: 150.00,
    tradeType: 'stock',
    portfolioPercentage: portfolioCalc.portfolioPercentage, // e.g., 15% of portfolio
    alpacaOrderId: 'alpaca-order-123'
  };

  console.log(`Leader trade: ${leaderTrade.quantity} shares of ${leaderTrade.symbol} at $${leaderTrade.price}`);
  console.log(`This represents ${leaderTrade.portfolioPercentage}% of leader's portfolio`);

  // Step 3: Execute proportional trades for all followers
  const result = await TradeExecutionEngine.executeProportionalTrades(leaderTrade);

  // Step 4: Log the results
  console.log('\n=== Trade Execution Results ===');
  console.log(`Success: ${result.success}`);
  console.log(`Original Trade ID: ${result.originalTradeId}`);
  console.log(`Total Followers: ${result.copiedTrades.length}`);
  console.log(`Successful Copies: ${result.copiedTrades.filter(t => t.success).length}`);
  console.log(`Failed Copies: ${result.copiedTrades.filter(t => !t.success).length}`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(error => console.log(`- ${error}`));
  }

  console.log('\n=== Individual Follower Results ===');
  result.copiedTrades.forEach((trade, index) => {
    console.log(`\nFollower ${index + 1} (${trade.followerId}):`);
    console.log(`  Success: ${trade.success}`);
    console.log(`  Quantity: ${trade.quantity} shares`);
    console.log(`  Allocated Amount: $${trade.allocatedAmount.toFixed(2)}`);
    console.log(`  Status: ${trade.executionStatus}`);
    
    if (trade.alpacaOrderId) {
      console.log(`  Alpaca Order ID: ${trade.alpacaOrderId}`);
    }
    
    if (trade.error) {
      console.log(`  Error: ${trade.error}`);
    }
  });

  return result;
}

/**
 * Example: Handle different scenarios
 */
export async function exampleScenarios() {
  console.log('=== Copy Trading Execution Scenarios ===\n');

  // Scenario 1: Normal execution
  console.log('Scenario 1: Normal proportional execution');
  await exampleTradeExecution();

  // Scenario 2: Large trade that might trigger insufficient funds
  console.log('\n\nScenario 2: Large trade (50% of portfolio)');
  const largeTrade: LeaderTradeData = {
    leaderId: 'leader-123',
    symbol: 'TSLA',
    side: 'buy',
    quantity: 50,
    price: 800.00,
    tradeType: 'stock',
    portfolioPercentage: 50, // Large percentage
    alpacaOrderId: 'large-order-123'
  };

  const largeTradeResult = await TradeExecutionEngine.executeProportionalTrades(largeTrade);
  console.log(`Large trade result - Success: ${largeTradeResult.success}, Copies: ${largeTradeResult.copiedTrades.length}`);

  // Scenario 3: Options trade
  console.log('\n\nScenario 3: Options trade');
  const optionsTrade: LeaderTradeData = {
    leaderId: 'leader-123',
    symbol: 'SPY',
    side: 'buy',
    quantity: 10,
    price: 5.50,
    tradeType: 'option',
    optionDetails: {
      strike: 450,
      expiration: '2024-12-20',
      option_type: 'call'
    },
    portfolioPercentage: 2.5,
    alpacaOrderId: 'options-order-123'
  };

  const optionsResult = await TradeExecutionEngine.executeProportionalTrades(optionsTrade);
  console.log(`Options trade result - Success: ${optionsResult.success}, Copies: ${optionsResult.copiedTrades.length}`);
}

/**
 * Example: Error handling and edge cases
 */
export async function exampleErrorHandling() {
  console.log('=== Error Handling Examples ===\n');

  // Test with invalid leader ID
  const invalidTrade: LeaderTradeData = {
    leaderId: 'non-existent-leader',
    symbol: 'AAPL',
    side: 'buy',
    quantity: 100,
    price: 150.00,
    tradeType: 'stock',
    portfolioPercentage: 10,
    alpacaOrderId: 'invalid-order-123'
  };

  const result = await TradeExecutionEngine.executeProportionalTrades(invalidTrade);
  console.log(`Invalid leader result - Success: ${result.success}, Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('Errors encountered:');
    result.errors.forEach(error => console.log(`- ${error}`));
  }
}

// Export for use in other parts of the application
export { TradeExecutionEngine };