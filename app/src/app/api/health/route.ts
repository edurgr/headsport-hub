import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: !!serviceKey,
      NODE_ENV: process.env.NODE_ENV,
    };

    const envsOk = !!supabaseUrl && !!supabaseAnonKey;

    // Test actual Supabase connectivity with a lightweight query
    let dbOk = false;
    let dbError: string | null = null;
    if (supabaseUrl && serviceKey) {
      try {
        const admin = createClient(supabaseUrl, serviceKey);
        const { error } = await admin.from('profiles').select('id').limit(1);
        if (error) {
          dbError = error.message;
        } else {
          dbOk = true;
        }
      } catch (e) {
        dbError = e instanceof Error ? e.message : 'Unknown error';
      }
    } else {
      dbError = 'Missing Supabase credentials';
    }

    const healthy = envsOk && dbOk;

    return NextResponse.json(
      {
        status: healthy ? 'healthy' : 'unhealthy',
        environment: process.env.NODE_ENV,
        envCheck,
        database: { ok: dbOk, error: dbError },
        timestamp: new Date().toISOString(),
      },
      { status: healthy ? 200 : 500 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
