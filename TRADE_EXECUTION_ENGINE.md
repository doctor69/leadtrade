# Trade Execution Engine Documentation

## Overview

The Trade Execution Engine is the core component that handles proportional trade copying in the LeadTrade platform. When a leader executes a trade, this engine automatically calculates and executes proportional trades for all their followers based on their allocation percentages.

## Key Features

- **Proportional Trade Calculation**: Calculates the exact quantity each follower should trade based on the leader's portfolio percentage and the follower's allocation
- **Insufficient Funds Handling**: Automatically adjusts trade quantities when followers don't have enough buying power
- **Error Handling**: Comprehensive error handling and logging for failed trades
- **Multi-Asset Support**: Supports both stock and options trading
- **Real-time Execution**: Executes all follower trades immediately after leader trade confirmation

## Architecture

### Core Components

1. **TradeExecutionEngine**: Main class that orchestrates the entire process
2. **Portfolio Calculator**: Utilities for calculating portfolio percentages and trade amounts
3. **Database Service**: Handles all database operations for trade recording
4. **Alpaca Integration**: Manages API calls to Alpaca for account data and order execution

### Data Flow

```
Leader Trade → Portfolio % Calculation → Get Followers → Calculate Proportional Amounts → Execute Follower Trades → Record Results
```

## Requirements Implementation

This engine implements the following requirements:

- **Requirement 4.4**: "WHEN a leader executes a trade using X% of their portfolio THEN the system SHALL execute a proportional trade for each follower using X% of their allocated amount"
- **Requirement 4.5**: "WHEN a follower has insufficient funds for a proportional trade THEN the system SHALL execute the maximum possible trade within their allocated budget"

## Usage

### Basic Usage

```typescript
import { TradeExecutionEngine } from './lib/trade-execution-engine';
import type { LeaderTradeData } from './lib/trade-execution-engine';

// Create leader trade data
const leaderTrade: LeaderTradeData = {
  leaderId: 'leader-123',
  symbol: 'AAPL',
  side: 'buy',
  quantity: 100,
  price: 150.00,
  tradeType: 'stock',
  portfolioPercentage: 15, // 15% of leader's portfolio
  alpacaOrderId: 'alpaca-order-123'
};

// Execute proportional trades
const result = await TradeExecutionEngine.executeProportionalTrades(leaderTrade);

console.log(`Success: ${result.success}`);
console.log(`Copied trades: ${result.copiedTrades.length}`);
```

### API Endpoint Usage

```typescript
// POST /api/copy-trading/execute-trade
const response = await fetch('/api/copy-trading/execute-trade', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    leaderId: 'leader-123',
    symbol: 'AAPL',
    side: 'buy',
    quantity: 100,
    price: 150.00,
    portfolioPercentage: 15,
    alpacaOrderId: 'alpaca-order-123'
  })
});

const result = await response.json();
```

## Trade Calculation Logic

### Proportional Amount Calculation

For each follower, the system calculates:

1. **Allocated Amount**: `followerPortfolioValue * allocationPercentage / 100`
2. **Proportional Amount**: `allocatedAmount * leaderPortfolioPercentage / 100`
3. **Trade Quantity**: `Math.floor(proportionalAmount / sharePrice)`

### Example Calculation

- Leader has $100,000 portfolio, trades $15,000 (15% of portfolio)
- Follower has $10,000 portfolio, allocated 50% to this leader
- Follower's allocated amount: $10,000 * 50% = $5,000
- Follower's proportional amount: $5,000 * 15% = $750
- If share price is $150: Follower trades 5 shares ($750 / $150 = 5)

### Insufficient Funds Handling

When a follower doesn't have enough buying power:

1. Calculate maximum affordable quantity: `Math.floor(buyingPower / sharePrice)`
2. If max quantity > 0: Execute the maximum possible trade
3. If max quantity = 0: Skip the trade and log the reason
4. Record the adjustment in the database for transparency

## Error Handling

The engine handles various error scenarios:

- **Leader Trade Recording Failure**: Returns error immediately
- **Follower Account Access Issues**: Skips that follower, continues with others
- **Insufficient Funds**: Executes maximum possible or skips if none possible
- **Alpaca API Errors**: Records failed trade with error message
- **Network Issues**: Retries with exponential backoff (future enhancement)

## Database Schema

### Trade Executions Table
```sql
CREATE TABLE trade_executions (
  id UUID PRIMARY KEY,
  original_trade_id VARCHAR NOT NULL, -- Alpaca order ID
  leader_id UUID NOT NULL,
  symbol VARCHAR NOT NULL,
  side VARCHAR NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL,
  trade_type VARCHAR NOT NULL,
  option_details JSONB,
  portfolio_percentage DECIMAL,
  executed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Copied Trades Table
```sql
CREATE TABLE copied_trades (
  id UUID PRIMARY KEY,
  original_trade_id UUID NOT NULL, -- References trade_executions.id
  follower_id UUID NOT NULL,
  alpaca_order_id VARCHAR,
  symbol VARCHAR NOT NULL,
  side VARCHAR NOT NULL,
  quantity INTEGER NOT NULL,
  allocated_amount DECIMAL,
  execution_status VARCHAR NOT NULL,
  error_message TEXT,
  executed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Testing

The engine includes comprehensive unit tests covering:

- Successful proportional trade execution
- Insufficient funds scenarios
- Error handling
- Edge cases (no followers, invalid data, etc.)

Run tests with:
```bash
npm run test -- src/lib/__tests__/trade-execution-engine.test.ts
```

## Performance Considerations

- **Parallel Execution**: Follower trades are executed in parallel for speed
- **Database Batching**: Multiple database operations are batched where possible
- **Error Isolation**: One follower's failure doesn't affect others
- **Timeout Handling**: API calls have reasonable timeouts to prevent hanging

## Security Considerations

- **Token Validation**: All Alpaca tokens are validated before use
- **Input Sanitization**: All trade data is validated using Zod schemas
- **Rate Limiting**: API calls are rate-limited to prevent abuse
- **Audit Trail**: All trades are logged for compliance and debugging

## Future Enhancements

- **Retry Logic**: Automatic retry for failed trades due to temporary issues
- **Partial Fill Handling**: Better handling of partially filled orders
- **Real-time Updates**: WebSocket integration for real-time trade status updates
- **Advanced Allocation**: Support for more complex allocation strategies
- **Risk Management**: Built-in risk limits and circuit breakers

## Monitoring and Alerting

Key metrics to monitor:

- Trade execution success rate
- Average execution time
- Failed trade reasons
- Follower participation rate
- Portfolio allocation accuracy

## Support and Troubleshooting

Common issues and solutions:

1. **Trades not executing**: Check follower Alpaca token validity
2. **Incorrect quantities**: Verify portfolio percentage calculations
3. **API errors**: Check Alpaca API status and rate limits
4. **Database errors**: Verify database connectivity and schema

For additional support, check the logs in the `copied_trades` table for detailed error messages.