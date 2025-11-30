-- Fix RLS policies for alpaca_accounts table to allow service role access
-- This ensures Edge Functions can insert Alpaca account data

-- Add service role policy for alpaca_accounts
CREATE POLICY "Service role can manage Alpaca accounts" ON public.alpaca_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- Ensure the table has RLS enabled
ALTER TABLE public.alpaca_accounts ENABLE ROW LEVEL SECURITY;

-- Add helpful comment
COMMENT ON POLICY "Service role can manage Alpaca accounts" ON public.alpaca_accounts IS 'Allows Edge Functions with service role to manage Alpaca account records';