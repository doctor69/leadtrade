# Supabase Database Schema for LEADTRADE

This document outlines the required database tables and structure for the LEADTRADE paper trading platform.

## Required Tables

### 1. profiles
Extends Supabase auth.users with additional user information.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  share_trades BOOLEAN DEFAULT false,
  show_asset_amounts BOOLEAN DEFAULT false,
  investment_experience_with_stocks TEXT,
  risk_tolerance TEXT,
  alpaca_access_token TEXT, -- Encrypted
  alpaca_refresh_token TEXT, -- Encrypted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. user_portfolios
Stores user portfolio summary data.

```sql
CREATE TABLE user_portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  total_value DECIMAL(15,2) DEFAULT 0.00,
  cash_balance DECIMAL(15,2) DEFAULT 0.00,
  buying_power DECIMAL(15,2) DEFAULT 0.00,
  day_change DECIMAL(15,2) DEFAULT 0.00,
  day_change_percent DECIMAL(8,4) DEFAULT 0.00,
  total_gain_loss DECIMAL(15,2) DEFAULT 0.00,
  total_gain_loss_percent DECIMAL(8,4) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 3. user_positions
Stores individual stock/option positions.

```sql
CREATE TABLE user_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  symbol TEXT NOT NULL,
  quantity DECIMAL(15,6) NOT NULL,
  avg_price DECIMAL(15,4) NOT NULL,
  current_price DECIMAL(15,4),
  market_value DECIMAL(15,2),
  unrealized_pl DECIMAL(15,2),
  unrealized_pl_percent DECIMAL(8,4),
  position_type TEXT DEFAULT 'stock', -- 'stock' or 'option'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. leaderboard_entries
Stores leaderboard data for copy trading.

```sql
CREATE TABLE leaderboard_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  username TEXT NOT NULL,
  total_return DECIMAL(15,2) NOT NULL,
  total_return_percent DECIMAL(8,4) NOT NULL,
  portfolio_value DECIMAL(15,2) NOT NULL,
  trades_count INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0.00,
  show_asset_amounts BOOLEAN DEFAULT false,
  rank INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 5. user_details (Optional - for extended KYC data)
Stores additional user information for compliance.

```sql
CREATE TABLE user_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT, -- Hashed password for reference
  given_name TEXT,
  family_name TEXT,
  date_of_birth DATE,
  tax_id TEXT, -- Should be encrypted in production
  tax_id_type TEXT DEFAULT 'USA_SSN',
  phone_number TEXT,
  street_address TEXT[],
  city TEXT,
  state TEXT,
  postal_code TEXT,
  investment_experience_with_stocks TEXT,
  investment_objective TEXT,
  risk_tolerance TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 6. alpaca_accounts (Optional - for Alpaca integration)
Stores Alpaca account information.

```sql
CREATE TABLE alpaca_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  alpaca_account_id TEXT UNIQUE NOT NULL,
  alpaca_account_number TEXT,
  alpaca_account_status TEXT,
  account_type TEXT DEFAULT 'paper', -- 'paper' or 'live'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 7. app_settings (App-level configuration)
Stores application-wide settings including trading mode.

```sql
CREATE TABLE app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default app settings
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('trading_mode', 'paper', 'Global trading mode: paper or live'),
('app_name', 'LEADTRADE', 'Application name'),
('maintenance_mode', 'false', 'Enable/disable maintenance mode');
```

## Row Level Security (RLS) Policies

Enable RLS on all tables and create policies:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE alpaca_accounts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Portfolio policies
CREATE POLICY "Users can view own portfolio" ON user_portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolio" ON user_portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portfolio" ON user_portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Position policies
CREATE POLICY "Users can view own positions" ON user_positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own positions" ON user_positions FOR ALL USING (auth.uid() = user_id);

-- Leaderboard policies (public read for shared traders)
CREATE POLICY "Anyone can view leaderboard" ON leaderboard_entries FOR SELECT USING (true);
CREATE POLICY "Users can update own leaderboard entry" ON leaderboard_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leaderboard entry" ON leaderboard_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User details policies (private)
CREATE POLICY "Users can view own details" ON user_details FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own details" ON user_details FOR ALL USING (auth.uid() = user_id);

-- Alpaca account policies
CREATE POLICY "Users can view own alpaca account" ON alpaca_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own alpaca account" ON alpaca_accounts FOR ALL USING (auth.uid() = user_id);
```

## Indexes for Performance

```sql
-- User lookup indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_username ON profiles(username);

-- Portfolio lookup indexes
CREATE INDEX idx_user_portfolios_user_id ON user_portfolios(user_id);

-- Position lookup indexes
CREATE INDEX idx_user_positions_user_id ON user_positions(user_id);
CREATE INDEX idx_user_positions_symbol ON user_positions(symbol);

-- Leaderboard indexes
CREATE INDEX idx_leaderboard_rank ON leaderboard_entries(rank);
CREATE INDEX idx_leaderboard_return ON leaderboard_entries(total_return_percent DESC);

-- User details indexes
CREATE INDEX idx_user_details_user_id ON user_details(user_id);

-- Alpaca account indexes
CREATE INDEX idx_alpaca_accounts_user_id ON alpaca_accounts(user_id);
CREATE INDEX idx_alpaca_accounts_alpaca_id ON alpaca_accounts(alpaca_account_id);
```

## Setup Instructions

1. **Create a new Supabase project** at https://supabase.com
2. **Run the SQL commands** above in the Supabase SQL editor
3. **Configure environment variables** in your `.env` file:
   ```
   PUBLIC_SUPABASE_URL=your_supabase_url
   PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
4. **Seed test users** by visiting `/admin` and clicking "Seed Test Users"

## Production Setup

The app is now configured for production use with real users:
- Users create accounts through Supabase authentication
- Trading mode is controlled at the app level (not per user)
- Default trading mode is 'paper' for safety
- Admin can change trading mode via app_settings table

## Features Enabled

- ✅ App-level trading mode control (paper/live)
- ✅ Real-time market data integration
- ✅ Copy trading system with leaderboards
- ✅ Privacy controls for sharing trades
- ✅ Portfolio analytics and tracking
- ✅ User authentication with Supabase Auth
- ✅ Row Level Security for data protection
- ✅ Admin-controlled trading environment