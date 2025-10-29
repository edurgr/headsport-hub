import { NextResponse } from 'next/server';

import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const sb = await supabaseServer();
  const { data: settings, error } = await sb
    .from('org_settings')
    .select('*')
    .order('id', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const { orders_enabled } = await req.json();

  if (typeof orders_enabled !== 'boolean') {
    return NextResponse.json({ error: 'orders_enabled must be a boolean' }, { status: 400 });
  }

  const sb = await supabaseServer();
  const { data: settings, error } = await sb
    .from('org_settings')
    .update({ orders_enabled })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings });
}
export const runtime = 'edge';
