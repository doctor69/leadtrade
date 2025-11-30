-- Complete Broker Schema Migration
-- Ensures all tables required for Alpaca broker integration exist with proper structure

-- Create alpaca_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.alpaca_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alpaca_account_id TEXT NOT NULL UNIQUE,
  alpaca_account_number TEXT,
  alpaca_account_status TEXT DEFAULT 'ACTIVE',
  account_type TEXT DEFAULT 'paper' CHECK (account_type IN ('paper', 'live')),
  alpaca_access_token TEXT,
  alpaca_refresh_token TEXT,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  kyc_data JSONB, -- Store KYC information
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, account_type) -- One account per type per user
);

-- Enable RLS on alpaca_accounts
ALTER TABLE public.alpaca_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for alpaca_accounts
CREATE POLICY "Users can view their own Alpaca accounts" ON public.alpaca_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own Alpaca accounts" ON public.alpaca_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Alpaca accounts" ON public.alpaca_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger for alpaca_accounts
CREATE TRIGGER update_alpaca_accounts_updated_at
BEFORE UPDATE ON public.alpaca_accounts
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create indexes for alpaca_accounts
CREATE INDEX IF NOT EXISTS idx_alpaca_accounts_user_id ON public.alpaca_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_alpaca_accounts_alpaca_id ON public.alpaca_accounts(alpaca_account_id);
CREATE INDEX IF NOT EXISTS idx_alpaca_accounts_status ON public.alpaca_accounts(alpaca_account_status);

-- Update profiles table to include Alpaca account reference
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS alpaca_account_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trading_mode TEXT DEFAULT 'paper' CHECK (trading_mode IN ('paper', 'live'));

-- Create portfolio_history table for tracking portfolio performance over time
CREATE TABLE IF NOT EXISTS public.portfolio_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  portfolio_value DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  cash_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  equity DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  day_change DECIMAL(15,2) DEFAULT 0.00,
  day_change_percent DECIMAL(8,4) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS on portfolio_history
ALTER TABLE public.portfolio_history ENABLE ROW LEVEL SECURITY;

-- Create policies for portfolio_history
CREATE POLICY "Users can view their own portfolio history" ON public.portfolio_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own portfolio history" ON public.portfolio_history
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for portfolio_history
CREATE INDEX IF NOT EXISTS idx_portfolio_history_user_id ON public.portfolio_history(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_history_date ON public.portfolio_history(date);

-- Create orders table for tracking user orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alpaca_order_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL(15,6) NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
  time_in_force TEXT DEFAULT 'day' CHECK (time_in_force IN ('day', 'gtc', 'ioc', 'fok')),
  limit_price DECIMAL(15,4),
  stop_price DECIMAL(15,4),
  filled_quantity DECIMAL(15,6) DEFAULT 0,
  filled_avg_price DECIMAL(15,4),
  status TEXT NOT NULL DEFAULT 'new',
  submitted_at TIMESTAMP WITH TIME ZONE,
  filled_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own orders" ON public.orders
  FOR ALL USING (auth.uid() = user_id);

-- Add updated_at trigger for orders
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_alpaca_id ON public.orders(alpaca_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON public.orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- Create watchlists table
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  symbols TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on watchlists
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

-- Create policies for watchlists
CREATE POLICY "Users can view their own watchlists" ON public.watchlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own watchlists" ON public.watchlists
  FOR ALL USING (auth.uid() = user_id);

-- Add updated_at trigger for watchlists
CREATE TRIGGER update_watchlists_updated_at
BEFORE UPDATE ON public.watchlists
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create indexes for watchlists
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);

-- Create account_activities table for tracking all account activities
CREATE TABLE IF NOT EXISTS public.account_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  symbol TEXT,
  quantity DECIMAL(15,6),
  price DECIMAL(15,4),
  amount DECIMAL(15,2),
  description TEXT,
  activity_data JSONB, -- Store additional activity data
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on account_activities
ALTER TABLE public.account_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for account_activities
CREATE POLICY "Users can view their own account activities" ON public.account_activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own account activities" ON public.account_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for account_activities
CREATE INDEX IF NOT EXISTS idx_account_activities_user_id ON public.account_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_account_activities_type ON public.account_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_account_activities_date ON public.account_activities(activity_date);

-- Update the handle_new_user function to initialize with $0 balance (funding added separately)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, username, full_name, email, trading_mode)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
    NEW.email,
    'paper' -- Default to paper trading
  );
  
  -- Insert initial portfolio with $0 starting balance (funding will be added separately)
  INSERT INTO public.user_portfolios (user_id, total_value, cash_balance, buying_power)
  VALUES (NEW.id, 0.00, 0.00, 0.00);
  
  -- Insert initial portfolio history entry
  INSERT INTO public.portfolio_history (user_id, date, portfolio_value, cash_balance, equity)
  VALUES (NEW.id, CURRENT_DATE, 0.00, 0.00, 0.00);
  
  -- Insert initial account creation activity (no funding)
  INSERT INTO public.account_activities (
    user_id, 
    activity_type, 
    amount, 
    description, 
    activity_date
  ) VALUES (
    NEW.id,
    'ACCOUNT_CREATED',
    0.00,
    'Account created - ready for funding',
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's current trading mode
CREATE OR REPLACE FUNCTION get_user_trading_mode(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT COALESCE(trading_mode, 'paper')
    FROM public.profiles 
    WHERE id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update portfolio balance (for funding operations)
CREATE OR REPLACE FUNCTION update_portfolio_balance(
  user_uuid UUID,
  amount_change DECIMAL(15,2),
  activity_description TEXT DEFAULT 'Balance update'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update user portfolio
  UPDATE public.user_portfolios 
  SET 
    cash_balance = cash_balance + amount_change,
    buying_power = buying_power + amount_change,
    total_value = total_value + amount_change,
    updated_at = NOW()
  WHERE user_id = user_uuid;
  
  -- Insert activity record
  INSERT INTO public.account_activities (
    user_id,
    activity_type,
    amount,
    description,
    activity_date
  ) VALUES (
    user_uuid,
    CASE WHEN amount_change > 0 THEN 'DEPOSIT' ELSE 'WITHDRAWAL' END,
    ABS(amount_change),
    activity_description,
    NOW()
  );
  
  -- Update portfolio history for today
  INSERT INTO public.portfolio_history (user_id, date, portfolio_value, cash_balance, equity)
  VALUES (
    user_uuid,
    CURRENT_DATE,
    (SELECT total_value FROM public.user_portfolios WHERE user_id = user_uuid),
    (SELECT cash_balance FROM public.user_portfolios WHERE user_id = user_uuid),
    (SELECT total_value FROM public.user_portfolios WHERE user_id = user_uuid)
  )
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    portfolio_value = EXCLUDED.portfolio_value,
    cash_balance = EXCLUDED.cash_balance,
    equity = EXCLUDED.equity;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;