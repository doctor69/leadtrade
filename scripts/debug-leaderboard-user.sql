-- Debug script to check why a user is not appearing on leaderboard
-- Replace 'USER_EMAIL_HERE' with the actual user email

-- 1. Check if user exists and has share_trades enabled
SELECT 
  id,
  username,
  email,
  share_trades,
  show_asset_amounts,
  created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'USER_EMAIL_HERE';

-- 2. Check if user has entry in leaderboard_stats
SELECT 
  ls.*,
  p.username,
  p.share_trades
FROM public.leaderboard_stats ls
JOIN public.profiles p ON p.id = ls.user_id
JOIN auth.users u ON u.id = ls.user_id
WHERE u.email = 'USER_EMAIL_HERE';

-- 3. Check all users in leaderboard_stats
SELECT 
  ls.user_id,
  p.username,
  u.email,
  ls.portfolio_value,
  ls.total_return_percent,
  ls.trades_count,
  ls.win_rate,
  ls.last_calculated_at,
  p.share_trades
FROM public.leaderboard_stats ls
JOIN public.profiles p ON p.id = ls.user_id
JOIN auth.users u ON u.id = ls.user_id
ORDER BY ls.total_return_percent DESC;

-- 4. Check if user has made any orders
SELECT 
  COUNT(*) as order_count,
  u.email,
  p.username
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'USER_EMAIL_HERE'
GROUP BY u.email, p.username;
