import { createClient } from '@supabase/supabase-js';

// Access environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Warn if variables are missing (helpful for debugging)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase Setup Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
