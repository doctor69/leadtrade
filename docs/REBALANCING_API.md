# Alpaca Rebalancing API Integration

Complete guide for implementing automated portfolio rebalancing using the Alpaca Broker API.

## Overview

The Rebalancing API allows you to create portfolio templates with target asset weights and automatically rebalance accounts to maintain those allocations. This is useful for:

- **Model Portfolios**: Create and manage standardized investment strategies
- **Automated Rebalancing**: Maintain target allocations without manual intervention
- **Multi-Account Management**: Apply the same strategy across multiple accounts
- **Drift Management**: Automatically correct portfolio drift from target weights

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Application                      │
│  (src/lib/alpaca-rebalancing.ts)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Function                          │
│  (supabase/functions/alpaca-rebalancing/index.ts)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Alpaca Broker API                           │
│  POST /v1/rebalancing/portfolios                            │
│  POST /v1/rebalancing/portfolios/{id}/subscriptions         │
│  POST /v1/rebalancing/runs                                  │
│  GET  /v1/rebalancing/runs                                  │
│  DELETE /v1/rebalancing/runs/{id}                           │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Tables

#### `rebalancing_portfolios`
Stores portfolio definitions with target weights and rebalancing rules.

```sql
CREATE TABLE rebalancing_portfolios (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES user_profiles(id),
  alpaca_portfolio_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  weights JSONB NOT NULL,
  cooldown_days INTEGER DEFAULT 0,
  rebalance_conditions JSONB,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### `rebalancing_subscriptions`
Links accounts to portfolios for automatic rebalancing.

```sql
CREATE TABLE rebalancing_subscriptions (
  id UUID PRIMARY KEY,
  portfolio_id UUID REFERENCES rebalancing_portfolios(id),
  account_id UUID REFERENCES user_profiles(id),
  alpaca_subscription_id TEXT UNIQUE,
  allocation_percentage DECIMAL(5,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### `rebalancing_runs`
Tracks execution history of rebalancing operations.

```sql
CREATE TABLE rebalancing_runs (
  id UUID PRIMARY KEY,
  portfolio_id UUID REFERENCES rebalancing_portfolios(id),
  alpaca_run_id TEXT UNIQUE,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reason TEXT,
  orders JSONB DEFAULT '[]',
  failed_orders JSONB DEFAULT '[]',
  skipped_orders JSONB DEFAULT '[]',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

## API Reference

### Portfolio Management

#### Create Portfolio

Create a new rebalancing portfolio with target weights.

```typescript
import { createRebalancingPortfolio } from '@/lib/alpaca-rebalancing'

const result = await createRebalancingPortfolio({
  name: 'Balanced Growth',
  description: '60/40 stocks/bonds allocation',
  weights: {
    'SPY': 0.40,   // 40% S&P 500
    'QQQ': 0.20,   // 20% Nasdaq
    'AGG': 0.30,   // 30% Bonds
    'GLD': 0.10    // 10% Gold
  },
  cooldown_days: 30,
  rebalance_conditions: {
    drift_threshold: 0.05  // Rebalance when drift exceeds 5%
  }
})

if (result.success) {
  console.log('Portfolio created:', result.data)
}
```

**Request Body:**
```typescript
{
  name: string                    // Portfolio name
  description?: string            // Optional description
  weights: Record<string, number> // Target weights (must sum to 1.0)
  cooldown_days: number          // Minimum days between rebalances
  rebalance_conditions?: {       // Optional automatic rebalancing rules
    drift_threshold?: number     // Trigger when drift exceeds this value
    schedule?: string            // Cron expression for scheduled rebalancing
  }
}
```

**Response:**
```typescript
{
  success: boolean
  data?: {
    id: string
    name: string
    description?: string
    weights: Record<string, number>
    cooldown_days: number
    rebalance_conditions?: object
    status: 'active' | 'inactive'
    created_at: string
    updated_at: string
  }
  error?: {
    status: number
    message: string
  }
}
```

#### List Portfolios

Retrieve all rebalancing portfolios for the authenticated user.

```typescript
import { listRebalancingPortfolios } from '@/lib/alpaca-rebalancing'

const result = await listRebalancingPortfolios()

if (result.success) {
  result.data.forEach(portfolio => {
    console.log(`${portfolio.name}: ${Object.keys(portfolio.weights).length} assets`)
  })
}
```

#### Get Portfolio

Retrieve details for a specific portfolio.

```typescript
import { getRebalancingPortfolio } from '@/lib/alpaca-rebalancing'

const result = await getRebalancingPortfolio('portfolio-id')
```

#### Update Portfolio

Update portfolio weights or settings.

```typescript
import { updateRebalancingPortfolio } from '@/lib/alpaca-rebalancing'

const result = await updateRebalancingPortfolio('portfolio-id', {
  weights: {
    'SPY': 0.50,
    'AGG': 0.50
  },
  cooldown_days: 60
})
```

#### Delete Portfolio

Delete a portfolio (will also delete all subscriptions).

```typescript
import { deleteRebalancingPortfolio } from '@/lib/alpaca-rebalancing'

const result = await deleteRebalancingPortfolio('portfolio-id')
```

### Subscription Management

#### Create Subscription

Subscribe an account to a rebalancing portfolio.

```typescript
import { createRebalancingSubscription } from '@/lib/alpaca-rebalancing'

const result = await createRebalancingSubscription('portfolio-id', {
  account_id: 'alpaca-account-id',
  allocation_percentage: 75  // Use 75% of account for this portfolio
})

if (result.success) {
  console.log('Subscription created:', result.data)
}
```

**Request Body:**
```typescript
{
  account_id: string           // Alpaca account ID
  allocation_percentage: number // Percentage of account (0-100)
}
```

**Response:**
```typescript
{
  success: boolean
  data?: {
    id: string
    portfolio_id: string
    account_id: string
    allocation_percentage: number
    is_active: boolean
    created_at: string
    updated_at: string
  }
}
```

#### List Subscriptions

List all subscriptions for a portfolio.

```typescript
import { listRebalancingSubscriptions } from '@/lib/alpaca-rebalancing'

const result = await listRebalancingSubscriptions('portfolio-id')
```

#### Update Subscription

Update subscription settings.

```typescript
import { updateRebalancingSubscription } from '@/lib/alpaca-rebalancing'

const result = await updateRebalancingSubscription(
  'portfolio-id',
  'subscription-id',
  {
    allocation_percentage: 50,
    is_active: true
  }
)
```

#### Delete Subscription

Remove an account's subscription to a portfolio.

```typescript
import { deleteRebalancingSubscription } from '@/lib/alpaca-rebalancing'

const result = await deleteRebalancingSubscription(
  'portfolio-id',
  'subscription-id'
)
```

### Rebalancing Run Management

#### Create Rebalancing Run

Manually trigger a rebalancing run for a portfolio.

```typescript
import { createRebalancingRun } from '@/lib/alpaca-rebalancing'

const result = await createRebalancingRun({
  portfolio_id: 'portfolio-id',
  type: 'manual',
  reason: 'Monthly rebalancing'
})

if (result.success) {
  console.log('Rebalancing run started:', result.data)
  console.log('Orders created:', result.data.orders.length)
}
```

**Request Body:**
```typescript
{
  portfolio_id: string
  type?: 'manual' | 'automatic' | 'scheduled'
  reason?: string  // Optional reason for the rebalancing
}
```

**Response:**
```typescript
{
  success: boolean
  data?: {
    id: string
    portfolio_id: string
    type: 'manual' | 'automatic' | 'scheduled'
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'canceled'
    reason?: string
    orders: string[]           // Array of order IDs
    failed_orders: object[]    // Failed order details
    skipped_orders: object[]   // Skipped order details
    error_message?: string
    started_at?: string
    completed_at?: string
    created_at: string
    updated_at: string
  }
}
```

#### List Rebalancing Runs

List rebalancing runs with optional filtering.

```typescript
import { listRebalancingRuns } from '@/lib/alpaca-rebalancing'

// List all runs
const allRuns = await listRebalancingRuns()

// Filter by portfolio
const portfolioRuns = await listRebalancingRuns({
  portfolio_id: 'portfolio-id'
})

// Filter by status
const completedRuns = await listRebalancingRuns({
  status: 'completed',
  limit: 10
})
```

**Query Parameters:**
```typescript
{
  portfolio_id?: string  // Filter by portfolio
  status?: string        // Filter by status
  limit?: number         // Limit results
  offset?: number        // Pagination offset
}
```

#### Get Rebalancing Run

Get details for a specific run.

```typescript
import { getRebalancingRun } from '@/lib/alpaca-rebalancing'

const result = await getRebalancingRun('run-id')

if (result.success) {
  console.log('Status:', result.data.status)
  console.log('Orders:', result.data.orders)
  console.log('Failed:', result.data.failed_orders)
}
```

#### Cancel Rebalancing Run

Cancel a pending or in-progress rebalancing run.

```typescript
import { cancelRebalancingRun } from '@/lib/alpaca-rebalancing'

const result = await cancelRebalancingRun('run-id')

if (result.success) {
  console.log('Rebalancing run canceled')
}
```

## Helper Functions

### Validate Portfolio Weights

Ensure portfolio weights sum to 1.0 (100%).

```typescript
import { validatePortfolioWeights } from '@/lib/alpaca-rebalancing'

const weights = {
  'SPY': 0.60,
  'AGG': 0.40
}

const validation = validatePortfolioWeights(weights)

if (!validation.valid) {
  console.error('Invalid weights:', validation.error)
}
```

### Calculate Portfolio Drift

Calculate how much current weights have drifted from target.

```typescript
import { calculatePortfolioDrift } from '@/lib/alpaca-rebalancing'

const currentWeights = {
  'SPY': 0.65,
  'AGG': 0.35
}

const targetWeights = {
  'SPY': 0.60,
  'AGG': 0.40
}

const drift = calculatePortfolioDrift(currentWeights, targetWeights)
console.log(`Portfolio drift: ${(drift * 100).toFixed(2)}%`)
```

### Check if Rebalancing is Needed

Determine if rebalancing should be triggered based on drift threshold.

```typescript
import { shouldRebalance } from '@/lib/alpaca-rebalancing'

const needsRebalancing = shouldRebalance(
  currentWeights,
  targetWeights,
  0.05  // 5% drift threshold
)

if (needsRebalancing) {
  console.log('Portfolio needs rebalancing')
}
```

## Usage Examples

### Example 1: Create and Subscribe to Portfolio

```typescript
import {
  createRebalancingPortfolio,
  createRebalancingSubscription,
  createRebalancingRun
} from '@/lib/alpaca-rebalancing'

// 1. Create portfolio
const portfolio = await createRebalancingPortfolio({
  name: 'Conservative Growth',
  description: '70/30 stocks/bonds',
  weights: {
    'VTI': 0.70,  // Total Stock Market
    'BND': 0.30   // Total Bond Market
  },
  cooldown_days: 30,
  rebalance_conditions: {
    drift_threshold: 0.05
  }
})

if (!portfolio.success) {
  console.error('Failed to create portfolio:', portfolio.error)
  return
}

// 2. Subscribe account
const subscription = await createRebalancingSubscription(
  portfolio.data.id,
  {
    account_id: 'my-alpaca-account-id',
    allocation_percentage: 100
  }
)

if (!subscription.success) {
  console.error('Failed to subscribe:', subscription.error)
  return
}

// 3. Trigger initial rebalancing
const run = await createRebalancingRun({
  portfolio_id: portfolio.data.id,
  type: 'manual',
  reason: 'Initial portfolio setup'
})

if (run.success) {
  console.log('Rebalancing started:', run.data.id)
  console.log('Orders created:', run.data.orders.length)
}
```

### Example 2: Monitor Rebalancing Status

```typescript
import { getRebalancingRun } from '@/lib/alpaca-rebalancing'

async function monitorRebalancing(runId: string) {
  const result = await getRebalancingRun(runId)
  
  if (!result.success) {
    console.error('Failed to get run status:', result.error)
    return
  }

  const run = result.data
  
  console.log(`Status: ${run.status}`)
  console.log(`Orders: ${run.orders.length}`)
  console.log(`Failed: ${run.failed_orders.length}`)
  console.log(`Skipped: ${run.skipped_orders.length}`)
  
  if (run.status === 'completed') {
    console.log('Rebalancing completed successfully!')
  } else if (run.status === 'failed') {
    console.error('Rebalancing failed:', run.error_message)
  }
}
```

### Example 3: Automatic Drift-Based Rebalancing

```typescript
import {
  getRebalancingPortfolio,
  shouldRebalance,
  createRebalancingRun
} from '@/lib/alpaca-rebalancing'

async function checkAndRebalance(portfolioId: string, currentWeights: Record<string, number>) {
  // Get portfolio details
  const portfolio = await getRebalancingPortfolio(portfolioId)
  
  if (!portfolio.success) {
    console.error('Failed to get portfolio:', portfolio.error)
    return
  }

  // Check if rebalancing is needed
  const driftThreshold = portfolio.data.rebalance_conditions?.drift_threshold || 0.05
  
  if (shouldRebalance(currentWeights, portfolio.data.weights, driftThreshold)) {
    console.log('Drift threshold exceeded, triggering rebalancing...')
    
    const run = await createRebalancingRun({
      portfolio_id: portfolioId,
      type: 'automatic',
      reason: 'Drift threshold exceeded'
    })
    
    if (run.success) {
      console.log('Automatic rebalancing started:', run.data.id)
    }
  } else {
    console.log('Portfolio within drift threshold, no rebalancing needed')
  }
}
```

## Error Handling

All API functions return a consistent response format:

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    status: number
    message: string
  }
}
```

Always check the `success` field before accessing `data`:

```typescript
const result = await createRebalancingPortfolio(request)

if (result.success) {
  // Safe to access result.data
  console.log('Portfolio ID:', result.data.id)
} else {
  // Handle error
  console.error(`Error ${result.error.status}: ${result.error.message}`)
}
```

## Common Error Codes

- **400 Bad Request**: Invalid request parameters (e.g., weights don't sum to 1.0)
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Portfolio, subscription, or run not found
- **409 Conflict**: Duplicate portfolio name or subscription already exists
- **500 Internal Server Error**: Server-side error

## Best Practices

1. **Weight Validation**: Always validate that portfolio weights sum to exactly 1.0 before creating or updating portfolios.

2. **Cooldown Periods**: Set appropriate cooldown periods to avoid excessive trading and transaction costs.

3. **Drift Thresholds**: Use reasonable drift thresholds (typically 3-10%) to balance rebalancing frequency with transaction costs.

4. **Monitor Runs**: Always check the status of rebalancing runs and handle failed orders appropriately.

5. **Allocation Percentage**: Consider using less than 100% allocation to maintain cash reserves for opportunities.

6. **Error Handling**: Implement proper error handling for all API calls, especially for rebalancing runs.

## Security Considerations

- All API calls require authentication via Supabase session token
- Row Level Security (RLS) policies ensure users can only access their own portfolios and subscriptions
- Portfolio weights are validated server-side to prevent invalid configurations
- Rebalancing runs are tracked in the database for audit purposes

## Testing

The rebalancing implementation includes comprehensive tests covering:

- Portfolio creation and validation
- Subscription management
- Rebalancing run execution
- Weight validation and drift calculation
- Error handling and edge cases

Run tests with:
```bash
npm run test -- alpaca-rebalancing
```

## Related Documentation

- [Alpaca Broker API Documentation](https://alpaca.markets/docs/broker/)
- [Trading Configuration](./TRADING_CONFIGURATION.md)
- [Portfolio Management](./PORTFOLIO_MANAGEMENT.md)
- [Order Management](./ORDER_MANAGEMENT.md)

## Support

For issues or questions:
- Check the [Alpaca API Status](https://status.alpaca.markets/)
- Review [Alpaca Documentation](https://alpaca.markets/docs/)
- Contact support at support@alpaca.markets
