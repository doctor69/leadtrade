import { createClient } from "@supabase/supabase-js";

// Validate environment variables at runtime, not build time
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// For static builds, use placeholder values that will be replaced at runtime
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseAnonKey || 'placeholder-key';

// Create a single supabase client for interacting with your database (client-side only)
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'leadtrade-web'
    }
  }
});

// Runtime validation helper (call this in components that need Supabase)
export function validateSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Please check your .env file.');
    return false;
  }
  return true;
}

// For static deployment, we don't use server-side admin client
// Use Supabase Edge Functions instead for admin operations