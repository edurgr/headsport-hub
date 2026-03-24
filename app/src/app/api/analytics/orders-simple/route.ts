import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/admin-auth-secure';

export async function GET(req: Request) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const url = new URL(req.url);
    const groupBy = url.searchParams.get('group_by') || 'global';

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection required for analytics' },
        { status: 500 },
      );
    }

    console.log('Analytics Orders API called with groupBy:', groupBy);

    if (groupBy === 'athlete') {
      // Get order stats per athlete
      const { data: athletes, error: athletesError } = await supabaseAdmin
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'athlete')
        .order('name');

      if (athletesError) {
        return NextResponse.json({ error: 'Failed to fetch athletes' }, { status: 500 });
      }

      const athleteStats = await Promise.all(
        (athletes || []).map(async (athlete) => {
          // Get orders for this athlete
          const { data: orders } = await supabaseAdmin!
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
            const { data: orderItems } = await supabaseAdmin!
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
      const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('product_name, product_category, product_sku, quantity')
        .order('product_name');

      if (itemsError) {
        return NextResponse.json({ error: 'Failed to fetch order items' }, { status: 500 });
      }

      // Group by product and sum quantities
      const productStats: Record<
        string,
        { name: string; category: string; sku: string; total_quantity: number; order_count: number }
      > = {};

      (orderItems || []).forEach((item) => {
        const key = item.product_sku || item.product_name;
        if (!productStats[key]) {
          productStats[key] = {
            name: item.product_name || 'Unknown',
            category: item.product_category || 'Unknown',
            sku: item.product_sku || 'Unknown',
            total_quantity: 0,
            order_count: 0,
          };
        }
        productStats[key].total_quantity += item.quantity || 0;
        productStats[key].order_count += 1;
      });

      const sortedProducts = Object.values(productStats)
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 10); // Top 10 products

      return NextResponse.json({
        success: true,
        data: sortedProducts,
        type: 'products_breakdown',
      });
    } else {
      // Get global order stats
      const { data: orders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('id, status, created_at');

      if (ordersError) {
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
      }

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter((o) => o.status === 'pending_approval').length || 0;
      const approvedOrders = orders?.filter((o) => o.status === 'approved').length || 0;
      const rejectedOrders = orders?.filter((o) => o.status === 'rejected').length || 0;

      // Get total items ordered
      const orderIds = (orders || []).map((o) => o.id);
      let totalItems = 0;
      if (orderIds.length > 0) {
        const { data: orderItems } = await supabaseAdmin
          .from('order_items')
          .select('quantity')
          .in('order_id', orderIds);
        totalItems = (orderItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
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
        type: 'global_summary',
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
