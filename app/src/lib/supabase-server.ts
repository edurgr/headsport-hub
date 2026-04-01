import { cookies } from 'next/headers';

import { createClient } from '@supabase/supabase-js';

export async function supabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Create a mock client for demo mode when Supabase is not configured
  if (!supabaseUrl || !supabaseAnonKey) {
    const chainable = () => ({
      eq: () => ({
        data: [],
        error: null,
        single: async () => ({ data: null, error: null }),
        range: () => ({ data: [], error: null }),
      }),
      in: () => ({ data: [], error: null }),
      order: () => ({
        range: () => ({ data: [], error: null }),
        eq: () => ({ data: [], error: null }),
      }),
      select: () => ({
        single: async () => ({ data: null, error: null }),
        eq: () => ({ data: [], error: null }),
        order: () => ({
          range: () => ({ data: [], error: null }),
          eq: () => ({ data: [], error: null }),
        }),
      }),
      range: () => ({ data: [], error: null }),
      single: async () => ({ data: null, error: null }),
      limit: () => ({ data: [], error: null, single: async () => ({ data: null, error: null }) }),
    });

    const mock = {
      from: () => ({
        select: chainable().select,
        update: () => ({
          eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
        }),
        upsert: async () => ({ data: null, error: null }),
        insert: async () => ({ data: null, error: null }),
        delete: () => ({ eq: () => ({ data: null, error: null }) }),
      }),
    } as any;
    return mock;
  }

  // Try to attach the user's access token from cookies for RLS-aware server calls
  const cookieStore = await cookies();

  const extractTokenFromCookie = (raw: string): string => {
    try {
      const arr = JSON.parse(decodeURIComponent(raw));
      if (Array.isArray(arr) && typeof arr[0] === 'string') return arr[0];
    } catch { /* not JSON array */ }
    return raw;
  };

  // Check multiple possible Supabase cookie names (project-specific and generic)
  const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] ?? '';
  const cookieNames = [
    'sb-access-token',
    'sb:token',
    ...(projectRef ? [`sb-${projectRef}-auth-token`, `sb-${projectRef}-auth-token.0`] : []),
    'sb-localhost-auth-token',
    'supabase-auth-token',
  ];
  let token = '';
  for (const name of cookieNames) {
    const raw = cookieStore.get(name)?.value;
    if (raw) {
      token = extractTokenFromCookie(raw);
      if (token) break;
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
