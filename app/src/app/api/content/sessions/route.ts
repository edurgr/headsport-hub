import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/admin-auth-secure';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const sb = await supabaseServer();
  const { data, error } = await sb
    .from('upload_sessions')
    .select('id,title,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data || [] });
}

