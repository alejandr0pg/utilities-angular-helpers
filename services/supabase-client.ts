import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

const supabase: SupabaseClient = createClient(
  environment.supabase.url,
  environment.supabase.key,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

export default supabase;
