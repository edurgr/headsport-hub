import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendResendInvitationEmail } from '@/lib/resend-email';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') || 50);
  const offset = Number(url.searchParams.get('offset') || 0);

  const sb = await supabaseServer();
  const { data: invites, error } = await sb
    .from('invites')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invites: invites || [] });
}

export async function POST(req: NextRequest) {
  const {
    email,
    rolePreset = 'athlete',
    message,
    expiresInDays = Number(process.env.INVITE_TOKEN_TTL_DAYS || 7),
  } = await req.json();

  const sb = await supabaseServer();
  const token = crypto.randomUUID();
  const expires_at = new Date(Date.now() + expiresInDays * 24 * 3600 * 1000).toISOString();

  const { error } = await sb
    .from('invites')
    .insert({ email, role_preset: rolePreset, token, expires_at, used: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build app base URL robustly
  let appBase = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  if (!appBase) {
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host') || 'localhost:3000';
    appBase = `${protocol}://${host}`;
  }
  const url = `${appBase}/accept-invite?token=${token}`;

  // Generate Supabase invite action link and send via Resend
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: url },
  });
  const actionLink: string | null = (linkData as any)?.properties?.action_link || null;
  if (linkError || !actionLink) {
    return NextResponse.json(
      { ok: false, message: linkError?.message || 'Could not generate invite link', emailSent: false },
      { status: 500 },
    );
  }

  const hasResendKey = !!(process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY);
  if (hasResendKey) {
    const resend = await sendResendInvitationEmail({ to: email, inviteUrl: actionLink, role: rolePreset, personalMessage: message });
    return NextResponse.json({
      ok: true,
      message: resend.sent ? 'Invitation email sent via Resend' : 'Invitation created (email not sent)',
      emailSent: resend.sent,
      actionLink,
      ...(resend.error ? { providerNote: resend.error } : {}),
    });
  }

  try {
    const adminMailer = await getSupabaseAdmin();
    const { error: inviteErr } = await adminMailer!.auth.admin.inviteUserByEmail(email, { redirectTo: url } as any);
    const sent = !inviteErr;
    return NextResponse.json({ ok: true, message: sent ? 'Invitation email sent via Supabase' : 'Invitation created', emailSent: sent, actionLink, ...(inviteErr ? { supabaseError: inviteErr.message || String(inviteErr) } : {}) });
  } catch (e) {
    return NextResponse.json({ ok: true, message: 'Invitation created (manual share)', emailSent: false, actionLink, providerNote: e instanceof Error ? e.message : 'Supabase mailer failed' });
  }
}
