import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const athleteId = url.searchParams.get('athlete_id');

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin access required for analytics' }, { status: 500 });
    }

    console.log('Athlete Stats API called with athleteId:', athleteId);

    // For demo purposes, we'll get stats for the first athlete if no specific athlete is requested
    let targetAthleteId = athleteId;

    if (!targetAthleteId) {
      const { data: firstAthlete } = await supabaseAdmin
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

    // Get athlete profile
    const { data: athleteProfile, error: athleteError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', targetAthleteId)
      .single();

    if (athleteError || !athleteProfile) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    // Get content stats for this athlete
    const { data: sessions } = await supabaseAdmin
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
        supabaseAdmin
          .from('upload_files')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds),
        supabaseAdmin
          .from('upload_files')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
          .eq('file_type', 'image'),
        supabaseAdmin
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
    const { data: orders } = await supabaseAdmin
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
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select('quantity')
        .in('order_id', orderIds);
      orderStats.total_items = (orderItems || []).reduce(
        (sum, item) => sum + (item.quantity || 0),
        0,
      );
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Athlete stats error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
