import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabaseAdminClient = getSupabaseAdmin();

    if (!supabaseAdminClient) {
      return NextResponse.json(
        { error: 'Database connection required for analytics' },
        { status: 500 },
      );
    }

    // Get all athletes
    const { data: athletes, error: athletesError } = await supabaseAdminClient
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'athlete');

    if (athletesError) {
      return NextResponse.json({ error: 'Error fetching athletes' }, { status: 500 });
    }

    if (!athletes || athletes.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        type: 'athlete_products',
      });
    }

    // Get products for each athlete from approved orders
    const athleteProductsData = await Promise.all(
      athletes.map(async (athlete) => {
        // Get approved orders for this athlete
        const { data: orders } = await supabaseAdminClient
          .from('orders')
          .select('id')
          .eq('athlete_email', athlete.email)
          .eq('status', 'approved');

        if (!orders || orders.length === 0) {
          return {
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            athlete_email: athlete.email,
            products: [],
            total_products: 0,
            total_quantity: 0,
          };
        }

        const orderIds = orders.map((o) => o.id);

        // Get order items for approved orders
        const { data: orderItems } = await supabaseAdminClient
          .from('order_items')
          .select(
            `
            quantity,
            product_name,
            product_category,
            product_sku
          `,
          )
          .in('order_id', orderIds);

        if (!orderItems || orderItems.length === 0) {
          return {
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            athlete_email: athlete.email,
            products: [],
            total_products: 0,
            total_quantity: 0,
          };
        }

        // Group products by name and sum quantities
        const productMap = new Map();
        orderItems.forEach((item) => {
          const key = `${item.product_name}-${item.product_sku}`;
          if (productMap.has(key)) {
            productMap.get(key).quantity += item.quantity || 0;
          } else {
            productMap.set(key, {
              name: item.product_name,
              category: item.product_category,
              sku: item.product_sku,
              quantity: item.quantity || 0,
            });
          }
        });

        const products = Array.from(productMap.values());
        const totalQuantity = products.reduce((sum, product) => sum + product.quantity, 0);

        return {
          athlete_id: athlete.id,
          athlete_name: athlete.name,
          athlete_email: athlete.email,
          products: products,
          total_products: products.length,
          total_quantity: totalQuantity,
        };
      }),
    );

    // Filter out athletes with no products
    const athletesWithProducts = athleteProductsData.filter(
      (athlete) => athlete.total_products > 0,
    );

    return NextResponse.json({
      success: true,
      data: athletesWithProducts,
      type: 'athlete_products',
    });
  } catch (error) {
    console.error('Athlete products error:', error);
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
