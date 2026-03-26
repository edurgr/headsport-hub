import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/admin-auth-secure';

export async function GET(req: Request) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const sb = supabaseAdmin || (await supabaseServer());
    const url = new URL(req.url);
    const scope = (url.searchParams.get('scope') || 'mine').toLowerCase();
    const athleteEmail = url.searchParams.get('athleteEmail') || undefined;
    const roleFilter = url.searchParams.get('roleFilter') || undefined;

    // Determine caller's role to enforce hierarchy access control
    const { data: callerProfile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', authResult.userId)
      .single();
    const callerRole = callerProfile?.role as string | undefined;

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

    if (scope === 'mine' && athleteEmail) {
      query = query.eq('athlete_email', athleteEmail);
    }

    // ── Hierarchy-based email restrictions ────────────────────────────────────
    if (callerRole === 'manager') {
      // Manager: only their assigned athletes' orders
      const { data: managedAthletes } = await sb
        .from('profiles')
        .select('email')
        .eq('role', 'athlete')
        .eq('manager_id', authResult.userId);
      const allowedEmails = (managedAthletes || []).map((p: any) => p.email).filter(Boolean);
      if (allowedEmails.length === 0) {
        return NextResponse.json({ success: true, orders: [], total: 0 });
      }
      query = query.in('athlete_email', allowedEmails);
    } else if (callerRole === 'admin') {
      // Admin: athletes belonging to managers under this admin
      const { data: adminManagers } = await sb
        .from('profiles')
        .select('id')
        .eq('role', 'manager')
        .eq('admin_id', authResult.userId);
      const managerIds = (adminManagers || []).map((m: any) => m.id);
      const { data: adminAthletes } = await sb
        .from('profiles')
        .select('email')
        .eq('role', 'athlete')
        .in('manager_id', managerIds.length > 0 ? managerIds : ['__none__']);
      const allowedEmails = (adminAthletes || []).map((p: any) => p.email).filter(Boolean);
      if (allowedEmails.length === 0) {
        return NextResponse.json({ success: true, orders: [], total: 0 });
      }
      query = query.in('athlete_email', allowedEmails);
    } else if (callerRole === 'superadmin' && roleFilter && ['athlete', 'manager', 'admin'].includes(roleFilter)) {
      // Superadmin: optional role filter
      const { data: roleProfiles } = await sb
        .from('profiles')
        .select('email')
        .eq('role', roleFilter);
      const roleEmails = (roleProfiles || []).map((p: any) => p.email).filter(Boolean);
      if (roleEmails.length === 0) {
        return NextResponse.json({ success: true, orders: [], total: 0 });
      }
      query = query.in('athlete_email', roleEmails);
    } else if (callerRole === 'athlete') {
      // Athlete: enforce own orders only (ignore any scope params)
      const { data: selfProfile } = await sb
        .from('profiles')
        .select('email')
        .eq('id', authResult.userId)
        .single();
      if (selfProfile?.email) {
        query = query.eq('athlete_email', selfProfile.email);
      }
    }

    const { data: orders, error } = await query;
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch orders: ' + error.message },
        { status: 500 },
      );
    }

    // Enrich with athlete phone from profiles (single query)
    const emails = Array.from(
      new Set((orders || []).map((o: any) => o.athlete_email).filter(Boolean)),
    );
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
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
