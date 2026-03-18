import { NextResponse } from 'next/server';

function setCookie(res: NextResponse, name: string, value: string, maxAgeSeconds: number) {
  res.cookies.set(name, value, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAgeSeconds,
  });
}

function clearCookie(res: NextResponse, name: string) {
  res.cookies.set(name, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const refreshToken = request.headers.get('X-Refresh-Token') || '';

    const res = NextResponse.json({ ok: true });

    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const accessToken = authHeader.slice(7).trim();
      const refresh = (refreshToken || '').trim();

      // 1 hour for access, 2 weeks for refresh array cookie
      const accessTtl = 60 * 60; // 1h
      const arrayTtl = 60 * 60 * 24 * 14; // 14d

      // Set tokens in cookies understood by middleware and server helpers
      setCookie(res, 'sb-access-token', accessToken, accessTtl);
      setCookie(res, 'sb:token', accessToken, accessTtl);

      if (accessToken || refresh) {
        const arr = encodeURIComponent(JSON.stringify([accessToken, refresh]));
        setCookie(res, 'supabase-auth-token', arr, arrayTtl);
      }

      return res;
    }

    // No tokens provided → clear cookies (sign-out)
    clearCookie(res, 'sb-access-token');
    clearCookie(res, 'sb:token');
    clearCookie(res, 'supabase-auth-token');
    return res;
  } catch (_e) {
    const errorMessage = _e instanceof Error ? _e.message : 'An unknown error occurred';
    console.error('Error in POST /api/auth/sync:', errorMessage);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
