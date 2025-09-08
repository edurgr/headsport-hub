import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const { email, inviteToken } = await request.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

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

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo }
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send email with recovery link
    const actionLink: string | null = (data as any)?.properties?.action_link || null;
    if (!actionLink) {
      return NextResponse.json({ error: 'Could not generate recovery link' }, { status: 500 });
    }

    const sent = await emailService.sendEmail({
      to: email,
      subject: 'Reset your password',
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.6;">
          <h2>Password reset request</h2>
          <p>We received a request to reset the password for your account.</p>
          <p>
            <a href="${actionLink}"
               style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
              Reset password
            </a>
          </p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `.trim(),
    });

    if (!sent) {
      // Si el servicio de correo no está configurado, no exponemos el enlace en producción
      const isDev = process.env.NODE_ENV !== 'production';
      return NextResponse.json({ success: true, emailed: false, ...(isDev ? { action_link: actionLink } : {}) });
    }

    return NextResponse.json({ success: true, emailed: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' }, { status: 500 });
  }
}


