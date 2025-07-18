import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://bfbqlzpbkivyrnjkvqgl.supabase.co",
  "sb_secret_QWlPDMh0CGGGIh1gh1oErw_c_jgK1fJ",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

export { supabase };
