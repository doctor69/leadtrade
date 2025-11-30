-- Create profiles table with essential fields only
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  -- Copy trading preferences
  share_trades BOOLEAN DEFAULT false,
  show_asset_amounts BOOLEAN DEFAULT false,
  -- Theme preferences (stored in cookies, but kept for backup)
  theme_color TEXT DEFAULT '#ef4444',
  -- Trading mode preference
  trading_mode TEXT DEFAULT 'paper' CHECK (trading_mode IN ('paper', 'live')),
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alpaca_accounts table for storing Alpaca account references
CREATE TABLE IF NOT EXISTS public.alpaca_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alpaca_account_id TEXT NOT NULL UNIQUE,
  alpaca_account_number TEXT,
  account_status TEXT DEFAULT 'ACTIVE',
  account_type TEXT DEFAULT 'paper' CHECK (account_type IN ('paper', 'live')),
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  -- Store minimal KYC data for reference
  kyc_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure one account per type per user
  UNIQUE(user_id, account_type)
);

-- Create copy_trading_subscriptions table for leader-follower relationships
CREATE TABLE IF NOT EXISTS public.copy_trading_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  leader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  allocation_percentage DECIMAL(5,2) NOT NULL CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Prevent duplicate subscriptions
  UNIQUE(follower_id, leader_id)
);

-- Create app_settings table for application configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alpaca_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_trading_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Public profiles for leaderboard (only if share_trades is true)
CREATE POLICY "Public profiles viewable for copy trading" ON public.profiles
  FOR SELECT USING (share_trades = true);

-- RLS Policies for alpaca_accounts
CREATE POLICY "Users can view their own Alpaca accounts" ON public.alpaca_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own Alpaca accounts" ON public.alpaca_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Alpaca accounts" ON public.alpaca_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage Alpaca accounts" ON public.alpaca_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for copy_trading_subscriptions
CREATE POLICY "Users can view subscriptions as follower" ON public.copy_trading_subscriptions
  FOR SELECT USING (auth.uid() = follower_id);

CREATE POLICY "Users can view subscriptions as leader" ON public.copy_trading_subscriptions
  FOR SELECT USING (auth.uid() = leader_id);

CREATE POLICY "Users can create subscriptions as follower" ON public.copy_trading_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can update subscriptions as follower" ON public.copy_trading_subscriptions
  FOR UPDATE USING (auth.uid() = follower_id);

CREATE POLICY "Users can delete subscriptions as follower" ON public.copy_trading_subscriptions
  FOR DELETE USING (auth.uid() = follower_id);

-- RLS Policies for app_settings
CREATE POLICY "Anyone can read app settings" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage app settings" ON public.app_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_alpaca_accounts_updated_at
  BEFORE UPDATE ON public.alpaca_accounts
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_copy_trading_subscriptions_updated_at
  BEFORE UPDATE ON public.copy_trading_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();-- Create 
performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_share_trades ON public.profiles(share_trades) WHERE share_trades = true;
CREATE INDEX IF NOT EXISTS idx_profiles_trading_mode ON public.profiles(trading_mode);

CREATE INDEX IF NOT EXISTS idx_alpaca_accounts_user_id ON public.alpaca_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_alpaca_accounts_alpaca_id ON public.alpaca_accounts(alpaca_account_id);
CREATE INDEX IF NOT EXISTS idx_alpaca_accounts_type ON public.alpaca_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_alpaca_accounts_status ON public.alpaca_accounts(account_status);

CREATE INDEX IF NOT EXISTS idx_copy_trading_subscriptions_follower ON public.copy_trading_subscriptions(follower_id);
CREATE INDEX IF NOT EXISTS idx_copy_trading_subscriptions_leader ON public.copy_trading_subscriptions(leader_id);
CREATE INDEX IF NOT EXISTS idx_copy_trading_subscriptions_active ON public.copy_trading_subscriptions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(setting_key);

-- Create function to validate total allocation percentage
CREATE OR REPLACE FUNCTION validate_total_allocation()
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
  FOR EACH ROW EXECUTE FUNCTION validate_total_allocation();

-- Create function to get leaderboard data (only from profiles, no trade data)
CREATE OR REPLACE FUNCTION get_leaderboard_data()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  total_followers BIGINT,
  share_trades BOOLEAN,
  show_asset_amounts BOOLEAN,
  theme_color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.username,
    p.full_name,
    COALESCE(COUNT(DISTINCT cts.follower_id), 0) as total_followers,
    p.share_trades,
    p.show_asset_amounts,
    p.theme_color
  FROM public.profiles p
  LEFT JOIN public.copy_trading_subscriptions cts ON p.id = cts.leader_id AND cts.is_active = true
  WHERE p.share_trades = true
  GROUP BY p.id, p.username, p.full_name, p.share_trades, p.show_asset_amounts, p.theme_color
  ORDER BY total_followers DESC, p.username ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user function to include email and trading_mode
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with essential data only
  INSERT INTO public.profiles (id, username, full_name, email, trading_mode)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
    NEW.email,
    'paper' -- Default to paper trading
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default app settings
INSERT INTO public.app_settings (setting_key, setting_value, description) VALUES
  ('trading_mode', 'paper', 'Global trading mode: paper or live'),
  ('app_name', 'LEADTRADE', 'Application name'),
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode')
ON CONFLICT (setting_key) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Add helpful comments
COMMENT ON TABLE public.profiles IS 'User profiles with copy trading preferences and theme settings';
COMMENT ON TABLE public.alpaca_accounts IS 'Alpaca account references - no trade data stored locally';
COMMENT ON TABLE public.copy_trading_subscriptions IS 'Leader-follower relationships for copy trading';
COMMENT ON TABLE public.app_settings IS 'Application-wide configuration settings';

COMMENT ON COLUMN public.profiles.share_trades IS 'Whether user shares trades publicly for copy trading';
COMMENT ON COLUMN public.profiles.show_asset_amounts IS 'Whether to show actual dollar amounts in shared trades';
COMMENT ON COLUMN public.alpaca_accounts.alpaca_account_id IS 'Reference to Alpaca account - all trade data fetched via API';
COMMENT ON COLUMN public.copy_trading_subscriptions.allocation_percentage IS 'Percentage of follower portfolio allocated to this leader';