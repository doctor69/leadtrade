-- Temporarily disable the handle_new_user trigger to fix the is_paper_trading issue
-- This allows the Edge Function to handle profile creation without conflicts

-- 1. Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop the function that might have cached references
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Force drop the old column if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_paper_trading;

-- 4. Ensure trading_mode column exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trading_mode TEXT DEFAULT 'paper';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_trading_mode_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_trading_mode_check CHECK (trading_mode IN ('paper', 'live'));

-- 5. Update any existing NULL trading_mode values
UPDATE public.profiles SET trading_mode = 'paper' WHERE trading_mode IS NULL;
ALTER TABLE public.profiles ALTER COLUMN trading_mode SET NOT NULL;

-- 6. Force refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 7. Add comment explaining the temporary state
COMMENT ON TABLE public.profiles IS 'Profiles table - trigger temporarily disabled, Edge Function handles profile creation';

-- Note: We will recreate the trigger later once the schema issues are resolved