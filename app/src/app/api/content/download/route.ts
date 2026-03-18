import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

// POST /api/content/download
// Body: { file_ids?: string[], athlete_id?: string, all_for_athlete?: boolean }
export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const bucket = (process.env.NEXT_PUBLIC_UPLOADS_BUCKET as string) || 'user-uploads';
    const body = await req.json();
    const { file_ids, athlete_id, all_for_athlete } = body || {};

    // Auth: use cookie client, fallback to Authorization header
    let sb = await supabaseServer();
    let { data: userData } = await sb.auth.getUser();
    if (!userData?.user) {
      const authHeader = (req as any).headers?.get?.('authorization');
      if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        sb = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        userData = (await sb.auth.getUser()).data;
      }
    }
    if (!userData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve files to download
    let files: { id: string; file_path: string; filename: string }[] = [];

    if (Array.isArray(file_ids) && file_ids.length > 0) {
      const { data, error } = await (supabaseAdmin ?? sb)
        .from('upload_files')
        .select('id,file_path,filename,session_id')
        .in('id', file_ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      files = (data || []).map((f: any) => ({
        id: f.id,
        file_path: f.file_path,
        filename: f.filename,
      }));
    } else if (all_for_athlete && athlete_id) {
      // Find all sessions for athlete
      const { data: sessions, error: sessErr } = await (supabaseAdmin ?? sb)
        .from('upload_sessions')
        .select('id')
        .eq('user_id', athlete_id);
      if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 });
      const sessionIds = (sessions || []).map((s: any) => s.id);
      if (sessionIds.length === 0) return NextResponse.json({ urls: [] });
      const { data, error } = await (supabaseAdmin ?? sb)
        .from('upload_files')
        .select('id,file_path,filename')
        .in('session_id', sessionIds);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      files = data || ([] as any);
    } else {
      return NextResponse.json({ error: 'No files specified' }, { status: 400 });
    }

    if (!files || files.length === 0) return NextResponse.json({ urls: [] });

    // Create signed URLs for each file (1 hour)
    const storageClient = supabaseAdmin ?? sb;
    const signedUrls: { id: string; filename: string; url: string }[] = [];
    for (const f of files) {
      const { data, error } = await storageClient.storage
        .from(bucket)
        .createSignedUrl(f.file_path, 60 * 60);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (data?.signedUrl) {
        signedUrls.push({ id: f.id, filename: f.filename, url: data.signedUrl });
      }
    }

    // Return list of signed URLs; client can parallel download or zip client-side
    return NextResponse.json({ urls: signedUrls });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

