import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') || '';
  const sb = await supabaseServer();

  const { data, error } = await sb.from('invites').select('*').eq('token', token).single();
  if (error || !data) return NextResponse.json({ valid: false }, { status: 404 });
  
  const expired = new Date(data.expires_at).getTime() < Date.now();
  if (data.used || expired) return NextResponse.json({ valid: false }, { status: 400 });
  
  return NextResponse.json({ valid: true, email: data.email, rolePreset: data.role_preset });
}
