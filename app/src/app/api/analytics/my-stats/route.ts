import { NextResponse } from 'next/server';
import { decodeBase64ToUtf8 } from '@/lib/edge-compat';

import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const athleteId = url.searchParams.get('athlete_id');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    const supabaseAdminClient =
      supabaseAdmin ?? (serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null);

    if (!supabaseAdminClient) {
      return NextResponse.json({ error: 'Admin access required for analytics' }, { status: 500 });
    }

    let targetAthleteId = athleteId;
    let currentUserId: string | null = null;

    // Try to get user from session first
    try {
      const sb = await supabaseServer();
      const { data: authData } = await sb.auth.getUser();
      if (authData?.user) {
        currentUserId = authData.user.id;
        targetAthleteId = targetAthleteId || currentUserId;
      }
    } catch (error) {
      console.log('Could not get user from session, trying header auth');
    }

    // Fallback to Authorization header
    if (!currentUserId) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const payloadB64 = token.split('.')[1];
          const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
          const payloadJson = decodeBase64ToUtf8(base64);
          const payload = JSON.parse(payloadJson);
          currentUserId = payload.sub || payload.user_id || null;
          targetAthleteId = targetAthleteId || currentUserId;
        } catch (error) {
          console.log('Could not decode token');
        }
      }
    }

    // If still no athlete ID, try to get from query params or use first athlete for demo
    if (!targetAthleteId) {
      const { data: firstAthlete } = await supabaseAdminClient
        .from('profiles')
        .select('id')
        .eq('role', 'athlete')
        .limit(1)
        .single();

      if (firstAthlete) {
        targetAthleteId = firstAthlete.id;
      }
    }

    if (!targetAthleteId) {
      return NextResponse.json({ error: 'No athlete found' }, { status: 404 });
    }

    console.log('My Stats API called for athlete:', targetAthleteId);

    // Get athlete profile
    const { data: athleteProfile, error: athleteError } = await supabaseAdminClient
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', targetAthleteId)
      .single();

    if (athleteError || !athleteProfile) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    // Get content stats for this athlete
    const { data: sessions } = await supabaseAdminClient
      .from('upload_sessions')
      .select('id')
      .eq('user_id', targetAthleteId);

    const sessionIds = (sessions || []).map((s) => s.id);

    let contentStats = {
      total_content: 0,
      photos: 0,
      videos: 0,
    };

    if (sessionIds.length > 0) {
      const [totalResult, photosResult, videosResult] = await Promise.all([
        supabaseAdminClient
          .from('upload_files')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds),
        supabaseAdminClient
          .from('upload_files')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
          .eq('file_type', 'image'),
        supabaseAdminClient
          .from('upload_files')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
          .eq('file_type', 'video'),
      ]);

      contentStats = {
        total_content: totalResult.count || 0,
        photos: photosResult.count || 0,
        videos: videosResult.count || 0,
      };
    }

    // Get order stats for this athlete
    const { data: orders } = await supabaseAdminClient
      .from('orders')
      .select('id, status, created_at')
      .eq('athlete_email', athleteProfile.email);

    const orderStats = {
      total_orders: orders?.length || 0,
      pending_orders: orders?.filter((o) => o.status === 'pending_approval').length || 0,
      approved_orders: orders?.filter((o) => o.status === 'approved').length || 0,
      rejected_orders: orders?.filter((o) => o.status === 'rejected').length || 0,
      total_items: 0,
    };

    // Get total items ordered
    const orderIds = (orders || []).map((o) => o.id);
    if (orderIds.length > 0) {
      const { data: orderItems } = await supabaseAdminClient
        .from('order_items')
        .select('quantity')
        .in('order_id', orderIds);
      orderStats.total_items = (orderItems || []).reduce(
        (sum, item) => sum + (item.quantity || 0),
        0,
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          athlete: {
            id: athleteProfile.id,
            name: athleteProfile.name,
            email: athleteProfile.email,
            role: athleteProfile.role,
          },
          content: contentStats,
          orders: orderStats,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('My stats error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// (edge runtime declared at top)
