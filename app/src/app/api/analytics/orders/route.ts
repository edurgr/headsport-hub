import { NextResponse } from 'next/server';
import { decodeBase64ToUtf8 } from '@/lib/edge-compat';

import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin as supabaseAdminClient } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    // const athleteId = url.searchParams.get('athlete_id');
    const groupBy = url.searchParams.get('group_by') || 'global'; // 'global' | 'athlete' | 'products'

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

    if (!['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const source = supabaseAdmin ?? sb;

    if (groupBy === 'athlete') {
      // Get order stats per athlete
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
          // Get orders for this athlete
          const { data: orders } = await source
            .from('orders')
            .select('id, status, created_at')
            .eq('athlete_email', athlete.email);

          const totalOrders = orders?.length || 0;
          const pendingOrders =
            orders?.filter((o: any) => o.status === 'pending_approval').length || 0;
          const approvedOrders = orders?.filter((o: any) => o.status === 'approved').length || 0;
          const rejectedOrders = orders?.filter((o: any) => o.status === 'rejected').length || 0;

          // Get total items ordered
          const orderIds = (orders || []).map((o: any) => o.id);
          let totalItems = 0;
          if (orderIds.length > 0) {
            const { data: orderItems } = await source
              .from('order_items')
              .select('quantity')
              .in('order_id', orderIds);
            totalItems = (orderItems || []).reduce(
              (sum: number, item: any) => sum + (item.quantity || 0),
              0,
            );
          }

          return {
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            athlete_email: athlete.email,
            total_orders: totalOrders,
            pending_orders: pendingOrders,
            approved_orders: approvedOrders,
            rejected_orders: rejectedOrders,
            total_items: totalItems,
          };
        }),
      );

      return NextResponse.json({
        success: true,
        data: athleteStats,
        type: 'athlete_breakdown',
      });
    } else if (groupBy === 'products') {
      // Get most requested products
      const { data: orderItems, error: itemsError } = await source
        .from('order_items')
        .select('product_name, product_category, product_sku, quantity')
        .order('product_name');

      if (itemsError) {
        return NextResponse.json({ error: 'Failed to fetch order items' }, { status: 500 });
      }

      // Group by product and sum quantities
      const productStats: Record<
        string,
        {
          name: string;
          category: string;
          sku: string;
          total_quantity: number;
          order_count: number;
        }
      > = {};

      (orderItems || []).forEach((item: any) => {
        const key = `${item.product_sku}-${item.product_name}`;
        if (!productStats[key]) {
          productStats[key] = {
            name: item.product_name,
            category: item.product_category,
            sku: item.product_sku,
            total_quantity: 0,
            order_count: 0,
          };
        }
        productStats[key].total_quantity += item.quantity || 0;
        productStats[key].order_count += 1;
      });

      const sortedProducts = Object.values(productStats)
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 20); // Top 20 most requested products

      return NextResponse.json({
        success: true,
        data: sortedProducts,
        type: 'products_breakdown',
      });
    } else {
      // Get global order stats
      const { data: orders, error: ordersError } = await source
        .from('orders')
        .select('id, status, created_at');

      if (ordersError) {
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
      }

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter((o: any) => o.status === 'pending_approval').length || 0;
      const approvedOrders = orders?.filter((o: any) => o.status === 'approved').length || 0;
      const rejectedOrders = orders?.filter((o: any) => o.status === 'rejected').length || 0;

      // Get total items ordered
      const orderIds = (orders || []).map((o: any) => o.id);
      let totalItems = 0;
      if (orderIds.length > 0) {
        const { data: orderItems } = await source
          .from('order_items')
          .select('quantity')
          .in('order_id', orderIds);
        totalItems = (orderItems || []).reduce(
          (sum: number, item: any) => sum + (item.quantity || 0),
          0,
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          total_orders: totalOrders,
          pending_orders: pendingOrders,
          approved_orders: approvedOrders,
          rejected_orders: rejectedOrders,
          total_items: totalItems,
        },
        type: 'global',
      });
    }
  } catch (error) {
    console.error('Analytics orders error:', error);
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
