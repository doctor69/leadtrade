# Alpaca Broker API Integration

This document describes the comprehensive Alpaca broker API integration implemented via Supabase Edge Functions.

## Overview

The LeadTrade platform integrates with Alpaca Markets to provide full broker functionality including:

- Account management and information
- Order placement and management (stocks and options)
- Position tracking and management
- Portfolio history and analytics
- Watchlist management
- Market data and calendar information
- Advanced order types (bracket, OCO, trailing stop)

## Architecture

```
Frontend (React) → Alpaca Broker Client → Edge Function Client → Supabase Edge Functions → Alpaca API
```

### Components

1. **Supabase Edge Functions** (`supabase/functions/alpaca-*`): Server-side functions that handle Alpaca API calls
2. **Alpaca Broker Client** (`src/lib/alpaca-broker-client.ts`): TypeScript client for frontend integration
3. **React Hooks** (`src/hooks/useAlpacaBroker.ts`): React hooks for state management
4. **UI Components** (`src/components/trading/AlpacaBrokerDashboard.tsx`): Ready-to-use trading interface

## Edge Functions

### Account Management

#### `alpaca-account`
- **GET**: Retrieve account information
- **Response**: Account details including buying power, equity, cash, etc.

#### `alpaca-portfolio-history`
- **GET**: Retrieve portfolio performance history
- **Query Parameters**: `period`, `timeframe`, `date_end`, `extended_hours`

#### `alpaca-account-activities`
- **GET**: Retrieve account activities and transactions
- **Query Parameters**: `activity_type`, `date`, `until`, `after`, `direction`, `page_size`, `page_token`

### Order Management

#### `alpaca-orders`
- **GET**: List orders with filtering
- **POST**: Place new order
- **DELETE**: Cancel order
- **Query Parameters**: `status`, `limit`, `after`, `until`, `direction`, `nested`, `symbols`

#### `get-order`
- **GET**: Get specific order by ID with enhanced computed fields
- **Query Parameters**: `orderId`, `includeExecutions` (optional boolean for detailed execution data)
- **Enhanced Data**: Includes computed fields like `is_active`, `is_cancelable`, `is_modifiable`, `filled_percentage`, `remaining_qty`, `estimated_value`, and time calculations

#### `cancel-order`
- **DELETE**: Cancel specific order or all orders with comprehensive validation
- **Query Parameters**: `orderId` (for specific order), `all=true` (for all orders)
- **Validation**: Checks order status and ensures only cancelable orders are processed

#### `modify-order`
- **PUT**: Modify existing order with comprehensive validation
- **Query Parameters**: `orderId`
- **Body**: Updated order parameters (`qty`, `time_in_force`, `limit_price`, `stop_price`, `trail`, `client_order_id`)
- **Validation**: Ensures order is in modifiable state and validates price fields based on order type

#### `alpaca-advanced-orders`
- **POST**: Place advanced order types
- **Query Parameters**: `type` (bracket, oco, trailing_stop)
- **Supports**: Bracket orders, OCO orders, trailing stop orders

### Position Management

#### `alpaca-positions`
- **GET**: List positions
- **DELETE**: Close position(s)
- **Query Parameters**: `symbols`, `symbol`, `qty`, `percentage`

### Options Trading

#### `alpaca-options-orders`
- **GET**: List options orders
- **POST**: Place options order

#### `alpaca-options-positions`
- **GET**: List options positions

### Watchlist Management

#### `alpaca-watchlists`
- **GET**: List watchlists or get specific watchlist
- **POST**: Create watchlist or add symbols
- **PUT**: Update watchlist name
- **DELETE**: Delete watchlist or remove symbols
- **Query Parameters**: `watchlistId`, `action` (add/remove)

### Market Data

#### `alpaca-assets`
- **GET**: List assets or get specific asset
- **Query Parameters**: `status`, `asset_class`, `exchange`, `attributes`, `symbol`

#### `alpaca-calendar`
- **GET**: Get market calendar
- **Query Parameters**: `start`, `end`

#### `alpaca-clock`
- **GET**: Get current market status and time

#### `market-quotes`
- **GET**: Get real-time market quotes
- **Query Parameters**: `symbols`, `feed`, `limit`

#### `market-bars`
- **GET**: Get historical price bars

### Funding

#### `alpaca-funding`
- **GET**: Get funding information and bank transfers

### Risk Management

#### `alpaca-risk-management`
- **GET**: Get current risk metrics and limits
- **POST**: Assess trade risk for proposed orders
- **Features**: Position concentration, day trading limits, buying power checks

#### `alpaca-broker-status`
- **GET**: Comprehensive broker health check
- **Features**: Account connectivity, market status, API health, trading readiness

### Order Executions

#### `alpaca-order-executions`
- **GET**: Get order executions (fills) with filtering
- **Query Parameters**: `order_id`, `symbol`, `start_date`, `end_date`, `limit`, `page_token`

### Enhanced Order Management

#### `modify-order`
- **PUT**: Modify existing orders
- **Body**: Updated order parameters (qty, prices, time_in_force)

#### `cancel-order`
- **DELETE**: Cancel specific order or all orders
- **Query Parameters**: `orderId`, `all` (boolean)

#### `get-order`
- **GET**: Get detailed order information
- **Query Parameters**: `orderId`, `includeExecutions` (boolean)

## Frontend Integration

### Alpaca Broker Client

```typescript
import { alpacaBrokerClient } from '@/lib/alpaca-broker-client'

// Get account information
const account = await alpacaBrokerClient.getAccount()

// Place an order
const order = await alpacaBrokerClient.createOrder({
  symbol: 'AAPL',
  qty: 10,
  side: 'buy',
  type: 'market',
  time_in_force: 'day'
})

// Get positions
const positions = await alpacaBrokerClient.getPositions()

// Create watchlist
const watchlist = await alpacaBrokerClient.createWatchlist({
  name: 'Tech Stocks',
  symbols: ['AAPL', 'GOOGL', 'MSFT']
})

// Get broker status
const status = await alpacaBrokerClient.getBrokerStatus()

// Assess trade risk
const riskAssessment = await alpacaBrokerClient.assessTradeRisk({
  symbol: 'AAPL',
  qty: 100,
  side: 'buy',
  price: 150.00
})

// Get order executions
const executions = await alpacaBrokerClient.getOrderExecutions({
  symbol: 'AAPL',
  start_date: '2024-01-01'
})
```

### React Hooks

```typescript
import { useAlpacaBroker, useAlpacaAccount, useMarketStatus } from '@/hooks/useAlpacaBroker'

function TradingComponent() {
  const {
    account,
    positions,
    orders,
    isLoading,
    error,
    placeOrder,
    cancelOrder,
    closePosition
  } = useAlpacaBroker()

  const { isOpen: marketIsOpen } = useMarketStatus()

  // Component logic here
}
```

### UI Components

```typescript
import { AlpacaBrokerDashboard } from '@/components/trading/AlpacaBrokerDashboard'

function TradingPage() {
  return <AlpacaBrokerDashboard />
}
```

## Order Types

### Basic Orders

```typescript
// Market Order
await alpacaBrokerClient.createOrder({
  symbol: 'AAPL',
  qty: 10,
  side: 'buy',
  type: 'market'
})

// Limit Order
await alpacaBrokerClient.createOrder({
  symbol: 'AAPL',
  qty: 10,
  side: 'buy',
  type: 'limit',
  limit_price: 150.00
})

// Stop Order
await alpacaBrokerClient.createOrder({
  symbol: 'AAPL',
  qty: 10,
  side: 'sell',
  type: 'stop',
  stop_price: 140.00
})
```

### Advanced Orders

```typescript
// Bracket Order (with take profit and stop loss)
await alpacaBrokerClient.createBracketOrder({
  symbol: 'AAPL',
  qty: 10,
  side: 'buy',
  type: 'limit',
  limit_price: 150.00,
  take_profit: {
    limit_price: 160.00
  },
  stop_loss: {
    stop_price: 140.00
  }
})

// Trailing Stop Order
await alpacaBrokerClient.createTrailingStopOrder({
  symbol: 'AAPL',
  qty: 10,
  side: 'sell',
  trail_percent: 5.0 // 5% trailing stop
})
```

### Options Orders

```typescript
// Options Order
await alpacaBrokerClient.createOrder({
  symbol: 'AAPL',
  qty: 1,
  side: 'buy',
  type: 'limit',
  limit_price: 2.50,
  trade_type: 'option',
  option_details: {
    strike: 150,
    expiration: '2024-01-19',
    option_type: 'call'
  }
})
```

## Error Handling

All functions return a standardized response format:

```typescript
interface EdgeFunctionResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  timestamp?: string
}
```

### Error Codes

- `ALPACA_API_ERROR`: Error from Alpaca API
- `AUTHENTICATION_FAILED`: Authentication issues
- `INVALID_REQUEST`: Invalid request parameters
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `DATABASE_ERROR`: Database operation failed
- `INTERNAL_ERROR`: Unexpected server error

## Authentication

All functions require user authentication via Supabase Auth. The authentication flow:

1. User authenticates with Supabase Auth
2. Edge functions validate the auth token
3. User's Alpaca credentials are retrieved from the database
4. Alpaca API calls are made with user's credentials

## Environment Variables

Required environment variables for Alpaca integration:

```bash
# Alpaca Paper Trading (Sandbox)
PUBLIC_ALPACA_PAPER_BROKER_BASE_URL=https://paper-api.alpaca.markets
PUBLIC_ALPACA_PAPER_DATA_BASE_URL=https://data.alpaca.markets
PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY=your_sandbox_key
PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET=your_sandbox_secret

# Alpaca Live Trading (Production)
PUBLIC_ALPACA_LIVE_BROKER_BASE_URL=https://api.alpaca.markets
PUBLIC_ALPACA_LIVE_DATA_BASE_URL=https://data.alpaca.markets
PUBLIC_ALPACA_BROKER_LIVE_API_KEY=your_live_key
PUBLIC_ALPACA_BROKER_LIVE_API_SECRET=your_live_secret

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
```

## Database Schema

The integration requires these database tables:

```sql
-- Alpaca accounts
CREATE TABLE alpaca_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_account_id TEXT NOT NULL,
  alpaca_account_number TEXT,
  alpaca_account_status TEXT,
  account_type TEXT DEFAULT 'paper',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles with Alpaca integration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alpaca_account_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alpaca_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_paper_trading BOOLEAN DEFAULT true;
```

## Rate Limits

Alpaca API has rate limits:
- 200 requests per minute for most endpoints
- 1000 requests per minute for market data endpoints

The Edge Functions implement automatic retry with exponential backoff for rate limit handling.

## Testing

Use the provided test scripts to verify functionality:

```bash
# Test account creation
node scripts/test-signup.js

# Test portfolio balance
node scripts/test-portfolio-balance.js
```

## Security

- All API keys are stored securely in environment variables
- User credentials are encrypted in the database
- Edge Functions validate authentication on every request
- CORS is properly configured for frontend access

## Monitoring

Monitor Edge Function performance and errors through:
- Supabase Dashboard → Edge Functions
- Application logs for debugging
- Error tracking in the frontend hooks