import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyManagerOrAdminAccess } from '@/lib/admin-auth-secure';


// GET /api/content/gallery?limit=50
export async function GET(req: NextRequest) {
  const authResult = await verifyManagerOrAdminAccess(req);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { user } = authResult;
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 });
  }
  const supabase = supabaseAdmin; // Use the admin client for elevated privileges

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const userIdParam = searchParams.get('user_id'); // Allow filtering by user

  try {
    const uploadsBucket = process.env.NEXT_PUBLIC_UPLOADS_BUCKET || 'user-uploads';

    let query = supabase
      .from('upload_files')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // If a specific user ID is requested (by an admin/manager), filter by it
    if (userIdParam) {
      const { data: sessions, error: sessErr } = await supabase
        .from('upload_sessions')
        .select('id')
        .eq('user_id', userIdParam);
      if (sessErr) {
        console.error('Error fetching filtered sessions:', sessErr);
        return NextResponse.json({ error: sessErr.message }, { status: 500 });
      }
      const sessionIds = (sessions || []).map((s: any) => s.id);
      query = query.in('session_id', sessionIds);
    } else if (user.role === 'athlete') {
      // If the authenticated user is an athlete, only show their own content
      const { data: sessions, error: sessErr } = await supabase
        .from('upload_sessions')
        .select('id')
        .eq('user_id', user.id);
      if (sessErr) {
        console.error('Error fetching athlete sessions:', sessErr);
        return NextResponse.json({ error: sessErr.message }, { status: 500 });
      }
      const sessionIds = (sessions || []).map((s: any) => s.id);
      if (sessionIds.length === 0) {
        return NextResponse.json({ items: [] });
      }
      query = query.in('session_id', sessionIds);
    }
    // For admin/manager without a specific userIdParam, the query fetches all content up to the limit

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
