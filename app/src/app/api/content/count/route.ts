import { NextResponse } from 'next/server';
import { decodeBase64ToUtf8 } from '@/lib/edge-compat';

import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin as supabaseAdminClient } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const filterUserId = url.searchParams.get('user_id') || undefined;
    const group = (url.searchParams.get('group') || '').toLowerCase();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    const supabaseAdmin =
      supabaseAdminClient ?? (serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null);
    let sb = await supabaseServer();

    // Resolve current user id and role
    let currentUserId: string | null = null;
    let role: 'athlete' | 'manager' | 'admin' = 'athlete';

    const { data: authData } = await sb.auth.getUser();
    if (authData?.user) {
      currentUserId = authData.user.id;
      const { data: prof } = await sb
        .from('profiles')
        .select('role')
        .eq('id', currentUserId)
        .single();
      role = (prof?.role as any) || 'athlete';
    } else {
      const authHeader =
        (req as any).headers?.get?.('authorization') ||
        (req as any).headers?.get?.('Authorization');
      if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const payloadB64 = token.split('.')[1];
          const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
          const payloadJson = decodeBase64ToUtf8(base64);
          const payload = JSON.parse(payloadJson);
          currentUserId = payload.sub || payload.user_id || null;
          sb = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          }) as any;
          const source = supabaseAdmin ?? sb;
          if (currentUserId) {
            const { data: prof } = await source
              .from('profiles')
              .select('role')
              .eq('id', currentUserId)
              .single();
            role = (prof?.role as any) || 'athlete';
          }
        } catch {}
      }
    }

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const source = supabaseAdmin ?? sb;

    if (role === 'manager' || role === 'admin') {
      if (filterUserId) {
        const { data: sessions, error: sessErr } = await source
          .from('upload_sessions')
          .select('id')
          .eq('user_id', filterUserId);
        if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 });
        const ids = (sessions || []).map((s: any) => s.id);
        if (ids.length === 0)
          return NextResponse.json({
            total: 0,
            byType: group === 'type' ? { image: 0, video: 0 } : undefined,
          });
        if (group === 'type') {
          const { count: totalCount, error: totalErr } = await source
            .from('upload_files')
            .select('*', { count: 'exact', head: true })
            .in('session_id', ids);
          if (totalErr) return NextResponse.json({ error: totalErr.message }, { status: 500 });
          const { count: imageCount } = await source
            .from('upload_files')
            .select('*', { count: 'exact', head: true })
            .in('session_id', ids)
            .eq('file_type', 'image');
          const { count: videoCount } = await source
            .from('upload_files')
            .select('*', { count: 'exact', head: true })
            .in('session_id', ids)
            .eq('file_type', 'video');
          return NextResponse.json({
            total: totalCount || 0,
            byType: { image: imageCount || 0, video: videoCount || 0 },
          });
        }
        const { count, error } = await source
          .from('upload_files')
          .select('*', { count: 'exact', head: true })
          .in('session_id', ids);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ total: count || 0 });
      }
      if (group === 'type') {
        const { count: totalCount, error: totalErr } = await source
          .from('upload_files')
          .select('*', { count: 'exact', head: true });
        if (totalErr) return NextResponse.json({ error: totalErr.message }, { status: 500 });
        const { count: imageCount } = await source
          .from('upload_files')
          .select('*', { count: 'exact', head: true })
          .eq('file_type', 'image');
        const { count: videoCount } = await source
          .from('upload_files')
          .select('*', { count: 'exact', head: true })
          .eq('file_type', 'video');
        return NextResponse.json({
          total: totalCount || 0,
          byType: { image: imageCount || 0, video: videoCount || 0 },
        });
      }
      const { count, error } = await source
        .from('upload_files')
        .select('*', { count: 'exact', head: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ total: count || 0 });
    }

    // Athlete: count own files via their sessions
    const { data: mySessions, error: sessErr } = await source
      .from('upload_sessions')
      .select('id')
      .eq('user_id', currentUserId);
    if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 });
    const ids = (mySessions || []).map((s: any) => s.id);
    if (ids.length === 0)
      return NextResponse.json({
        total: 0,
        byType: group === 'type' ? { image: 0, video: 0 } : undefined,
      });

    if (group === 'type') {
      const { count: totalCount, error: totalErr } = await source
        .from('upload_files')
        .select('*', { count: 'exact', head: true })
        .in('session_id', ids);
      if (totalErr) return NextResponse.json({ error: totalErr.message }, { status: 500 });
      const { count: imageCount } = await source
        .from('upload_files')
        .select('*', { count: 'exact', head: true })
        .in('session_id', ids)
        .eq('file_type', 'image');
      const { count: videoCount } = await source
        .from('upload_files')
        .select('*', { count: 'exact', head: true })
        .in('session_id', ids)
        .eq('file_type', 'video');
      return NextResponse.json({
        total: totalCount || 0,
        byType: { image: imageCount || 0, video: videoCount || 0 },
      });
    }

    const { count, error } = await source
      .from('upload_files')
      .select('*', { count: 'exact', head: true })
      .in('session_id', ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ total: count || 0 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'edge';
