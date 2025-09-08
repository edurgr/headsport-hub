import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = (url.searchParams.get('action') || 'queue').toLowerCase();

    const sb = supabaseAdmin || (await supabaseServer());

    if (action === 'queue') {
      // Try to read queue table; if not available or empty, fall back to pending files
      let queueItems: any[] = [];
      try {
        const { data: queue } = await (sb as any)
          .from('content_moderation_queue')
          .select('id, file_id, priority, auto_flagged, flagged_reasons, assigned_to, created_at')
          .order('created_at', { ascending: false })
          .limit(200);
        queueItems = queue || [];
      } catch {
        queueItems = [];
      }

      const filesById: Record<string, any> = {};
      if (queueItems.length > 0) {
        const fileIds = Array.from(new Set(queueItems.map((q) => q.file_id)));
        const { data: files } = await (sb as any)
          .from('upload_files')
          .select('id, filename, file_type, file_size, created_at, upload_sessions(id, profiles(name,email))')
          .in('id', fileIds);
        for (const f of files || []) filesById[f.id] = f;
      }

      // If queue is empty, build items from pending files as fallback
      if (queueItems.length === 0) {
        const { data: pendingFiles } = await (sb as any)
          .from('upload_files')
          .select('id, filename, file_type, file_size, created_at, upload_sessions(id, profiles(name,email))')
          .eq('moderation_status', 'pending')
          .order('created_at', { ascending: false })
          .limit(100);
        queueItems = (pendingFiles || []).map((f: any) => ({
          id: f.id,
          file_id: f.id,
          priority: 1,
          auto_flagged: false,
          flagged_reasons: [],
          created_at: f.created_at,
        }));
        for (const f of pendingFiles || []) filesById[f.id] = f;
      }

      const items = queueItems.map((q: any) => ({
        id: q.id,
        file_id: q.file_id,
        priority: q.priority || 1,
        auto_flagged: !!q.auto_flagged,
        flagged_reasons: q.flagged_reasons || [],
        assigned_to: q.assigned_to || null,
        created_at: q.created_at,
        file: filesById[q.file_id] || null,
      }));

      return NextResponse.json({ items });
    }

    if (action === 'stats') {
      const sbClient = sb as any;
      const [totalRes, pendingRes, approvedRes, rejectedRes, flaggedRes] = await Promise.all([
        sbClient.from('upload_files').select('*', { count: 'exact', head: true }),
        sbClient.from('upload_files').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
        sbClient.from('upload_files').select('*', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
        sbClient.from('upload_files').select('*', { count: 'exact', head: true }).eq('moderation_status', 'rejected'),
        sbClient.from('upload_files').select('*', { count: 'exact', head: true }).eq('moderation_status', 'flagged'),
      ]);

      let queueSize = 0;
      try {
        const { count } = await sbClient
          .from('content_moderation_queue')
          .select('*', { count: 'exact', head: true });
        queueSize = count || 0;
      } catch {
        queueSize = 0;
      }

      return NextResponse.json({
        total_files: totalRes.count || 0,
        pending_files: pendingRes.count || 0,
        approved_files: approvedRes.count || 0,
        rejected_files: rejectedRes.count || 0,
        flagged_files: flaggedRes.count || 0,
        queue_size: queueSize,
        avg_moderation_time_minutes: 0,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '').toLowerCase();
    const sb = supabaseAdmin || (await supabaseServer());

    const mapActionToStatus = (a: string) => {
      switch (a) {
        case 'approve': return 'approved';
        case 'reject': return 'rejected';
        case 'flag': return 'flagged';
        case 'unflag': return 'pending';
        default: return null;
      }
    };

    if (action === 'moderate') {
      const fileId = body.file_id as string;
      const moderationAction = String(body.moderation_action || '').toLowerCase();
      const reason = body.reason as string | undefined;
      const notes = body.notes as string | undefined;
      const status = mapActionToStatus(moderationAction);
      if (!fileId || !status) {
        return NextResponse.json({ error: 'Missing file_id or invalid action' }, { status: 400 });
      }

      const { error: updErr } = await (sb as any)
        .from('upload_files')
        .update({
          moderation_status: status,
          moderation_reason: reason || null,
          moderation_notes: notes || null,
          moderated_at: new Date().toISOString(),
        })
        .eq('id', fileId);
      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
      try {
        await (sb as any).from('content_moderation_queue').delete().eq('file_id', fileId);
      } catch {}
      return NextResponse.json({ success: true });
    }

    if (action === 'bulk_moderate') {
      const fileIds = (body.file_ids as string[]) || [];
      const moderationAction = String(body.moderation_action || '').toLowerCase();
      const reason = body.reason as string | undefined;
      const notes = body.notes as string | undefined;
      const status = mapActionToStatus(moderationAction);
      if (!fileIds.length || !status) {
        return NextResponse.json({ error: 'Missing file_ids or invalid action' }, { status: 400 });
      }

      const { error: updErr } = await (sb as any)
        .from('upload_files')
        .update({
          moderation_status: status,
          moderation_reason: reason || null,
          moderation_notes: notes || null,
          moderated_at: new Date().toISOString(),
        })
        .in('id', fileIds);
      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
      try {
        await (sb as any).from('content_moderation_queue').delete().in('file_id', fileIds);
      } catch {}
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}


