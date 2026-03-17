import { NextResponse } from 'next/server';

import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
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

export const runtime = 'edge';
