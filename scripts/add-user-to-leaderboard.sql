-- Script to manually add a user to the leaderboard
-- This is useful for testing or for users who made trades before the auto-update was implemented

-- First, enable share_trades for the user (replace with actual user_id)
UPDATE public.profiles
SET share_trades = true
WHERE id = 'YOUR_USER_ID_HERE';

-- Then insert initial stats (will be updated by the edge function)
INSERT INTO public.leaderboard_stats (
  user_id,
  portfolio_value,
  total_return,
  total_return_percent,
  trades_count,
  winning_trades,
  losing_trades,
  win_rate,
  followers_count,
  last_calculated_at
)
VALUES (
  'YOUR_USER_ID_HERE',
  0,  -- Will be updated
  0,  -- Will be updated
  0,  -- Will be updated
  0,  -- Will be updated
  0,  -- Will be updated
  0,  -- Will be updated
  0,  -- Will be updated
  0,  -- Will be updated
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  updated_at = NOW();

-- To manually trigger stats update for a user, call the edge function:
-- POST https://YOUR_PROJECT.supabase.co/functions/v1/update-leaderboard-stats
-- With Authorization header containing the user's JWT token
