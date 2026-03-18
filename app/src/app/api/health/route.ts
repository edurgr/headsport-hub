import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NODE_ENV: process.env.NODE_ENV,
    };

    const allRequired = envCheck.NEXT_PUBLIC_SUPABASE_URL && envCheck.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    return NextResponse.json({
      status: allRequired ? 'healthy' : 'unhealthy',
      environment: process.env.NODE_ENV,
      envCheck,
      timestamp: new Date().toISOString(),
    }, {
      status: allRequired ? 200 : 500
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
