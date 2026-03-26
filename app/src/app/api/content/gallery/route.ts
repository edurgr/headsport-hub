import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/admin-auth-secure';


// GET /api/content/gallery?limit=50
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Use service role admin client when available (bypasses RLS); fall back to user-scoped client
  const supabase = supabaseAdmin ?? createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${authResult.token}` } },
  });

  // Fetch the caller's profile to determine role
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', authResult.userId)
    .single();

  const user = callerProfile
    ? { id: authResult.userId, role: callerProfile.role as string }
    : { id: authResult.userId, role: 'athlete' as string };

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '200', 10);
  const userIdParam = searchParams.get('user_id'); // Allow filtering by specific user
  const roleFilterParam = searchParams.get('role_filter'); // Superadmin-only: filter by user role

  try {
    const uploadsBucket = process.env.NEXT_PUBLIC_UPLOADS_BUCKET || 'user-uploads';

    // ── Resolve the allowed user IDs for this caller ─────────────────────────
    // null = no restriction (show all); [] = show nothing
    let allowedUserIds: string[] | null = null;

    if (userIdParam && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'manager')) {
      // Explicit single-user filter (admin/superadmin/manager requesting a specific user)
      allowedUserIds = [userIdParam];
    } else if (user.role === 'athlete') {
      // Athlete: only their own content
      allowedUserIds = [user.id];
    } else if (user.role === 'manager') {
      // Manager: only athletes directly assigned to them
      const { data: managedAthletes } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'athlete')
        .eq('manager_id', user.id);
      allowedUserIds = (managedAthletes || []).map((a: any) => a.id);
    } else if (user.role === 'admin') {
      // Admin: athletes + managers within their jurisdiction
      const { data: adminManagers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'manager')
        .eq('admin_id', user.id);
      const managerIds = (adminManagers || []).map((m: any) => m.id);
      const { data: adminAthletes } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'athlete')
        .in('manager_id', managerIds.length > 0 ? managerIds : ['__none__']);
      const athleteIds = (adminAthletes || []).map((a: any) => a.id);
      allowedUserIds = [...managerIds, ...athleteIds];
    } else if (user.role === 'superadmin' && roleFilterParam && roleFilterParam !== 'all') {
      // Superadmin filtering by user role
      const { data: roleProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', roleFilterParam);
      allowedUserIds = (roleProfiles || []).map((p: any) => p.id);
    }
    // superadmin without role_filter: allowedUserIds stays null → fetch all

    // ── Exclude other superadmins' content from everyone (including other superadmins) ─
    // Fetch IDs of all superadmin profiles except the caller themselves
    const { data: superadminProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'superadmin')
      .neq('id', user.id);
    const superadminIdSet = new Set((superadminProfiles || []).map((p: any) => p.id as string));

    if (allowedUserIds !== null) {
      // Remove any superadmin IDs that may have slipped into the allowed set
      allowedUserIds = allowedUserIds.filter((id) => !superadminIdSet.has(id));
    }

    // ── Build session ID filter ───────────────────────────────────────────────
    let sessionIdFilter: string[] | null = null;

    if (allowedUserIds !== null) {
      if (allowedUserIds.length === 0) {
        return NextResponse.json({ items: [] });
      }
      const { data: allowedSessions, error: sessErr } = await supabase
        .from('upload_sessions')
        .select('id')
        .in('user_id', allowedUserIds);
      if (sessErr) {
        console.error('Error fetching sessions for allowed users:', sessErr);
        return NextResponse.json({ error: sessErr.message }, { status: 500 });
      }
      sessionIdFilter = (allowedSessions || []).map((s: any) => s.id);
      if (sessionIdFilter.length === 0) {
        return NextResponse.json({ items: [] });
      }
    } else {
      // allowedUserIds === null means superadmin with no role filter (see all).
      // Still exclude other superadmins' sessions.
      if (superadminIdSet.size > 0) {
        const { data: excludedSessions } = await supabase
          .from('upload_sessions')
          .select('id')
          .in('user_id', [...superadminIdSet]);
        const excludedIds = new Set((excludedSessions || []).map((s: any) => s.id as string));
        if (excludedIds.size > 0) {
          // We can't do a NOT IN with the current null path; convert to explicit allowed list
          const { data: allSessions } = await supabase
            .from('upload_sessions')
            .select('id');
          sessionIdFilter = (allSessions || [])
            .map((s: any) => s.id as string)
            .filter((id) => !excludedIds.has(id));
          if (sessionIdFilter.length === 0) {
            return NextResponse.json({ items: [] });
          }
        }
      }
    }

    let query = supabase
      .from('upload_files')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sessionIdFilter !== null) {
      query = query.in('session_id', sessionIdFilter);
    }

    const { data: files, error: filesErr } = await query;


    if (filesErr) {
      console.error('Error fetching files:', filesErr);
      return NextResponse.json({ error: filesErr.message }, { status: 500 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Fetch sessions for those files
    const sessionIds = Array.from(new Set(files.map((f: any) => f.session_id)));
    const { data: sessions, error: sessionsError } = await supabase
      .from('upload_sessions')
      .select('id,user_id,title,created_at')
      .in('id', sessionIds);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    const sessionMap = new Map<string, any>();
    (sessions || []).forEach((s: any) => sessionMap.set(s.id, s));

    // Fetch profile names for authors
    const userIds = Array.from(new Set((sessions || []).map((s: any) => s.user_id)));
    const authorNameById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: authors } = await supabase
        .from('profiles')
        .select('id,name')
        .in('id', userIds);
      (authors || []).forEach((p: any) => authorNameById.set(p.id, p.name || ''));
    }

    // Process files and generate URLs
    const items = await Promise.all(
      files.map(async (f: any) => {
        const session = sessionMap.get(f.session_id);
        const authorName = session ? authorNameById.get(session.user_id) || 'Unknown' : 'Unknown';

        let url: string | null = null;
        let thumbnail_url: string | null = null;

        // Generate file URL
        try {
          const { data } = await supabase.storage
            .from(uploadsBucket)
            .createSignedUrl(f.file_path, 60 * 60);
          url = data?.signedUrl || null;
        } catch (error) {
          console.error(`Error creating signed URL for ${f.filename}:`, error);
        }

        // Generate thumbnail URL if present
        if (f.thumbnail_path) {
          try {
            const { data } = await supabase.storage
              .from(uploadsBucket)
              .createSignedUrl(f.thumbnail_path, 60 * 60);
            thumbnail_url = data?.signedUrl || null;
          } catch (error) {
            console.error('Error creating signed thumbnail URL:', error);
          }
        }

        return {
          id: f.id,
          filename: f.filename,
          mime_type: f.mime_type,
          file_type: f.file_type,
          file_size: f.file_size,
          created_at: f.created_at,
          url,
          thumbnail_url,
          metadata: f.metadata || null,
          author: authorName,
          session_title: session?.title || null,
          author_id: session?.user_id || null,
        };
      }),
    );

    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    console.error('Gallery API error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
