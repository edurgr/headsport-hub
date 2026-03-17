export const runtime = 'edge';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const hasResendKey = !!(
      process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY
    );
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || null;
    const fromName = process.env.RESEND_FROM_NAME || null;

    const hasSupabaseUrl = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    );
    const hasSupabaseAnon = !!(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    );
    const hasSupabaseService = !!(
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || null;

    const masked = (val: string | undefined | null) =>
      !val ? null : `${val.slice(0, 4)}…(${val.length})`;
    const envDump = {
      resendKeys: Object.entries(process.env)
        .filter(([k]) => k.toUpperCase().includes('RESEND'))
        .map(([k, v]) => ({ key: k, valuePreview: masked(v) })),
      supabaseKeys: Object.entries(process.env)
        .filter(([k]) => k.toUpperCase().includes('SUPABASE'))
        .map(([k, v]) => ({ key: k, valuePreview: masked(v) })),
    };

    return NextResponse.json({
      ok: true,
      resend: {
        hasApiKey: hasResendKey,
        fromEmail,
        fromName,
      },
      supabase: {
        hasUrl: hasSupabaseUrl,
        hasAnonKey: hasSupabaseAnon,
        hasServiceRoleKey: hasSupabaseService,
      },
      app: {
        baseUrl: appUrl,
        nodeEnv: process.env.NODE_ENV,
      },
      env: envDump,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}


