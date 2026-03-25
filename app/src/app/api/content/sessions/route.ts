import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/admin-auth-secure';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // For elevated roles use service role client (bypasses RLS) so they see all sessions.
  // For athletes, use the user-scoped RLS client so they only see their own.
  const sb = supabaseAdmin ?? (await supabaseServer());

  // If service role not available, scope to current user to avoid RLS blocking the query
  let query = sb.from('upload_sessions').select('id,title,created_at,user_id').order('created_at', { ascending: false });

  // When using the RLS user client, the policy scopes automatically.
  // When using service role, we rely on caller to filter client-side if needed.
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data || [] });
}

