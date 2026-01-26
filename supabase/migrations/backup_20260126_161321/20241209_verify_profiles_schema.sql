-- Verify and fix profiles table schema
-- This migration ensures the profiles table has the correct columns

-- Check if the old column exists and drop it if it does
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_paper_trading'
    ) THEN
        -- Drop the old column if it exists
        ALTER TABLE public.profiles DROP COLUMN is_paper_trading;
        RAISE NOTICE 'Dropped old is_paper_trading column';
    END IF;
END $$;

-- Ensure the trading_mode column exists with correct type and default
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'trading_mode'
    ) THEN
        -- Add the trading_mode column if it doesn't exist
        ALTER TABLE public.profiles ADD COLUMN trading_mode TEXT DEFAULT 'paper' CHECK (trading_mode IN ('paper', 'live'));
        RAISE NOTICE 'Added trading_mode column';
    ELSE
        -- Update the constraint if the column exists
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_trading_mode_check;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_trading_mode_check CHECK (trading_mode IN ('paper', 'live'));
        RAISE NOTICE 'Updated trading_mode column constraint';
    END IF;
END $$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';