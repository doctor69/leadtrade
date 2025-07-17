-- Create profiles table that extends Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alpaca_accounts table to store Alpaca account information
CREATE TABLE IF NOT EXISTS public.alpaca_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  alpaca_account_id TEXT UNIQUE,
  alpaca_account_number TEXT UNIQUE,
  alpaca_account_status TEXT,
  alpaca_api_key TEXT,
  alpaca_api_secret TEXT,
  account_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_details table for storing additional user information
CREATE TABLE IF NOT EXISTS public.user_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- Hashed password for additional security
  given_name TEXT,
  family_name TEXT,
  date_of_birth DATE,
  tax_id TEXT,
  tax_id_type TEXT DEFAULT 'USA_SSN',
  country_of_citizenship TEXT DEFAULT 'USA',
  country_of_birth TEXT DEFAULT 'USA',
  country_of_tax_residence TEXT DEFAULT 'USA',
  funding_source TEXT[] DEFAULT ARRAY['employment_income'],
  phone_number TEXT,
  street_address TEXT[],
  city TEXT,
  state TEXT,
  postal_code TEXT,
  -- Investment profile
  investment_experience_with_stocks TEXT DEFAULT 'limited',
  investment_objective TEXT DEFAULT 'growth',
  risk_tolerance TEXT DEFAULT 'moderate',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create portfolios table for tracking user portfolios
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  alpaca_account_id TEXT REFERENCES alpaca_accounts(alpaca_account_id),
  total_value DECIMAL(15,2) DEFAULT 0,
  cash DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alpaca_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Alpaca accounts policies
CREATE POLICY "Users can view their own Alpaca accounts" 
  ON public.alpaca_accounts FOR SELECT 
  USING (auth.uid() = user_id);

-- User details policies
CREATE POLICY "Users can view their own details" 
  ON public.user_details FOR SELECT 
  USING (auth.uid() = user_id);

-- Portfolios policies
CREATE POLICY "Users can view their own portfolios" 
  ON public.portfolios FOR SELECT 
  USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_alpaca_accounts_updated_at
BEFORE UPDATE ON public.alpaca_accounts
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_user_details_updated_at
BEFORE UPDATE ON public.user_details
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_portfolios_updated_at
BEFORE UPDATE ON public.portfolios
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();