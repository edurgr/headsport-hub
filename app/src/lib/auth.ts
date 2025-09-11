import { cookies } from 'next/headers';

import { createClient } from '@supabase/supabase-js';

export async function getUserServer() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sb:token')?.value ?? '';
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration in getUserServer');
    return null;
  }
  
  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
