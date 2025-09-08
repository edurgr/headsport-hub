import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const { token, email } = await req.json();
  const sb = await supabaseServer();

  const { data: inv, error: e1 } = await sb.from('invites').select('*').eq('token', token).single();
  if (e1 || !inv) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  
  if (inv.used || new Date(inv.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Expired/used token' }, { status: 400 });
  }
  
  if (email && email !== inv.email) return NextResponse.json({ error: 'Email mismatch' }, { status: 400 });

  // Mark invite as used; profile creation is handled on auth signup trigger

  await sb.from('invites').update({ used: true }).eq('token', token);

  return NextResponse.json({ ok: true });
}
