# Copy Trading Database Schema

This document describes the database schema and data models for the LeadTrade copy trading system.

## Overview

The copy trading system uses Supabase as the backend database with PostgreSQL. The schema includes tables for user profiles, copy trading subscriptions, trade executions, and copied trades.

## Database Tables

### 1. profiles (Extended User Profiles)

Extends the base Supabase auth.users table with copy trading specific fields.

```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  alpaca_access_token TEXT,           -- Encrypted Alpaca API token
  alpaca_refresh_token TEXT,          -- Encrypted Alpaca refresh token
  is_paper_trading BOOLEAN DEFAULT true,
  share_trades BOOLEAN DEFAULT false,
  show_asset_amounts BOOLEAN DEFAULT false,
  theme_color TEXT DEFAULT '#ef4444',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. copy_trading_subscriptions

Manages leader-follower relationships and allocation percentages.

```sql
CREATE TABLE public.copy_trading_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  leader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  allocation_percentage DECIMAL(5,2) CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, leader_id)
);
```

### 3. trade_executions

Stores leader trade executions that can be copied by followers.

```sql
CREATE TABLE public.trade_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_trade_id TEXT NOT NULL,    -- Alpaca order ID
  leader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL(10,4) NOT NULL,
  price DECIMAL(10,4),
  trade_type TEXT NOT NULL CHECK (trade_type IN ('stock', 'option')),
  option_details JSONB,               -- For options: strike, expiration, type
  portfolio_percentage DECIMAL(5,2),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. copied_trades

Tracks follower trades that copy leader executions.

```sql
CREATE TABLE public.copied_trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_trade_id UUID REFERENCES public.trade_executions(id) ON DELETE CASCADE,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_order_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL(10,4) NOT NULL,
  allocated_amount DECIMAL(10,2),
  execution_status TEXT DEFAULT 'pending' CHECK (execution_status IN ('pending', 'filled', 'partially_filled', 'cancelled', 'rejected', 'failed')),
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## TypeScript Data Models

### UserProfile
```typescript
interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  alpaca_access_token?: string;
  alpaca_refresh_token?: string;
  is_paper_trading: boolean;
  share_trades: boolean;
  show_asset_amounts: boolean;
  theme_color: string;
  created_at: string;
  updated_at: string;
}
```

### CopyTradingSubscription
```typescript
interface CopyTradingSubscription {
  id: string;
  follower_id: string;
  leader_id: string;
  allocation_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### TradeExecution
```typescript
interface TradeExecution {
  id: string;
  original_trade_id: string;
  leader_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  trade_type: 'stock' | 'option';
  option_details?: OptionDetails;
  portfolio_percentage?: number;
  executed_at: string;
  created_at: string;
  updated_at: string;
}
```

### CopiedTrade
```typescript
interface CopiedTrade {
  id: string;
  original_trade_id: string;
  follower_id: string;
  alpaca_order_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  allocated_amount?: number;
  execution_status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'failed';
  error_message?: string;
  executed_at: string;
  created_at: string;
  updated_at: string;
}
```

### OptionDetails
```typescript
interface OptionDetails {
  strike: number;
  expiration: string;
  option_type: 'call' | 'put';
}
```

## Database Functions

### get_leaderboard_data()
Returns leaderboard data for traders who have enabled trade sharing.

```sql
CREATE OR REPLACE FUNCTION get_leaderboard_data()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_trades BIGINT,
  avg_return DECIMAL,
  total_followers BIGINT,
  share_trades BOOLEAN,
  show_asset_amounts BOOLEAN
)
```

### validate_total_allocation()
Trigger function that ensures total allocation percentage for a follower doesn't exceed 100%.

## Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Followers can view trade executions from leaders they follow
- Leaders can view copied trades of their executions
- Public leaderboard data is accessible for users who have enabled trade sharing

## Indexes

Performance indexes are created on:
- `copy_trading_subscriptions`: follower_id, leader_id, is_active
- `trade_executions`: leader_id, symbol, executed_at
- `copied_trades`: follower_id, original_trade_id, execution_status

## Data Validation

The system includes comprehensive validation for:
- Allocation percentages (0-100%, max 2 decimal places)
- Total allocation limits (cannot exceed 100% per follower)
- Trade execution data (required fields, valid symbols, positive quantities)
- Option details (valid strike prices, future expiration dates)
- UUID formats and string sanitization

## Usage Examples

### Creating a Copy Trading Subscription
```typescript
const subscription = await DatabaseService.createSubscription({
  follower_id: 'user123',
  leader_id: 'leader456',
  allocation_percentage: 60.0,
  is_active: true
});
```

### Recording a Trade Execution
```typescript
const tradeExecution = await DatabaseService.createTradeExecution({
  original_trade_id: 'alpaca_order_001',
  leader_id: 'leader456',
  symbol: 'AAPL',
  side: 'buy',
  quantity: 10,
  price: 150.25,
  trade_type: 'stock',
  portfolio_percentage: 5.0,
  executed_at: new Date().toISOString()
});
```

### Creating a Copied Trade
```typescript
const copiedTrade = await DatabaseService.createCopiedTrade({
  original_trade_id: tradeExecution.id,
  follower_id: 'user123',
  symbol: 'AAPL',
  side: 'buy',
  quantity: 6,
  allocated_amount: 901.50,
  execution_status: 'pending',
  executed_at: new Date().toISOString()
});
```

## Migration and Seed Data

- **Migration**: `supabase/migrations/001_copy_trading_schema.sql`
- **Seed Data**: `supabase/seed_data.sql` (for testing purposes)

The migration file can be applied to set up the complete schema, and the seed data provides sample records for development and testing.