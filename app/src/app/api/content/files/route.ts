import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyAdminAccess, verifyManagerOrAdminAccess } from '@/lib/admin-auth-secure';

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

// DELETE /api/content/files
// Query params:
//   - id: string (delete single)
//   - all: 'true' (admin only - delete all)
// Body (JSON, optional for DELETE via fetch): { ids?: string[], all?: boolean }
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const allFlag = searchParams.get('all') === 'true';

  let body: any = null;
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      body = await req.json().catch(() => null);
    }
  } catch {
    body = null;
  }
  const idsFromBody: string[] | undefined = body?.ids;
  const allFromBody: boolean | undefined = body?.all;
  const deleteAll = allFlag || !!allFromBody;

  // Helper to remove storage objects (best-effort)
  async function removeFromStorage(paths: string[]) {
    try {
      if (!supabaseAdmin) return; // silently skip if not configured
      const bucket = process.env.NEXT_PUBLIC_UPLOADS_BUCKET as string;
      if (!bucket || paths.length === 0) return;
      // Supabase recommends batches of up to ~1000; our lists are usually small
      await supabaseAdmin.storage.from(bucket).remove(paths);
    } catch (error) {
      console.warn('Storage cleanup error:', error);
    }
  }

  // Single delete (user can delete their own via RLS; admins/managers also allowed)
  if (id && !deleteAll && !idsFromBody) {
    const sb = await getClientFromRequest(req as unknown as Request);
    // Fetch file record to remove from Storage as well
    const { data: file, error: fetchError } = await sb
      .from('upload_files')
      .select('file_path')
      .eq('id', id)
      .single();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    // Try using user client first (will pass RLS for owner). If forbidden and admin, use admin.
    let deleteError = null as any;
    const { error: deleteDbError } = await sb.from('upload_files').delete().eq('id', id);
    deleteError = deleteDbError;

    if (deleteError && deleteError.code === 'PGRST116') {
      // Not found is fine (idempotent)
      deleteError = null;
    }

    if (deleteError) {
      // Check manager or admin access and retry with admin client
      const elevatedCheck = await verifyManagerOrAdminAccess(req);
      if (!elevatedCheck.success) {
        return NextResponse.json({ error: deleteError.message || 'Forbidden' }, { status: 403 });
      }
      if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
      }
      const { error: adminDelErr } = await supabaseAdmin.from('upload_files').delete().eq('id', id);
      if (adminDelErr) return NextResponse.json({ error: adminDelErr.message }, { status: 500 });
    }

    await removeFromStorage(file?.file_path ? [file.file_path] : []);
    return NextResponse.json({ ok: true });
  }

  // Bulk or delete all
  if (deleteAll || (Array.isArray(idsFromBody) && idsFromBody.length > 0)) {
    // Delete ALL strictly admin-only
    if (deleteAll) {
      const adminCheck = await verifyAdminAccess(req);
      if (!adminCheck.success) {
        return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
      }
      if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
      }
      const { data, error } = await supabaseAdmin.from('upload_files').select('id, file_path');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const filesToDelete = data || [];
      if (filesToDelete.length === 0) return NextResponse.json({ ok: true, deleted: 0 });
      const ids = filesToDelete.map((f) => f.id);
      const paths = filesToDelete.map((f) => f.file_path).filter(Boolean);
      const { error: delErr } = await supabaseAdmin.from('upload_files').delete().in('id', ids);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
      await removeFromStorage(paths);
      return NextResponse.json({ ok: true, deleted: ids.length });
    }

    // Bulk delete by specific ids — allow manager or admin
    const elevatedCheck = await verifyManagerOrAdminAccess(req);
    if (!elevatedCheck.success) {
      return NextResponse.json({ error: elevatedCheck.error }, { status: elevatedCheck.status });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
    }
    const idsList = (idsFromBody || []).filter((id: any) => typeof id === 'string');
    if (idsList.length === 0) return NextResponse.json({ ok: true, deleted: 0 });
    const { data, error } = await supabaseAdmin
      .from('upload_files')
      .select('id, file_path')
      .in('id', idsList);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const filesToDelete = data || [];
    if (filesToDelete.length === 0) return NextResponse.json({ ok: true, deleted: 0 });
    const ids = filesToDelete.map((f) => f.id);
    const paths = filesToDelete.map((f) => f.file_path).filter(Boolean);
    const { error: delErr } = await supabaseAdmin.from('upload_files').delete().in('id', ids);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    await removeFromStorage(paths);
    return NextResponse.json({ ok: true, deleted: ids.length });
  }

  return NextResponse.json({ error: 'Missing id or ids/all in request' }, { status: 400 });
}

// PATCH /api/content/files
// Body: { id: string, title?: string, tags?: string[], thumbnail_path?: string }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, tags, thumbnail_path: new_thumbnail_path, description, rating } = body || {};
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

    // If provided an explicit thumbnail path, use it directly
    if (typeof new_thumbnail_path === 'string' && new_thumbnail_path.trim()) {
      thumbnail_path = new_thumbnail_path.trim();
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
