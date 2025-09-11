import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { verifyAdminAccess } from '@/lib/admin-auth-secure';

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const adminResult = await verifyAdminAccess(request);
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status });
    }

    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Server not configured for admin operations' },
        { status: 500 },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const normalized = email.trim().toLowerCase();

    const result: any = {
      email: normalized,
      auth: { deleted: false, userId: null },
      profiles: { deletedCount: 0 },
      invitations: { deletedCount: 0 },
    };

    // Find auth user by email (paginate)
    let userId: string | null = null;
    try {
      let page = 1;
      const perPage = 1000;
      const maxPages = 20;
      while (page <= maxPages) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) break;
        const users = data?.users || [];
        const match = users.find((u: any) => (u.email || '').toLowerCase() === normalized);
        if (match) {
          userId = match.id;
          break;
        }
        if (users.length < perPage) break;
        page += 1;
      }
    } catch {}

    // Delete auth user
    if (userId) {
      try {
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (!error) {
          result.auth.deleted = true;
          result.auth.userId = userId;
        }
      } catch {}
    }

    // Delete profile rows
    try {
      // delete by id if we had it
      if (userId) {
        const { error } = await admin.from('profiles').delete().eq('id', userId);
        if (!error) result.profiles.deletedCount += 1; // heuristic
      }
      // also delete by email match
      const { data: profRows, error: profErr } = await admin
        .from('profiles')
        .select('id')
        .ilike('email', normalized);
      if (!profErr && profRows && profRows.length > 0) {
        const ids = profRows.map((r: any) => r.id);
        const { error } = await admin.from('profiles').delete().in('id', ids);
        if (!error) result.profiles.deletedCount += ids.length;
      }
    } catch {}

    // Delete invitations in either schema
    try {
      const { data: inv1 } = await admin
        .from('invitations')
        .select('id')
        .ilike('email', normalized);
      if (inv1 && inv1.length > 0) {
        const { error } = await admin
          .from('invitations')
          .delete()
          .in(
            'id',
            inv1.map((r: any) => r.id),
          );
        if (!error) result.invitations.deletedCount += inv1.length;
      }
    } catch {}
    try {
      const { data: inv2 } = await admin.from('invites').select('id').ilike('email', normalized);
      if (inv2 && inv2.length > 0) {
        const { error } = await admin
          .from('invites')
          .delete()
          .in(
            'id',
            inv2.map((r: any) => r.id),
          );
        if (!error) result.invitations.deletedCount += inv2.length;
      }
    } catch {}

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 },
    );
  }
}
