-- Streamlined database setup for simplified signup process
-- This ensures the database is ready for the new streamlined signup

-- 1. Ensure profiles table has correct structure
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_paper_trading;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trading_mode TEXT DEFAULT 'paper';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_trading_mode_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_trading_mode_check CHECK (trading_mode IN ('paper', 'live'));

-- 2. Ensure alpaca_accounts table exists with correct structure
CREATE TABLE IF NOT EXISTS public.alpaca_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alpaca_account_id TEXT NOT NULL UNIQUE,
  alpaca_account_number TEXT,
  account_status TEXT DEFAULT 'ACTIVE',
  account_type TEXT DEFAULT 'paper' CHECK (account_type IN ('paper', 'live')),
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  kyc_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, account_type)
);

-- 3. Remove any problematic triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 4. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alpaca_accounts ENABLE ROW LEVEL SECURITY;

-- 5. Create simple RLS policies
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
CREATE POLICY "Users can manage their own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
CREATE POLICY "Service role can manage profiles" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can manage their own Alpaca accounts" ON public.alpaca_accounts;
CREATE POLICY "Users can manage their own Alpaca accounts" ON public.alpaca_accounts
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage Alpaca accounts" ON public.alpaca_accounts;
CREATE POLICY "Service role can manage Alpaca accounts" ON public.alpaca_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_alpaca_accounts_user_id ON public.alpaca_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_alpaca_accounts_alpaca_id ON public.alpaca_accounts(alpaca_account_id);

-- 7. Update any existing profiles to have trading_mode
UPDATE public.profiles SET trading_mode = 'paper' WHERE trading_mode IS NULL;
ALTER TABLE public.profiles ALTER COLUMN trading_mode SET NOT NULL;

-- 8. Force refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 9. Add helpful comments
COMMENT ON TABLE public.profiles IS 'User profiles - managed by streamlined signup process';
COMMENT ON TABLE public.alpaca_accounts IS 'Alpaca account references - created during signup';
COMMENT ON COLUMN public.profiles.trading_mode IS 'Trading mode: paper or live';
COMMENT ON COLUMN public.alpaca_accounts.alpaca_account_id IS 'Alpaca account ID for trading operations';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Streamlined database setup completed successfully';
    RAISE NOTICE 'Ready for streamlined signup process';
END $$;