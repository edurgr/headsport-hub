import { type SupabaseClient, createClient } from '@supabase/supabase-js';

// Provide safe fallbacks to avoid build-time failures when env vars are not set.
// These values are placeholders and should be overridden via .env.local in real environments.
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL as string) || 'http://localhost:54321';
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || 'public-anon-key';

export const supabaseClient: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web',
    },
  },
});
