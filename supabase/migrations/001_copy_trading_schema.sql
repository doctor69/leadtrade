-- Copy Trading System Database Schema Migration
-- This migration adds tables for copy trading functionality

-- Extend user_profiles table with copy trading specific fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS alpaca_access_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS alpaca_refresh_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_paper_trading BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS share_trades BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_asset_amounts BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#ef4444';

-- Create copy_trading_subscriptions table for leader-follower relationships
CREATE TABLE IF NOT EXISTS public.copy_trading_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  leader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  allocation_percentage DECIMAL(5,2) CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, leader_id)
);

-- Create trade_executions table for storing leader trades
CREATE TABLE IF NOT EXISTS public.trade_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_trade_id TEXT NOT NULL, -- Alpaca order ID
  leader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL(10,4) NOT NULL,
  price DECIMAL(10,4),
  trade_type TEXT NOT NULL CHECK (trade_type IN ('stock', 'option')),
  option_details JSONB, -- For options: strike, expiration, type
  portfolio_percentage DECIMAL(5,2),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create copied_trades table for tracking follower trades
CREATE TABLE IF NOT EXISTS public.copied_trades (
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

-- Enable RLS on new tables
ALTER TABLE public.copy_trading_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copied_trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for copy_trading_subscriptions
CREATE POLICY "Users can view their own subscriptions as follower" 
  ON public.copy_trading_subscriptions FOR SELECT 
  USING (auth.uid() = follower_id);

CREATE POLICY "Users can view subscriptions where they are leader" 
  ON public.copy_trading_subscriptions FOR SELECT 
  USING (auth.uid() = leader_id);

CREATE POLICY "Users can create subscriptions as follower" 
  ON public.copy_trading_subscriptions FOR INSERT 
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can update their own subscriptions as follower" 
  ON public.copy_trading_subscriptions FOR UPDATE 
  USING (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own subscriptions as follower" 
  ON public.copy_trading_subscriptions FOR DELETE 
  USING (auth.uid() = follower_id);

-- RLS Policies for trade_executions
CREATE POLICY "Users can view their own trade executions" 
  ON public.trade_executions FOR SELECT 
  USING (auth.uid() = leader_id);

CREATE POLICY "Users can view trade executions from leaders they follow" 
  ON public.trade_executions FOR SELECT 
  USING (
    leader_id IN (
      SELECT leader_id FROM public.copy_trading_subscriptions 
      WHERE follower_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can insert their own trade executions" 
  ON public.trade_executions FOR INSERT 
  WITH CHECK (auth.uid() = leader_id);

-- RLS Policies for copied_trades
CREATE POLICY "Users can view their own copied trades" 
  ON public.copied_trades FOR SELECT 
  USING (auth.uid() = follower_id);

CREATE POLICY "Leaders can view copied trades of their executions" 
  ON public.copied_trades FOR SELECT 
  USING (
    original_trade_id IN (
      SELECT id FROM public.trade_executions 
      WHERE leader_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own copied trades" 
  ON public.copied_trades FOR INSERT 
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can update their own copied trades" 
  ON public.copied_trades FOR UPDATE 
  USING (auth.uid() = follower_id);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_copy_trading_subscriptions_updated_at
BEFORE UPDATE ON public.copy_trading_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_trade_executions_updated_at
BEFORE UPDATE ON public.trade_executions
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_copied_trades_updated_at
BEFORE UPDATE ON public.copied_trades
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_copy_trading_subscriptions_follower_id ON public.copy_trading_subscriptions(follower_id);
CREATE INDEX IF NOT EXISTS idx_copy_trading_subscriptions_leader_id ON public.copy_trading_subscriptions(leader_id);
CREATE INDEX IF NOT EXISTS idx_copy_trading_subscriptions_active ON public.copy_trading_subscriptions(is_active);

CREATE INDEX IF NOT EXISTS idx_trade_executions_leader_id ON public.trade_executions(leader_id);
CREATE INDEX IF NOT EXISTS idx_trade_executions_symbol ON public.trade_executions(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_executions_executed_at ON public.trade_executions(executed_at);

CREATE INDEX IF NOT EXISTS idx_copied_trades_follower_id ON public.copied_trades(follower_id);
CREATE INDEX IF NOT EXISTS idx_copied_trades_original_trade_id ON public.copied_trades(original_trade_id);
CREATE INDEX IF NOT EXISTS idx_copied_trades_status ON public.copied_trades(execution_status);

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

-- Create function to get leaderboard data
CREATE OR REPLACE FUNCTION get_leaderboard_data()
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