import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

async function getClientFromRequest(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  if (supabaseUrl && supabaseAnonKey) {
    const authHeader = (req as any).headers?.get?.('authorization');
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
    }
  }
  return await supabaseServer();
}

// GET /api/content/files?session_id=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');
  const sb = await getClientFromRequest(req);

  const query = sb.from('upload_files').select('*').order('created_at', { ascending: false });
  const { data, error } = sessionId ? await query.eq('session_id', sessionId) : await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ files: data || [] });
}

// DELETE /api/content/files?id=...
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const sb = await getClientFromRequest(req);
  // Fetch file record to remove from Storage as well
  const { data: file, error: fetchError } = await sb
    .from('upload_files')
    .select('file_path')
    .eq('id', id)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const { error: deleteDbError } = await sb.from('upload_files').delete().eq('id', id);
  if (deleteDbError) return NextResponse.json({ error: deleteDbError.message }, { status: 500 });

  // Remove from storage (best-effort)
  try {
    if (!supabaseAdmin) throw new Error('Storage admin not configured');
    const bucket = process.env.NEXT_PUBLIC_UPLOADS_BUCKET as string;
    await supabaseAdmin.storage.from(bucket).remove([file.file_path]);
  } catch (error) {
    // Ignore storage errors to keep API idempotent
    console.warn('Storage cleanup error:', error);
  }
  return NextResponse.json({ ok: true });
}

// PATCH /api/content/files
// Body: { id: string, title?: string, tags?: string[], thumbnail_base64?: string }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, tags, thumbnail_base64, description, rating } = body || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const sb = await getClientFromRequest(req as unknown as Request);

    // Fetch file and session for permission context (RLS handles, but we also need paths)
    const { data: file, error: fileErr } = await sb
      .from('upload_files')
      .select('id, session_id, file_path, thumbnail_path, metadata')
      .eq('id', id)
      .single();
    if (fileErr || !file)
      return NextResponse.json({ error: fileErr?.message || 'Not found' }, { status: 404 });

    let thumbnail_path = file.thumbnail_path as string | null;

    // If provided a thumbnail image in base64, upload it
    if (thumbnail_base64 && supabaseAdmin) {
      const bucket = process.env.NEXT_PUBLIC_UPLOADS_BUCKET as string;
      const base64Data = thumbnail_base64.split(',').pop();
      if (base64Data) {
        const buffer = Buffer.from(base64Data, 'base64');
        const thumbPath = `${file.file_path}.thumb.jpg`;
        await supabaseAdmin.storage
          .from(bucket)
          .upload(thumbPath, buffer, { contentType: 'image/jpeg', upsert: true });
        thumbnail_path = thumbPath;
      }
    }

    // Merge metadata
    const newMeta = {
      ...(file.metadata || {}),
      ...(title ? { title } : {}),
      ...(Array.isArray(tags) ? { tags } : {}),
      ...(typeof description === 'string' ? { description } : {}),
      ...(typeof rating === 'number' && rating >= 0 && rating <= 5 ? { rating } : {}),
    };

    const { error: updErr } = await sb
      .from('upload_files')
      .update({ thumbnail_path, metadata: newMeta })
      .eq('id', id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/content/files
// Body: { session_id, filename, file_path, file_size, file_type, mime_type, thumbnail_path?, metadata? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      session_id,
      filename,
      file_path,
      file_size,
      file_type,
      mime_type,
      thumbnail_path,
      metadata,
    } = body || {};

    if (!session_id || !filename || !file_path || !file_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sb = await getClientFromRequest(req as unknown as Request);

    // Verify the session belongs to the current user (RLS-aware)
    const { data: sessionRow, error: sessErr } = await sb
      .from('upload_sessions')
      .select('id, user_id')
      .eq('id', session_id)
      .single();

    if (sessErr || !sessionRow) {
      return NextResponse.json({ error: 'Session not found or not accessible' }, { status: 403 });
    }

    // Insert minimal required columns first
    const baseInsert: any = {
      session_id,
      filename,
      file_path,
      file_size: typeof file_size === 'number' ? file_size : null,
      file_type,
      mime_type: typeof mime_type === 'string' ? mime_type : null,
    };

    // Prefer admin client, fallback to user-scoped client
    const client = supabaseAdmin ?? sb;

    const { data: inserted, error: insErr } = await client
      .from('upload_files')
      .insert(baseInsert)
      .select('id')
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // Optional columns update if present
    if (inserted?.id && (thumbnail_path || metadata)) {
      const optionalUpdate: any = {};
      if (thumbnail_path) optionalUpdate.thumbnail_path = thumbnail_path;
      if (metadata) optionalUpdate.metadata = metadata;
      if (Object.keys(optionalUpdate).length > 0) {
        const { error: updErr } = await client
          .from('upload_files')
          .update(optionalUpdate)
          .eq('id', inserted.id);
        if (updErr) {
          return NextResponse.json({ id: inserted.id, warning: updErr.message }, { status: 201 });
        }
      }
    }

    return NextResponse.json({ id: inserted?.id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
