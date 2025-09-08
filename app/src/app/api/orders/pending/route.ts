import { NextResponse } from 'next/server';

import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    const sb = await supabaseServer();

    // Get all orders with pending_approval status
    const { data: orders, error: ordersError } = await sb
      .from('orders')
      .select(`*, order_items (*)`)
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false });

    if (ordersError) {
      return NextResponse.json(
        { error: 'Failed to fetch orders: ' + ordersError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
      total: orders?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
