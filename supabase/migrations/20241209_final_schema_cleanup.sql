-- Final schema cleanup to remove all is_paper_trading references
-- This migration ensures complete removal of the old column and fixes any remaining issues

-- 1. Drop the old column if it exists (force drop)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_paper_trading;

-- 2. Ensure trading_mode column exists with proper constraints
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trading_mode TEXT DEFAULT 'paper';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_trading_mode_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_trading_mode_check CHECK (trading_mode IN ('paper', 'live'));

-- 3. Update any existing NULL trading_mode values to 'paper'
UPDATE public.profiles SET trading_mode = 'paper' WHERE trading_mode IS NULL;

-- 4. Make trading_mode NOT NULL
ALTER TABLE public.profiles ALTER COLUMN trading_mode SET NOT NULL;

-- 5. Recreate the handle_new_user function to ensure it's correct
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with essential data only using correct column names
  INSERT INTO public.profiles (id, username, full_name, email, trading_mode)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'), 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    'paper' -- Default to paper trading
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Force refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 8. Add helpful comments
COMMENT ON COLUMN public.profiles.trading_mode IS 'Trading mode: paper or live trading';
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile when new user is created via auth.users trigger - uses trading_mode column';

-- 9. Verify the schema is correct
DO $$
BEGIN
    -- Check that is_paper_trading column does not exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_paper_trading'
    ) THEN
        RAISE EXCEPTION 'ERROR: is_paper_trading column still exists!';
    END IF;
    
    -- Check that trading_mode column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'trading_mode'
    ) THEN
        RAISE EXCEPTION 'ERROR: trading_mode column does not exist!';
    END IF;
    
    RAISE NOTICE 'Schema verification passed: is_paper_trading removed, trading_mode exists';
END $$;