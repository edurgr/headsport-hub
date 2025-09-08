import { NextRequest, NextResponse } from 'next/server';

import { sendInvitationEmail } from '@/lib/email';
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

  // Send invitation email using the new email system
  const emailSent = await sendInvitationEmail(email, rolePreset, url, message);

  if (!emailSent) {
    // If email fails, we should probably delete the invite or mark it as failed
    console.warn('Failed to send invitation email for:', email);
    // For now, we'll continue but log the warning
  }

  return NextResponse.json({
    ok: true,
    message: 'Invitation created successfully',
    emailSent,
  });
}
