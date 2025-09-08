import { cookies } from 'next/headers';

import { createClient } from '@supabase/supabase-js';

export async function getUserServer() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sb:token')?.value ?? '';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
