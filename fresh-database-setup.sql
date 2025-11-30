-- LEADTRADE Fresh Database Setup
-- This script will drop all existing tables and create a clean database schema
-- WARNING: This will delete all existing data!

-- Drop all existing tables (in correct order to handle foreign key constraints)
DROP TABLE IF EXISTS public.copied_trades CASCADE;
DROP TABLE IF EXISTS public.trade_executions CASCADE;
DROP TABLE IF EXISTS public.copy_trading_subscriptions CASCADE;
DROP TABLE IF EXISTS public.trade_notifications CASCADE;
DROP TABLE IF EXISTS public.user_positions CASCADE;
DROP TABLE IF EXISTS public.user_portfolios CASCADE;
DROP TABLE IF EXISTS public.portfolios CASCADE;
DROP TABLE IF EXISTS public.alpaca_accounts CASCADE;
DROP TABLE IF EXISTS public.user_details CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop any existing functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_modified_column() CASCADE;
DROP FUNCTION IF EXISTS public.validate_total_allocation() CASCADE;
DROP FUNCTION IF EXISTS public.get_leaderboard_data() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_trade_notifications() CASCADE;
DROP FUNCTION IF EXISTS public.update_trade_notifications_updated_at() CASCADE;

-- Create the update_modified_column function first (needed for triggers)
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Create profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  alpaca_access_token TEXT,
  alpaca_refresh_token TEXT,
  is_paper_trading BOOLEAN DEFAULT true,
  share_trades BOOLEAN DEFAULT false,
  show_asset_amounts BOOLEAN DEFAULT false,
  theme_color TEXT DEFAULT '#ef4444',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create app_settings table
CREATE TABLE public.app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create user_portfolios table
CREATE TABLE public.user_portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  total_value DECIMAL(15,2) DEFAULT 0.00,
  cash_balance DECIMAL(15,2) DEFAULT 0.00,
  buying_power DECIMAL(15,2) DEFAULT 0.00,
  day_change DECIMAL(15,2) DEFAULT 0.00,
  day_change_percent DECIMAL(8,4) DEFAULT 0.00,
  total_gain_loss DECIMAL(15,2) DEFAULT 0.00,
  total_gain_loss_percent DECIMAL(8,4) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 4. Create user_positions table
CREATE TABLE public.user_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  symbol TEXT NOT NULL,
  quantity DECIMAL(15,6) NOT NULL,
  avg_price DECIMAL(15,4) NOT NULL,
  current_price DECIMAL(15,4),
  market_value DECIMAL(15,2),
  unrealized_pl DECIMAL(15,2),
  unrealized_pl_percent DECIMAL(8,4),
  position_type TEXT DEFAULT 'stock',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create copy_trading_subscriptions table
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

-- 6. Create trade_executions table
CREATE TABLE public.trade_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_trade_id TEXT NOT NULL,
  leader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL(10,4) NOT NULL,
  price DECIMAL(10,4),
  trade_type TEXT NOT NULL CHECK (trade_type IN ('stock', 'option')),
  option_details JSONB,
  portfolio_percentage DECIMAL(5,2),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create copied_trades table
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

-- 8. Create trade_notifications table
CREATE TABLE public.trade_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data JSONB NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default app settings
INSERT INTO public.app_settings (setting_key, setting_value, description) VALUES
('trading_mode', 'paper', 'Global trading mode: paper or live'),
('app_name', 'LEADTRADE', 'Application name'),
('maintenance_mode', 'false', 'Enable/disable maintenance mode');

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_trading_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copied_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS Policies for app_settings
CREATE POLICY "Anyone can read app settings" ON public.app_settings
  FOR SELECT USING (true);

-- Create RLS Policies for user_portfolios
CREATE POLICY "Users can view own portfolio" ON public.user_portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio" ON public.user_portfolios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio" ON public.user_portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS Policies for user_positions
CREATE POLICY "Users can view own positions" ON public.user_positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own positions" ON public.user_positions
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS Policies for copy_trading_subscriptions
CREATE POLICY "Users can view their own subscriptions as follower" ON public.copy_trading_subscriptions
  FOR SELECT USING (auth.uid() = follower_id);

CREATE POLICY "Users can view subscriptions where they are leader" ON public.copy_trading_subscriptions
  FOR SELECT USING (auth.uid() = leader_id);

CREATE POLICY "Users can create subscriptions as follower" ON public.copy_trading_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can update their own subscriptions as follower" ON public.copy_trading_subscriptions
  FOR UPDATE USING (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own subscriptions as follower" ON public.copy_trading_subscriptions
  FOR DELETE USING (auth.uid() = follower_id);

-- Create RLS Policies for trade_executions
CREATE POLICY "Users can view their own trade executions" ON public.trade_executions
  FOR SELECT USING (auth.uid() = leader_id);

CREATE POLICY "Users can view trade executions from leaders they follow" ON public.trade_executions
  FOR SELECT USING (
    leader_id IN (
      SELECT leader_id FROM public.copy_trading_subscriptions 
      WHERE follower_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can insert their own trade executions" ON public.trade_executions
  FOR INSERT WITH CHECK (auth.uid() = leader_id);

-- Create RLS Policies for copied_trades
CREATE POLICY "Users can view their own copied trades" ON public.copied_trades
  FOR SELECT USING (auth.uid() = follower_id);

CREATE POLICY "Leaders can view copied trades of their executions" ON public.copied_trades
  FOR SELECT USING (
    original_trade_id IN (
      SELECT id FROM public.trade_executions 
      WHERE leader_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own copied trades" ON public.copied_trades
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can update their own copied trades" ON public.copied_trades
  FOR UPDATE USING (auth.uid() = follower_id);

-- Create RLS Policies for trade_notifications
CREATE POLICY "Users can view their own notifications" ON public.trade_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.trade_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at triggers for all tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_user_portfolios_updated_at
  BEFORE UPDATE ON public.user_portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_user_positions_updated_at
  BEFORE UPDATE ON public.user_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_copy_trading_subscriptions_updated_at
  BEFORE UPDATE ON public.copy_trading_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_trade_executions_updated_at
  BEFORE UPDATE ON public.trade_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_copied_trades_updated_at
  BEFORE UPDATE ON public.copied_trades
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_trade_notifications_updated_at
  BEFORE UPDATE ON public.trade_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- Create performance indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_user_portfolios_user_id ON public.user_portfolios(user_id);
CREATE INDEX idx_user_positions_user_id ON public.user_positions(user_id);
CREATE INDEX idx_user_positions_symbol ON public.user_positions(symbol);
CREATE INDEX idx_app_settings_key ON public.app_settings(setting_key);
CREATE INDEX idx_copy_trading_subscriptions_follower_id ON public.copy_trading_subscriptions(follower_id);
CREATE INDEX idx_copy_trading_subscriptions_leader_id ON public.copy_trading_subscriptions(leader_id);
CREATE INDEX idx_copy_trading_subscriptions_active ON public.copy_trading_subscriptions(is_active);
CREATE INDEX idx_trade_executions_leader_id ON public.trade_executions(leader_id);
CREATE INDEX idx_trade_executions_symbol ON public.trade_executions(symbol);
CREATE INDEX idx_trade_executions_executed_at ON public.trade_executions(executed_at);
CREATE INDEX idx_copied_trades_follower_id ON public.copied_trades(follower_id);
CREATE INDEX idx_copied_trades_original_trade_id ON public.copied_trades(original_trade_id);
CREATE INDEX idx_copied_trades_status ON public.copied_trades(execution_status);
CREATE INDEX idx_trade_notifications_user_id ON public.trade_notifications(user_id);
CREATE INDEX idx_trade_notifications_read ON public.trade_notifications(read);
CREATE INDEX idx_trade_notifications_created_at ON public.trade_notifications(created_at DESC);
CREATE INDEX idx_trade_notifications_user_unread ON public.trade_notifications(user_id, read) WHERE read = FALSE;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, username, full_name, email)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.email);
  
  -- Insert initial portfolio with $0 balance (funding will be added separately)
  INSERT INTO public.user_portfolios (user_id, total_value, cash_balance, buying_power)
  VALUES (NEW.id, 0.00, 0.00, 0.00); -- Start with $0, funding will be added via funding API
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to validate total allocation percentage
CREATE OR REPLACE FUNCTION public.validate_total_allocation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if total allocation for this follower exceeds 100%
  IF (
    SELECT COALESCE(SUM(allocation_percentage), 0) 
    FROM public.copy_trading_subscriptions 
    WHERE follower_id = NEW.follower_id 
    AND is_active = true 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) + NEW.allocation_percentage > 100 THEN
    RAISE EXCEPTION 'Total allocation percentage cannot exceed 100%%';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate allocation percentage
CREATE TRIGGER validate_allocation_percentage
  BEFORE INSERT OR UPDATE ON public.copy_trading_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.validate_total_allocation();

-- Create function to get leaderboard data
CREATE OR REPLACE FUNCTION public.get_leaderboard_data()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_trades BIGINT,
  avg_return DECIMAL,
  total_followers BIGINT,
  share_trades BOOLEAN,
  show_asset_amounts BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.username,
    COALESCE(COUNT(te.id), 0) as total_trades,
    COALESCE(AVG(te.portfolio_percentage), 0) as avg_return,
    COALESCE(COUNT(DISTINCT cts.follower_id), 0) as total_followers,
    p.share_trades,
    p.show_asset_amounts
  FROM public.profiles p
  LEFT JOIN public.trade_executions te ON p.id = te.leader_id
  LEFT JOIN public.copy_trading_subscriptions cts ON p.id = cts.leader_id AND cts.is_active = true
  WHERE p.share_trades = true
  GROUP BY p.id, p.username, p.share_trades, p.show_asset_amounts
  ORDER BY total_followers DESC, total_trades DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old notifications
CREATE OR REPLACE FUNCTION public.cleanup_old_trade_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.trade_notifications
  WHERE id IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
      FROM public.trade_notifications
    ) ranked
    WHERE rn > 100
  );
END;
$$ LANGUAGE plpgsql;