import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin as supabaseAdminClient } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

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

    const supabaseAdmin = supabaseAdminClient ?? (serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null);
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
      const authHeader = (req as any).headers?.get?.('authorization') || (req as any).headers?.get?.('Authorization');
      if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const payloadB64 = token.split('.')[1];
          const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
          const payloadJson = Buffer.from(base64, 'base64').toString('utf8');
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

    // If athlete_id is provided, check if user can access that athlete's data
    const targetAthleteId = athleteId || currentUserId;
    if (targetAthleteId !== currentUserId && !['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const source = supabaseAdmin ?? sb;

    // Get athlete profile
    const { data: athleteProfile, error: athleteError } = await source
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', targetAthleteId)
      .single();

    if (athleteError || !athleteProfile) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    // Get content stats for this athlete
    const { data: sessions } = await source
      .from('upload_sessions')
      .select('id')
      .eq('user_id', targetAthleteId);

    const sessionIds = (sessions || []).map((s: any) => s.id);

    let contentStats = {
      total_content: 0,
      photos: 0,
      videos: 0
    };

    if (sessionIds.length > 0) {
      const [totalResult, photosResult, videosResult] = await Promise.all([
        source.from('upload_files').select('*', { count: 'exact', head: true }).in('session_id', sessionIds),
        source.from('upload_files').select('*', { count: 'exact', head: true }).in('session_id', sessionIds).eq('file_type', 'image'),
        source.from('upload_files').select('*', { count: 'exact', head: true }).in('session_id', sessionIds).eq('file_type', 'video')
      ]);

      contentStats = {
        total_content: totalResult.count || 0,
        photos: photosResult.count || 0,
        videos: videosResult.count || 0
      };
    }

    // Get order stats for this athlete
    const { data: orders } = await source
      .from('orders')
      .select('id, status, created_at')
      .eq('athlete_email', athleteProfile.email);

    const orderStats = {
      total_orders: orders?.length || 0,
      pending_orders: orders?.filter((o: any) => o.status === 'pending_approval').length || 0,
      approved_orders: orders?.filter((o: any) => o.status === 'approved').length || 0,
      rejected_orders: orders?.filter((o: any) => o.status === 'rejected').length || 0,
      total_items: 0
    };

    // Get total items ordered
    const orderIds = (orders || []).map((o: any) => o.id);
    if (orderIds.length > 0) {
      const { data: orderItems } = await source
        .from('order_items')
        .select('quantity')
        .in('order_id', orderIds);
      orderStats.total_items = (orderItems || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    }

    return NextResponse.json({
      success: true,
      data: {
        athlete: {
          id: athleteProfile.id,
          name: athleteProfile.name,
          email: athleteProfile.email
        },
        content: contentStats,
        orders: orderStats
      }
    });
  } catch (error) {
    console.error('Athlete stats error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
