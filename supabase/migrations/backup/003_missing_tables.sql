-- Migration: Add missing tables for app functionality
-- This adds the app_settings table and ensures profiles table has all required columns

-- Create app_settings table for application-wide configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default app settings
INSERT INTO public.app_settings (setting_key, setting_value, description) VALUES
('trading_mode', 'paper', 'Global trading mode: paper or live'),
('app_name', 'LEADTRADE', 'Application name'),
('maintenance_mode', 'false', 'Enable/disable maintenance mode')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for app_settings (readable by all authenticated users, writable by service role)
CREATE POLICY "Anyone can read app settings" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage app settings" ON public.app_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Add updated_at trigger for app_settings
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Ensure profiles table has all required columns (some might already exist)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS alpaca_access_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS alpaca_refresh_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_paper_trading BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS share_trades BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_asset_amounts BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#ef4444';

-- Create user_portfolios table for portfolio tracking
CREATE TABLE IF NOT EXISTS public.user_portfolios (
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

-- Enable RLS on user_portfolios
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;

-- Create policies for user_portfolios
CREATE POLICY "Users can view own portfolio" ON public.user_portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio" ON public.user_portfolios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio" ON public.user_portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger for user_portfolios
CREATE TRIGGER update_user_portfolios_updated_at
BEFORE UPDATE ON public.user_portfolios
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create user_positions table for individual positions
CREATE TABLE IF NOT EXISTS public.user_positions (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_positions
ALTER TABLE public.user_positions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_positions
CREATE POLICY "Users can view own positions" ON public.user_positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own positions" ON public.user_positions
  FOR ALL USING (auth.uid() = user_id);

-- Add updated_at trigger for user_positions
CREATE TRIGGER update_user_positions_updated_at
BEFORE UPDATE ON public.user_positions
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_id ON public.user_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_user_id ON public.user_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_symbol ON public.user_positions(symbol);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(setting_key);

-- Update the handle_new_user function to create portfolio entry
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, username, full_name, email)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.email);
  
  -- Insert initial portfolio with $0 balance (funding will be added separately)
  INSERT INTO public.user_portfolios (user_id, total_value, cash_balance, buying_power)
  VALUES (NEW.id, 0.00, 0.00, 0.00); -- Start with $0, funding will be added via funding API
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;