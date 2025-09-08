import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = (url.searchParams.get('email') || '').trim().toLowerCase();
    const perPage = parseInt(url.searchParams.get('perPage') || '1000', 10);

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Server not configured for admin operations' },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Check profiles table
    const profilesResult: any = { found: false, rows: [] as any[] };
    try {
      const { data, error } = await admin
        .from('profiles')
        .select('id,email,name,role,created_at,updated_at')
        .ilike('email', email);
      if (!error && data && data.length > 0) {
        profilesResult.found = true;
        profilesResult.rows = data;
      }
    } catch {}

    // Check invitations/invites tables
    const invitationsResult: any = { found: false, rows: [] as any[] };
    try {
      const { data, error } = await admin.from('invitations').select('*').ilike('email', email);
      if (!error && data && data.length > 0) {
        invitationsResult.found = true;
        invitationsResult.rows = data;
      }
    } catch {}

    try {
      const { data, error } = await admin.from('invites').select('*').ilike('email', email);
      if (!error && data && data.length > 0) {
        invitationsResult.found = true;
        invitationsResult.rows = [...invitationsResult.rows, ...data];
      }
    } catch {}

    // Check auth users via Admin API (paginate)
    const authResult: any = { found: false, user: null as any };
    try {
      let page = 1;
      const maxPages = 20; // safety guard
      while (page <= maxPages) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) break;
        const users = data?.users || [];
        const match = users.find((u: any) => (u.email || '').toLowerCase() === email);
        if (match) {
          authResult.found = true;
          authResult.user = {
            id: match.id,
            email: match.email,
            created_at: match.created_at,
            confirmed_at: match.confirmed_at,
          };
          break;
        }
        if (users.length < perPage) break; // no more pages
        page += 1;
      }
    } catch {}

    const foundAnywhere = authResult.found || profilesResult.found || invitationsResult.found;
    return NextResponse.json({
      email,
      found: foundAnywhere,
      auth: authResult,
      profiles: profilesResult,
      invitations: invitationsResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
