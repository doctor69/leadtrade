# Database Setup and Funding Integration

## Overview

This document describes the complete database setup for LeadTrade's Alpaca broker integration, including automatic user funding and comprehensive portfolio management.

## 🗄️ Database Schema

### Core Tables

#### `profiles`
User profile information with trading preferences
```sql
- id (UUID, Primary Key)
- username (TEXT)
- full_name (TEXT)
- email (TEXT)
- alpaca_account_id (TEXT)
- trading_mode (TEXT) - 'paper' or 'live'
- is_paper_trading (BOOLEAN)
- share_trades (BOOLEAN)
- show_asset_amounts (BOOLEAN)
- theme_color (TEXT)
```

#### `user_portfolios`
Real-time portfolio balances and metrics
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- total_value (DECIMAL)
- cash_balance (DECIMAL)
- buying_power (DECIMAL)
- day_change (DECIMAL)
- day_change_percent (DECIMAL)
- total_gain_loss (DECIMAL)
- total_gain_loss_percent (DECIMAL)
```

#### `alpaca_accounts`
Alpaca brokerage account information
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- alpaca_account_id (TEXT, Unique)
- alpaca_account_number (TEXT)
- alpaca_account_status (TEXT)
- account_type (TEXT) - 'paper' or 'live'
- alpaca_access_token (TEXT)
- alpaca_refresh_token (TEXT)
- kyc_status (TEXT)
- kyc_data (JSONB)
```

#### `funding_transactions`
Complete funding transaction history
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- alpaca_account_id (TEXT)
- transfer_id (TEXT)
- amount (DECIMAL)
- currency (TEXT)
- status (TEXT) - 'pending', 'completed', 'failed', 'cancelled'
- transfer_type (TEXT) - 'deposit', 'withdrawal'
- funding_source (TEXT) - 'ach', 'wire', 'check'
- description (TEXT)
- alpaca_response (JSONB)
```

#### `portfolio_history`
Historical portfolio performance tracking
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- date (DATE)
- portfolio_value (DECIMAL)
- cash_balance (DECIMAL)
- equity (DECIMAL)
- day_change (DECIMAL)
- day_change_percent (DECIMAL)
```

#### `orders`
Trading order history and status
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- alpaca_order_id (TEXT)
- symbol (TEXT)
- side (TEXT) - 'buy', 'sell'
- quantity (DECIMAL)
- order_type (TEXT)
- time_in_force (TEXT)
- limit_price (DECIMAL)
- stop_price (DECIMAL)
- filled_quantity (DECIMAL)
- filled_avg_price (DECIMAL)
- status (TEXT)
```

#### `account_activities`
Comprehensive account activity log
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- activity_type (TEXT)
- symbol (TEXT)
- quantity (DECIMAL)
- price (DECIMAL)
- amount (DECIMAL)
- description (TEXT)
- activity_data (JSONB)
- activity_date (TIMESTAMPTZ)
```

### Copy Trading Tables

#### `copy_trading_subscriptions`
Leader-follower relationships
```sql
- id (UUID, Primary Key)
- follower_id (UUID, Foreign Key)
- leader_id (UUID, Foreign Key)
- allocation_percentage (DECIMAL)
- is_active (BOOLEAN)
```

#### `trade_executions`
Leader trade executions for copying
```sql
- id (UUID, Primary Key)
- original_trade_id (TEXT)
- leader_id (UUID, Foreign Key)
- symbol (TEXT)
- side (TEXT)
- quantity (DECIMAL)
- price (DECIMAL)
- trade_type (TEXT)
- option_details (JSONB)
- portfolio_percentage (DECIMAL)
```

#### `copied_trades`
Follower trade copies
```sql
- id (UUID, Primary Key)
- original_trade_id (UUID, Foreign Key)
- follower_id (UUID, Foreign Key)
- alpaca_order_id (TEXT)
- symbol (TEXT)
- side (TEXT)
- quantity (DECIMAL)
- allocated_amount (DECIMAL)
- execution_status (TEXT)
```

## 🔧 Database Functions

### `update_portfolio_balance(user_uuid, amount_change, activity_description)`
Updates user portfolio balance and records activity
- Updates `user_portfolios` table
- Inserts activity record in `account_activities`
- Updates daily `portfolio_history`

### `get_user_trading_mode(user_uuid)`
Returns user's current trading mode ('paper' or 'live')

### `handle_new_user()`
Trigger function for new user registration
- Creates user profile
- Initializes portfolio with $1000
- Records initial funding activity
- Sets up portfolio history

### `validate_total_allocation()`
Ensures copy trading allocations don't exceed 100%

### `get_leaderboard_data()`
Returns leaderboard data for copy trading

## 💰 Funding System

### Automatic Initial Funding

New users automatically receive $1000 in paper trading funds:

1. **Signup Process**:
   - User registers via signup Edge Function
   - `handle_new_user()` trigger creates profile and portfolio
   - `initialize-user-funding` Edge Function adds $1000
   - Funding transaction is recorded
   - Account activity is logged

2. **Funding Flow**:
   ```
   User Signup → Profile Creation → Portfolio Initialization → Funding Addition → Activity Logging
   ```

### Manual Funding

Users can add additional funds via the funding system:

1. **Paper Trading**: Instant funding with portfolio updates
2. **Live Trading**: Real Alpaca ACH transfers (1-3 business days)

### Funding Edge Functions

#### `initialize-user-funding`
- Adds initial $1000 to new users
- Prevents duplicate funding
- Records transaction history

#### `alpaca-funding-enhanced`
- **GET**: Retrieves funding history
- **POST**: Processes new funding requests
- Integrates with Alpaca API for live trading
- Updates portfolio balances for paper trading

## 🚀 Deployment

### 1. Apply Database Migrations

```bash
# Deploy all migrations
npm run deploy:database

# Or manually apply migrations
supabase db push
```

### 2. Deploy Edge Functions

```bash
# Deploy all Edge Functions
npm run deploy:functions

# Or deploy specific functions
supabase functions deploy initialize-user-funding
supabase functions deploy alpaca-funding-enhanced
```

### 3. Verify Setup

```bash
# Test database setup
npm run test:database-setup

# Test broker functions
npm run test:broker-functions
```

## 🧪 Testing

### Database Tests
```bash
npm run test:database-setup
```
Tests:
- Table existence and structure
- Database function availability
- Signup and funding flow
- Edge Function accessibility

### Broker Function Tests
```bash
npm run test:broker-functions
```
Tests:
- All Alpaca broker functions
- Risk management features
- Order management
- Portfolio operations

### Manual Testing

1. **Create Test User**:
   ```bash
   npm run test:signup
   ```

2. **Test Funding**:
   ```javascript
   // Via Edge Function
   fetch('/functions/v1/initialize-user-funding', {
     method: 'POST',
     body: JSON.stringify({
       user_id: 'user-uuid',
       initial_amount: 1000
     })
   })
   ```

3. **Verify Portfolio**:
   ```sql
   SELECT * FROM user_portfolios WHERE user_id = 'user-uuid';
   SELECT * FROM funding_transactions WHERE user_id = 'user-uuid';
   SELECT * FROM account_activities WHERE user_id = 'user-uuid';
   ```

## 🔒 Security

### Row Level Security (RLS)
All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- Leaders can see follower copy trades
- Followers can see leader trade executions they follow

### Data Protection
- Sensitive data encrypted at rest
- API keys stored securely in environment variables
- User credentials never stored in plain text
- Audit trail for all financial transactions

## 📊 Monitoring

### Key Metrics to Monitor
- User signup success rate
- Funding completion rate
- Portfolio balance accuracy
- Transaction processing time
- Error rates in Edge Functions

### Database Health Checks
```sql
-- Check for users without portfolios
SELECT u.id FROM auth.users u 
LEFT JOIN user_portfolios p ON u.id = p.user_id 
WHERE p.user_id IS NULL;

-- Check funding transaction status
SELECT status, COUNT(*) FROM funding_transactions 
GROUP BY status;

-- Check portfolio balance consistency
SELECT user_id, total_value, cash_balance, buying_power 
FROM user_portfolios 
WHERE total_value < 0 OR cash_balance < 0;
```

## 🔄 Maintenance

### Regular Tasks
1. **Clean up test data**: Remove test users and transactions
2. **Archive old data**: Move old portfolio history to archive tables
3. **Update statistics**: Refresh leaderboard and performance metrics
4. **Monitor funding**: Check for failed transactions and retry

### Backup Strategy
- Daily automated backups of all tables
- Point-in-time recovery enabled
- Transaction log backup every 15 minutes
- Cross-region backup replication

## 🎯 Production Checklist

- [ ] All migrations applied successfully
- [ ] Edge Functions deployed and tested
- [ ] RLS policies verified
- [ ] Environment variables configured
- [ ] Monitoring and alerting set up
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Team training completed

Your database is now ready for production with comprehensive funding integration! 🚀