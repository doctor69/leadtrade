# Cleanup Unnecessary Edge Functions

## Functions to Remove (Testing/Duplicate Functions)

### Signup Functions (Keep only streamlined-signup)
- `signup` - Replace with streamlined-signup
- `signup-with-alpaca` - Duplicate functionality
- `signup-with-alpaca-v2` - Duplicate functionality  
- `signup-validation-enhanced` - Not needed with streamlined approach
- `create-alpaca-account` - Now handled in streamlined-signup

### Testing/Development Functions
- `cleanup-test-data` - Development only
- `rollback-user` - Development only
- `auth` - Duplicate of _shared/auth.ts

### Unused Alpaca Functions (Keep only what's needed for trading)
Keep these for actual trading:
- `alpaca-orders` - For placing orders
- `alpaca-positions` - For getting positions
- `alpaca-account` - For account info
- `market-quotes` - For market data

Remove these (testing/advanced features):
- `alpaca-account-activities` - Can get from API directly
- `alpaca-advanced-orders` - Not needed for MVP
- `alpaca-broker-status` - Not needed
- `alpaca-calendar` - Not needed
- `alpaca-clock` - Not needed
- `alpaca-funding` - Handled in streamlined signup
- `alpaca-funding-enhanced` - Duplicate
- `alpaca-market-data-enhanced` - Use simple market-quotes
- `alpaca-options-orders` - Advanced feature
- `alpaca-options-positions` - Advanced feature
- `alpaca-order-executions` - Can get from API
- `alpaca-portfolio-history` - Can get from API
- `alpaca-risk-management` - Advanced feature
- `alpaca-watchlists` - Not needed for MVP
- `initialize-user-funding` - Now handled in streamlined signup

### Order Management (Keep minimal set)
Keep:
- `alpaca-orders` - Place/get orders
- `cancel-order` - Cancel orders
- `get-order` - Get order status

Remove:
- `modify-order` - Advanced feature

### Market Data (Keep minimal)
Keep:
- `market-quotes` - Basic quotes
- `market-assets` - Asset info

Remove:
- `market-bars` - Advanced charting
- `market-websocket` - Advanced real-time (use simple polling)

## Core Functions to Keep

### Essential for MVP:
1. `streamlined-signup` - Complete signup process
2. `alpaca-orders` - Place/manage orders  
3. `alpaca-positions` - Get positions
4. `alpaca-account` - Get account info
5. `market-quotes` - Get stock prices
6. `market-assets` - Get asset info
7. `cancel-order` - Cancel orders
8. `get-order` - Get order status
9. `copy-trading-subscriptions` - Core copy trading feature

### Shared utilities:
- `_shared/*` - Keep all shared utilities

## Cleanup Commands

```bash
# Remove unnecessary signup functions
rm -rf supabase/functions/signup
rm -rf supabase/functions/signup-with-alpaca  
rm -rf supabase/functions/signup-with-alpaca-v2
rm -rf supabase/functions/signup-validation-enhanced
rm -rf supabase/functions/create-alpaca-account

# Remove testing functions
rm -rf supabase/functions/cleanup-test-data
rm -rf supabase/functions/rollback-user
rm -rf supabase/functions/auth

# Remove advanced/unused Alpaca functions
rm -rf supabase/functions/alpaca-account-activities
rm -rf supabase/functions/alpaca-advanced-orders
rm -rf supabase/functions/alpaca-broker-status
rm -rf supabase/functions/alpaca-calendar
rm -rf supabase/functions/alpaca-clock
rm -rf supabase/functions/alpaca-funding
rm -rf supabase/functions/alpaca-funding-enhanced
rm -rf supabase/functions/alpaca-market-data-enhanced
rm -rf supabase/functions/alpaca-options-orders
rm -rf supabase/functions/alpaca-options-positions
rm -rf supabase/functions/alpaca-order-executions
rm -rf supabase/functions/alpaca-portfolio-history
rm -rf supabase/functions/alpaca-risk-management
rm -rf supabase/functions/alpaca-watchlists
rm -rf supabase/functions/initialize-user-funding

# Remove advanced features
rm -rf supabase/functions/modify-order
rm -rf supabase/functions/market-bars
rm -rf supabase/functions/market-websocket
```

## Result: Clean Function Structure

```
supabase/functions/
├── _shared/                    # Shared utilities
├── streamlined-signup/         # Complete signup process
├── alpaca-account/            # Account info
├── alpaca-orders/             # Order management
├── alpaca-positions/          # Position info
├── market-quotes/             # Stock prices
├── market-assets/             # Asset info
├── cancel-order/              # Cancel orders
├── get-order/                 # Order status
└── copy-trading-subscriptions/ # Copy trading
```

This reduces complexity from 30+ functions to just 9 essential functions focused on the core MVP functionality.