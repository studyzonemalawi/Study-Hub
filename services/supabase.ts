
import { createClient } from '@supabase/supabase-js';

// Live Supabase credentials for "Study Hub Malawi"
const supabaseUrl = 'https://vkykmbxpdmvvdtmciolo.supabase.co';
const supabaseAnonKey = 'sb_publishable_mu0YVJi78VLOdUt5zpAirA_VwG55UzO';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
