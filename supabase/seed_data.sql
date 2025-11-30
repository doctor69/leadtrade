-- Seed data for copy trading system testing
-- This file contains test data for development and testing purposes

-- Insert test user profiles (these would normally be created via auth.users)
-- Note: In production, these would be created through Supabase Auth
INSERT INTO public.profiles (id, username, full_name, trading_mode, share_trades, show_asset_amounts, theme_color) VALUES
  ('11111111-1111-1111-1111-111111111111', 'trader_alice', 'Alice Johnson', 'paper', true, true, '#ef4444'),
  ('22222222-2222-2222-2222-222222222222', 'trader_bob', 'Bob Smith', 'paper', true, false, '#3b82f6'),
  ('33333333-3333-3333-3333-333333333333', 'trader_charlie', 'Charlie Brown', 'paper', true, true, '#10b981'),
  ('44444444-4444-4444-4444-444444444444', 'follower_dave', 'Dave Wilson', 'paper', false, false, '#f59e0b'),
  ('55555555-5555-5555-5555-555555555555', 'follower_eve', 'Eve Davis', 'paper', false, false, '#8b5cf6')
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  trading_mode = EXCLUDED.trading_mode,
  share_trades = EXCLUDED.share_trades,
  show_asset_amounts = EXCLUDED.show_asset_amounts,
  theme_color = EXCLUDED.theme_color;

-- Insert copy trading subscriptions
INSERT INTO public.copy_trading_subscriptions (follower_id, leader_id, allocation_percentage, is_active) VALUES
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 60.00, true),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 40.00, true),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 80.00, true),
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 20.00, true)
ON CONFLICT (follower_id, leader_id) DO UPDATE SET
  allocation_percentage = EXCLUDED.allocation_percentage,
  is_active = EXCLUDED.is_active;

-- Insert sample trade executions
INSERT INTO public.trade_executions (original_trade_id, leader_id, symbol, side, quantity, price, trade_type, portfolio_percentage, executed_at) VALUES
  ('alpaca_order_001', '11111111-1111-1111-1111-111111111111', 'AAPL', 'buy', 10.0000, 150.25, 'stock', 5.00, NOW() - INTERVAL '2 days'),
  ('alpaca_order_002', '11111111-1111-1111-1111-111111111111', 'TSLA', 'buy', 5.0000, 220.50, 'stock', 3.50, NOW() - INTERVAL '1 day'),
  ('alpaca_order_003', '22222222-2222-2222-2222-222222222222', 'MSFT', 'buy', 8.0000, 380.75, 'stock', 4.20, NOW() - INTERVAL '3 hours'),
  ('alpaca_order_004', '33333333-3333-3333-3333-333333333333', 'GOOGL', 'buy', 3.0000, 2750.00, 'stock', 6.80, NOW() - INTERVAL '1 hour'),
  ('alpaca_order_005', '11111111-1111-1111-1111-111111111111', 'SPY', 'buy', 20.0000, 450.25, 'stock', 8.50, NOW() - INTERVAL '30 minutes')
ON CONFLICT (original_trade_id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  price = EXCLUDED.price,
  portfolio_percentage = EXCLUDED.portfolio_percentage;

-- Insert sample options trade execution
INSERT INTO public.trade_executions (original_trade_id, leader_id, symbol, side, quantity, price, trade_type, option_details, portfolio_percentage, executed_at) VALUES
  ('alpaca_option_001', '22222222-2222-2222-2222-222222222222', 'AAPL', 'buy', 2.0000, 5.50, 'option', 
   '{"strike": 155, "expiration": "2024-12-20", "option_type": "call"}', 2.50, NOW() - INTERVAL '4 hours')
ON CONFLICT (original_trade_id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  price = EXCLUDED.price,
  option_details = EXCLUDED.option_details,
  portfolio_percentage = EXCLUDED.portfolio_percentage;

-- Insert sample copied trades
INSERT INTO public.copied_trades (original_trade_id, follower_id, alpaca_order_id, symbol, side, quantity, allocated_amount, execution_status, executed_at) VALUES
  ((SELECT id FROM public.trade_executions WHERE original_trade_id = 'alpaca_order_001'), 
   '44444444-4444-4444-4444-444444444444', 'follower_order_001', 'AAPL', 'buy', 6.0000, 901.50, 'filled', NOW() - INTERVAL '2 days'),
  ((SELECT id FROM public.trade_executions WHERE original_trade_id = 'alpaca_order_001'), 
   '55555555-5555-5555-5555-555555555555', 'follower_order_002', 'AAPL', 'buy', 8.0000, 1202.00, 'filled', NOW() - INTERVAL '2 days'),
  ((SELECT id FROM public.trade_executions WHERE original_trade_id = 'alpaca_order_002'), 
   '44444444-4444-4444-4444-444444444444', 'follower_order_003', 'TSLA', 'buy', 3.0000, 661.50, 'filled', NOW() - INTERVAL '1 day'),
  ((SELECT id FROM public.trade_executions WHERE original_trade_id = 'alpaca_order_003'), 
   '44444444-4444-4444-4444-444444444444', 'follower_order_004', 'MSFT', 'buy', 3.2000, 1218.40, 'filled', NOW() - INTERVAL '3 hours'),
  ((SELECT id FROM public.trade_executions WHERE original_trade_id = 'alpaca_order_004'), 
   '55555555-5555-5555-5555-555555555555', 'follower_order_005', 'GOOGL', 'buy', 0.6000, 1650.00, 'filled', NOW() - INTERVAL '1 hour'),
  ((SELECT id FROM public.trade_executions WHERE original_trade_id = 'alpaca_order_005'), 
   '44444444-4444-4444-4444-444444444444', 'follower_order_006', 'SPY', 'buy', 12.0000, 5403.00, 'pending', NOW() - INTERVAL '30 minutes'),
  ((SELECT id FROM public.trade_executions WHERE original_trade_id = 'alpaca_order_005'), 
   '55555555-5555-5555-5555-555555555555', 'follower_order_007', 'SPY', 'buy', 16.0000, 7204.00, 'pending', NOW() - INTERVAL '30 minutes')
ON CONFLICT DO NOTHING;

-- Insert sample copied options trade
INSERT INTO public.copied_trades (original_trade_id, follower_id, alpaca_order_id, symbol, side, quantity, allocated_amount, execution_status, executed_at) VALUES
  ((SELECT id FROM public.trade_executions WHERE original_trade_id = 'alpaca_option_001'), 
   '44444444-4444-4444-4444-444444444444', 'follower_option_001', 'AAPL', 'buy', 0.8000, 440.00, 'filled', NOW() - INTERVAL '4 hours')
ON CONFLICT DO NOTHING;

-- Create some sample alpaca_accounts entries for testing
INSERT INTO public.alpaca_accounts (user_id, alpaca_account_id, alpaca_account_number, alpaca_account_status, account_type) VALUES
  ('11111111-1111-1111-1111-111111111111', 'alpaca_acc_alice', 'ACC001', 'ACTIVE', 'paper'),
  ('22222222-2222-2222-2222-222222222222', 'alpaca_acc_bob', 'ACC002', 'ACTIVE', 'paper'),
  ('33333333-3333-3333-3333-333333333333', 'alpaca_acc_charlie', 'ACC003', 'ACTIVE', 'paper'),
  ('44444444-4444-4444-4444-444444444444', 'alpaca_acc_dave', 'ACC004', 'ACTIVE', 'paper'),
  ('55555555-5555-5555-5555-555555555555', 'alpaca_acc_eve', 'ACC005', 'ACTIVE', 'paper')
ON CONFLICT (alpaca_account_id) DO UPDATE SET
  alpaca_account_status = EXCLUDED.alpaca_account_status,
  account_type = EXCLUDED.account_type;

-- Create sample portfolios
INSERT INTO public.portfolios (user_id, alpaca_account_id, total_value, cash) VALUES
  ('11111111-1111-1111-1111-111111111111', 'alpaca_acc_alice', 25000.00, 5000.00),
  ('22222222-2222-2222-2222-222222222222', 'alpaca_acc_bob', 18000.00, 3500.00),
  ('33333333-3333-3333-3333-333333333333', 'alpaca_acc_charlie', 32000.00, 8000.00),
  ('44444444-4444-4444-4444-444444444444', 'alpaca_acc_dave', 15000.00, 2000.00),
  ('55555555-5555-5555-5555-555555555555', 'alpaca_acc_eve', 12000.00, 1500.00)
ON CONFLICT DO NOTHING;