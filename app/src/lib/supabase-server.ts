import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function supabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Create a mock client for demo mode when Supabase is not configured
  if (!supabaseUrl || !supabaseAnonKey) {
    const chainable = () => ({
      eq: () => ({ data: [], error: null, single: async () => ({ data: null, error: null }), range: () => ({ data: [], error: null }) }),
      in: () => ({ data: [], error: null }),
      order: () => ({ range: () => ({ data: [], error: null }), eq: () => ({ data: [], error: null }) }),
      select: () => ({ single: async () => ({ data: null, error: null }), eq: () => ({ data: [], error: null }), order: () => ({ range: () => ({ data: [], error: null }), eq: () => ({ data: [], error: null }) }) }),
      range: () => ({ data: [], error: null }),
      single: async () => ({ data: null, error: null }),
      limit: () => ({ data: [], error: null, single: async () => ({ data: null, error: null }) })
    });

    const mock = {
      from: () => ({
        select: chainable().select,
        update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
        upsert: async () => ({ data: null, error: null }),
        insert: async () => ({ data: null, error: null }),
        delete: () => ({ eq: () => ({ data: null, error: null }) })
      })
    } as any;
    return mock;
  }

  // Try to attach the user's access token from cookies for RLS-aware server calls
  const cookieStore = await cookies();
  let token =
    cookieStore.get('sb-access-token')?.value ||
    cookieStore.get('sb:token')?.value ||
    '';

  // Also support Supabase auth cookie that stores [access, refresh]
  if (!token) {
    const supabaseAuth = cookieStore.get('supabase-auth-token')?.value;
    if (supabaseAuth) {
      try {
        const decoded = decodeURIComponent(supabaseAuth);
        const arr = JSON.parse(decoded);
        if (Array.isArray(arr) && typeof arr[0] === 'string') {
          token = arr[0];
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  if (token) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }

  // Fallback to anon client (no user context)
  return createClient(supabaseUrl, supabaseAnonKey);
}
