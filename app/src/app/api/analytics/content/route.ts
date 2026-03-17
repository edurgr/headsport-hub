import { NextResponse } from 'next/server';
import { decodeBase64ToUtf8 } from '@/lib/edge-compat';

import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin as supabaseAdminClient } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    // const athleteId = url.searchParams.get('athlete_id');
    const groupBy = url.searchParams.get('group_by') || 'global'; // 'global' | 'athlete'

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
        } catch { /* ignore JWT parse errors */ }
      }
    }

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const source = supabaseAdmin ?? sb;

    if (groupBy === 'athlete') {
      // Get content stats per athlete
      const { data: athletes, error: athletesError } = await source
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'athlete')
        .order('name');

      if (athletesError) {
        return NextResponse.json({ error: 'Failed to fetch athletes' }, { status: 500 });
      }

      const athleteStats = await Promise.all(
        (athletes || []).map(async (athlete: any) => {
          // Get sessions for this athlete
          const { data: sessions } = await source
            .from('upload_sessions')
            .select('id')
            .eq('user_id', athlete.id);

          const sessionIds = (sessions || []).map((s: any) => s.id);

          if (sessionIds.length === 0) {
            return {
              athlete_id: athlete.id,
              athlete_name: athlete.name,
              athlete_email: athlete.email,
              total_content: 0,
              photos: 0,
              videos: 0,
            };
          }

          // Get file counts by type
          const [totalResult, photosResult, videosResult] = await Promise.all([
            source
              .from('upload_files')
              .select('*', { count: 'exact', head: true })
              .in('session_id', sessionIds),
            source
              .from('upload_files')
              .select('*', { count: 'exact', head: true })
              .in('session_id', sessionIds)
              .eq('file_type', 'image'),
            source
              .from('upload_files')
              .select('*', { count: 'exact', head: true })
              .in('session_id', sessionIds)
              .eq('file_type', 'video'),
          ]);

          return {
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            athlete_email: athlete.email,
            total_content: totalResult.count || 0,
            photos: photosResult.count || 0,
            videos: videosResult.count || 0,
          };
        }),
      );

      return NextResponse.json({
        success: true,
        data: athleteStats,
        type: 'athlete_breakdown',
      });
    } else {
      // Get global content stats
      const [totalResult, photosResult, videosResult] = await Promise.all([
        source.from('upload_files').select('*', { count: 'exact', head: true }),
        source
          .from('upload_files')
          .select('*', { count: 'exact', head: true })
          .eq('file_type', 'image'),
        source
          .from('upload_files')
          .select('*', { count: 'exact', head: true })
          .eq('file_type', 'video'),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          total_content: totalResult.count || 0,
          photos: photosResult.count || 0,
          videos: videosResult.count || 0,
        },
        type: 'global',
      });
    }
  } catch (error) {
    console.error('Analytics content error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export const runtime = 'edge';
