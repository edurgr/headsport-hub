import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  try {
    const sb = supabaseAdmin || (await supabaseServer());
    const url = new URL(req.url);
    const scope = (url.searchParams.get('scope') || 'mine').toLowerCase();
    const athleteEmail = url.searchParams.get('athleteEmail') || undefined;

    let query: any = sb
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (scope === 'pending') {
      query = query.eq('status', 'pending_approval');
    }
    if (scope === 'approved') {
      query = query.eq('status', 'approved');
    }
    if (scope === 'all') {
      // For 'all' scope, don't filter by status - show all orders
      // This is typically used by managers/admins to see all orders
    }

    if (scope === 'mine' && athleteEmail) {
      query = query.eq('athlete_email', athleteEmail);
    }

    const { data: orders, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch orders: ' + error.message }, { status: 500 });
    }

    // Enrich with athlete phone from profiles (single query)
    const emails = Array.from(new Set((orders || []).map((o: any) => o.athlete_email).filter(Boolean)));
    const phoneByEmail: Record<string, string> = {};
    if (emails.length > 0) {
      const { data: profiles } = await (supabaseAdmin || (await supabaseServer()))
        .from('profiles')
        .select('email, name, phone')
        .in('email', emails);
      (profiles || []).forEach((p: any) => {
        phoneByEmail[p.email] = p.phone || '';
      });
    }

    const enriched = (orders || []).map((o: any) => ({
      ...o,
      athlete_phone: phoneByEmail[o.athlete_email] || null,
    }));

    return NextResponse.json({ success: true, orders: enriched, total: enriched.length });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


