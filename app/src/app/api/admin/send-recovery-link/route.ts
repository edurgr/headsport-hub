import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email, inviteToken } = await request.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      // Helpful diagnostics in development
      const details = {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!serviceKey,
      };
      if (process.env.NODE_ENV !== 'production') {
        console.error('send-recovery-link: missing envs', details);
        return NextResponse.json({ error: 'Server not configured', details }, { status: 500 });
      }
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Build redirect base URL
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || '';
    if (!baseUrl) {
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host') || 'localhost:3000';
      baseUrl = `${protocol}://${host}`;
    }

    const redirectTo = inviteToken
      ? `${baseUrl}/auth/callback?invite_token=${inviteToken}`
      : `${baseUrl}/auth/callback`;

    // Trigger Supabase to send the recovery email directly
    const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('send-recovery-link: supabase resetPasswordForEmail error', {
          message: error.message,
          name: (error as any)?.name,
          redirectTo,
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailed: true });
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 },
    );
  }
}
export const runtime = 'edge';
