
import { createClient } from '@supabase/supabase-js';

// Supabase credentials provided by the user
const supabaseUrl = 'https://rvgqcnwjsrsbwxsgncfw.supabase.co';
const supabaseAnonKey = 'sb_publishable_bOS9YW-wIImt1qOH8DtxyQ_6wn2QrEE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
