import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      orderId,
      action,
      managerNotes,
      approverEmail: fromClient,
    } = body as {
      orderId: string;
      action: 'approve' | 'reject';
      managerNotes?: string;
      approverEmail?: string;
    };

    if (!orderId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const sb = supabaseAdmin || (await supabaseServer());

    // Authorization: only manager/admin can approve/reject
    const sbUserCtx = await supabaseServer();
    const { data: authUser } = await sbUserCtx.auth.getUser();
    const approverEmail = authUser?.user?.email || fromClient || null;
    if (!approverEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: approverProfile } = await (supabaseAdmin || (await supabaseServer()))
      .from('profiles')
      .select('email, role')
      .eq('email', approverEmail)
      .single();
    if (!approverProfile || !['manager', 'admin'].includes(approverProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update order status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const { data: updated, error } = await sb
      .from('orders')
      .update({
        status: newStatus,
        notes: managerNotes || null,
        approved_by_email: approverEmail,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('*, order_items(*)')
      .single();

    if (error || !updated)
      return NextResponse.json(
        { error: 'Failed to update order: ' + (error?.message || '') },
        { status: 500 },
      );

    // Optional emails disabled. Log summary instead.
    if (process.env.NEXT_PUBLIC_ORDER_EMAILS_ENABLED === 'true') {
      console.log('Order notification (email disabled):', {
        orderId,
        action,
        approverEmail,
        managerNotes: managerNotes || null,
      });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
