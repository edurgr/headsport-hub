import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
      'The app will not be able to authenticate. Set these variables in your Cloudflare Pages environment.',
  );
}

// Use real values only — placeholder URLs cause getSession() to hang forever,
// leaving the app stuck in skeleton loading state.
export const supabaseClient = createBrowserClient(
  supabaseUrl || 'https://localhost',
  supabaseAnonKey || 'missing-key',
);
