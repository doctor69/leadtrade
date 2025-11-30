-- Fix profile creation issues
-- This migration ensures the handle_new_user function uses correct column names
-- and prevents conflicts between trigger and manual profile creation

-- Drop and recreate the handle_new_user function with correct column names
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile when new user is created via auth.users trigger';