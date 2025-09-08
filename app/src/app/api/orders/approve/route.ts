import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { emailService } from '@/lib/email-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, action, managerNotes, approverEmail: fromClient } = body as { orderId: string; action: 'approve' | 'reject'; managerNotes?: string; approverEmail?: string };

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
    if (!approverProfile || !['manager','admin'].includes(approverProfile.role)) {
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
        updated_at: new Date().toISOString() 
      })
      .eq('id', orderId)
      .select('*, order_items(*)')
      .single();

    if (error || !updated) return NextResponse.json({ error: 'Failed to update order: ' + (error?.message || '') }, { status: 500 });

    // Optional email sending is controlled by env toggle
    if (process.env.NEXT_PUBLIC_ORDER_EMAILS_ENABLED === 'true') {
      const subject = `Order ${action === 'approve' ? 'Approved' : 'Rejected'} — ${updated.athlete_email}`;
      const itemsHtml = (updated.order_items || []).map((it: any) => {
        const parts: string[] = [];
        parts.push(`${it.quantity}x ${it.product_name}`);
        if (it.product_sku) parts.push(`SKU: ${it.product_sku}`);
        if (it.length_cm) parts.push(`Length: ${it.length_cm}cm`);
        if (it.boot_size) parts.push(`Boot Size: ${it.boot_size}`);
        if (it.binding_color) parts.push(`Color: ${it.binding_color}`);
        return `<li>${parts.join(' — ')}</li>`;
      }).join('');

      const html = `
        <h2>Order ${action === 'approve' ? 'Approved' : 'Rejected'}</h2>
        <p>Athlete: ${updated.athlete_name || updated.athlete_email}</p>
        <p>Status: ${updated.status}</p>
        <h3>Items</h3>
        <ul>${itemsHtml}</ul>
        ${managerNotes ? `<p><strong>Manager Notes:</strong> ${managerNotes}</p>` : ''}
      `;

      // Send ONLY to the approving manager (from auth cookie)
      const sbUser = await supabaseServer();
      const { data: userData } = await sbUser.auth.getUser();
      const approverEmail = userData?.user?.email || null;

      const envRecipients = (process.env.NEXT_PUBLIC_ORDER_NOTIFICATION_EMAILS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      // Primary: approver email; Fallback: env recipients (if approver email not available)
      const recipients = approverEmail ? [approverEmail] : envRecipients;
      for (const to of recipients) {
        await emailService.sendEmail({ to, subject, html });
      }
    }

    return NextResponse.json({ success: true, order: updated });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
