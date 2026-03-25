import { NextRequest, NextResponse } from 'next/server';

import { verifyAdminAccess } from '@/lib/admin-auth-secure';
import { supabaseServer } from '@/lib/supabase-server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAccess(req);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;
  const body = await req.json();
  const sb = await supabaseServer();

  const { data, error } = await sb
    .from('products')
    .update({
      name: body.name,
      sku: body.sku,
      vertical_number: body.vertical_number,
      category: body.category,
      brand: body.brand,
      price: body.price,
      notes: body.notes,
      is_active: body.is_active,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
