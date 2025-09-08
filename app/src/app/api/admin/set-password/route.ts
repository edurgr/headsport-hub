import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const target = (email as string).trim().toLowerCase();

    // Find user by email (paginate)
    let userId: string | null = null;
    let page = 1;
    const perPage = 1000;
    const maxPages = 20;
    while (page <= maxPages) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) break;
      const users = data?.users || [];
      const match = users.find((u: any) => (u.email || '').toLowerCase() === target);
      if (match) {
        userId = match.id;
        break;
      }
      if (users.length < perPage) break;
      page += 1;
    }

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password });
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId });
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}
