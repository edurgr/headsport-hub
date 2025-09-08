import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin as supabaseAdminClient } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

// GET /api/content/gallery?limit=50
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const filterUserId = searchParams.get('user_id') || undefined;

    // Gallery API params: { limit, user_id: filterUserId }

    // Create Supabase clients
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const uploadsBucket = process.env.NEXT_PUBLIC_UPLOADS_BUCKET;

    // Environment variables check passed

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    // Environment variables check passed

    // Create admin client for storage operations if available (prefer shared admin client)
    const supabaseAdmin =
      supabaseAdminClient ?? (serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null);
    // Supabase admin client created

    // Create user-scoped client from cookies (works even if Authorization header isn't provided)
    let sb = await supabaseServer();

    // Resolve current user id and role
    let currentUserId: string | null = null;
    let role: string = 'athlete';

    // First try cookies/session-based auth via server client
    const { data: userData } = await sb.auth.getUser();
    if (userData?.user) {
      currentUserId = userData.user.id;
      const { data: prof } = await sb
        .from('profiles')
        .select('role, name')
        .eq('id', currentUserId)
        .single();
      role = prof?.role || 'athlete';
    } else {
      // Fallback to Authorization header: decode JWT to extract user id
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const payloadB64 = token.split('.')[1];
          const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
          const payloadJson = Buffer.from(base64, 'base64').toString('utf8');
          const payload = JSON.parse(payloadJson);
          currentUserId = payload.sub || payload.user_id || null;
          // Build client with header for storage signing if needed
          sb = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          });
          if (currentUserId) {
            // Fetch role using admin if available, otherwise user-scoped
            const source = supabaseAdmin ?? sb;
            const { data: prof } = await source
              .from('profiles')
              .select('role')
              .eq('id', currentUserId)
              .single();
            role = prof?.role || 'athlete';
          }
        } catch (e) {
          console.error('Failed to decode auth token:', e);
        }
      }
    }

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch files based on role
    let files: any[] = [];
    if (role === 'manager' || role === 'admin') {
      // If user_id filter provided, restrict by sessions owned by that user
      if (filterUserId) {
        const source = supabaseAdmin ?? sb;
        const { data: filteredSessions, error: sessErr } = await source
          .from('upload_sessions')
          .select('id')
          .eq('user_id', filterUserId);
        if (sessErr) {
          console.error('Error fetching filtered sessions:', sessErr);
          return NextResponse.json({ error: sessErr.message }, { status: 500 });
        }
        const filteredSessionIds = (filteredSessions || []).map((s: any) => s.id);
        const { data, error: filesErr } = await (supabaseAdmin ?? sb)
          .from('upload_files')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit)
          .in('session_id', filteredSessionIds);
        if (filesErr) {
          console.error('Error fetching files:', filesErr);
          return NextResponse.json({ error: filesErr.message }, { status: 500 });
        }
        files = data || [];
      } else {
        const { data, error: filesErr } = await (supabaseAdmin ?? sb)
          .from('upload_files')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (filesErr) {
          console.error('Error fetching files:', filesErr);
          return NextResponse.json({ error: filesErr.message }, { status: 500 });
        }
        files = data || [];
      }
    } else {
      const source = supabaseAdmin ?? sb;
      const { data: ownSessions, error: sessErr } = await source
        .from('upload_sessions')
        .select('id')
        .eq('user_id', currentUserId);

      if (sessErr) {
        console.error('Error fetching sessions:', sessErr);
        return NextResponse.json({ error: sessErr.message }, { status: 500 });
      }

      const sessionIds = (ownSessions || []).map((s: any) => s.id);

      if (sessionIds.length === 0) {
        return NextResponse.json({ items: [] });
      }

      const { data, error: filesErr } = await source
        .from('upload_files')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
        .in('session_id', sessionIds);

      if (filesErr) {
        console.error('Error fetching user files:', filesErr);
        return NextResponse.json({ error: filesErr.message }, { status: 500 });
      }
      files = data || [];
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Fetch sessions for those files
    const sessionIds = Array.from(new Set(files.map((f: any) => f.session_id)));
    const sessionSource = supabaseAdmin ?? sb;
    const { data: sessions, error: sessionsError } = await sessionSource
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
      const { data: authors } = await sessionSource
        .from('profiles')
        .select('id,name')
        .in('id', userIds);
      (authors || []).forEach((p: any) => authorNameById.set(p.id, p.name || ''));
    }

    const bucket = process.env.NEXT_PUBLIC_UPLOADS_BUCKET || 'user-uploads';

    if (!bucket) {
      console.error('No uploads bucket configured');
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
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
          const storageClient = supabaseAdmin ?? sb;
          const { data } = await storageClient.storage
            .from(bucket)
            .createSignedUrl(f.file_path, 60 * 60);
          url = data?.signedUrl || null;
        } catch (error) {
          console.error(`Error creating signed URL for ${f.filename}:`, error);
          try {
            const { data } = (supabaseAdmin ?? sb).storage.from(bucket).getPublicUrl(f.file_path);
            url = data.publicUrl;
          } catch (fallbackError) {
            console.error(`Error creating public URL for ${f.filename}:`, fallbackError);
            url = null;
          }
        }

        // Generate thumbnail URL if present
        if (f.thumbnail_path) {
          try {
            const storageClient = supabaseAdmin ?? sb;
            const { data } = await storageClient.storage
              .from(bucket)
              .createSignedUrl(f.thumbnail_path, 60 * 60);
            thumbnail_url = data?.signedUrl || null;
          } catch (error) {
            console.error('Error creating signed thumbnail URL:', error);
            try {
              const { data } = (supabaseAdmin ?? sb).storage
                .from(bucket)
                .getPublicUrl(f.thumbnail_path);
              thumbnail_url = data.publicUrl;
            } catch (fallbackError) {
              console.error('Error creating public thumbnail URL:', fallbackError);
              thumbnail_url = null;
            }
          }
        } else {
        }

        const item = {
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

        return item;
      })
    );

    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    console.error('Gallery API error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
