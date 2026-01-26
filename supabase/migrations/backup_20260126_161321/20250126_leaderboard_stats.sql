-- Leaderboard Stats Table
-- Stores calculated performance metrics for leaders who share their trades

CREATE TABLE IF NOT EXISTS public.leaderboard_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Performance Metrics
  portfolio_value DECIMAL(15,2) DEFAULT 0,
  total_return DECIMAL(15,2) DEFAULT 0,
  total_return_percent DECIMAL(10,4) DEFAULT 0,
  
  -- Trading Statistics
  trades_count INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Additional Metrics
  avg_hold_time_hours DECIMAL(10,2),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  trading_style TEXT CHECK (trading_style IN ('conservative', 'moderate', 'active')),
  
  -- Follower Count
  followers_count INTEGER DEFAULT 0,
  
  -- Timestamps
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leaderboard_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own stats" ON public.leaderboard_stats;
DROP POLICY IF EXISTS "Public stats viewable for leaders who share trades" ON public.leaderboard_stats;

CREATE POLICY "Users can view their own stats" ON public.leaderboard_stats
  FOR SELECT USING (auth.uid() = user_id);

-- Only show stats for users who have share_trades enabled
CREATE POLICY "Public stats viewable for leaders who share trades" ON public.leaderboard_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = leaderboard_stats.user_id 
      AND profiles.share_trades = true
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_user_id ON public.leaderboard_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_total_return ON public.leaderboard_stats(total_return_percent DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_win_rate ON public.leaderboard_stats(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_followers ON public.leaderboard_stats(followers_count DESC);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_leaderboard_stats_updated_at ON public.leaderboard_stats;
CREATE TRIGGER update_leaderboard_stats_updated_at
  BEFORE UPDATE ON public.leaderboard_stats
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS void AS $$
BEGIN
  UPDATE public.leaderboard_stats ls
  SET 
    followers_count = (
      SELECT COUNT(*)
      FROM public.copy_trading_subscriptions cts
      WHERE cts.leader_id = ls.user_id
      AND cts.is_active = true
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get leaderboard with proper privacy controls
CREATE OR REPLACE FUNCTION get_leaderboard_with_stats(
  p_timeframe TEXT DEFAULT 'all',
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  full_name TEXT,
  portfolio_value DECIMAL,
  total_return DECIMAL,
  total_return_percent DECIMAL,
  trades_count INTEGER,
  win_rate DECIMAL,
  show_asset_amounts BOOLEAN,
  followers_count INTEGER,
  avg_hold_time_hours DECIMAL,
  risk_level TEXT,
  trading_style TEXT,
  last_active TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.id,
    p.id as user_id,
    p.username,
    p.full_name,
    CASE 
      WHEN p.show_asset_amounts THEN ls.portfolio_value 
      ELSE 0 
    END as portfolio_value,
    CASE 
      WHEN p.show_asset_amounts THEN ls.total_return 
      ELSE 0 
    END as total_return,
    ls.total_return_percent,
    ls.trades_count,
    ls.win_rate,
    p.show_asset_amounts,
    ls.followers_count,
    ls.avg_hold_time_hours,
    ls.risk_level,
    ls.trading_style,
    ls.last_calculated_at as last_active
  FROM public.leaderboard_stats ls
  INNER JOIN public.profiles p ON p.id = ls.user_id
  WHERE p.share_trades = true
  ORDER BY ls.total_return_percent DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.leaderboard_stats TO anon, authenticated;
GRANT ALL ON public.leaderboard_stats TO service_role;

-- Comments
COMMENT ON TABLE public.leaderboard_stats IS 'Performance statistics for leaders who share their trades';
COMMENT ON COLUMN public.leaderboard_stats.portfolio_value IS 'Current portfolio value - only shown if show_asset_amounts is true';
COMMENT ON COLUMN public.leaderboard_stats.total_return_percent IS 'Always shown - percentage return for ranking';
COMMENT ON FUNCTION get_leaderboard_with_stats IS 'Returns leaderboard data respecting privacy settings';
