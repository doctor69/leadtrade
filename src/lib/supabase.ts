import { createClient } from "@supabase/supabase-js";

// Create a single supabase client for interacting with your database (client-side only)
export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// For static deployment, we don't use server-side admin client
// Use Supabase Edge Functions instead for admin operations