import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { logError, logHealthCheck } from '@/lib/logger';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.NEXT_PUBLIC_UPLOADS_BUCKET || 'user-uploads';

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: !!serviceRoleKey,
    NEXT_PUBLIC_UPLOADS_BUCKET: bucket,
  };

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ ok: false, env, error: 'Missing Supabase env' }, { status: 500 });
  }

  const admin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;
  const anon = createClient(supabaseUrl, supabaseAnonKey);

  const results: any = { env };

  try {
    const { error } = await anon.from('profiles').select('id').limit(1);
    results.db_profiles_read = { ok: !error, error: error?.message };
    logHealthCheck('database.profiles', error ? 'error' : 'healthy', error?.message);
  } catch (error) {
    results.db_profiles_read = {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown',
    };
    logError('Health check failed for profiles table', error);
  }

  try {
    const { error } = await anon.from('upload_sessions').select('id').limit(1);
    results.db_sessions_read = { ok: !error, error: error?.message };
  } catch (error) {
    results.db_sessions_read = {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown',
    };
  }

  try {
    const { error } = await anon.from('upload_files').select('id').limit(1);
    results.db_files_read = { ok: !error, error: error?.message };
  } catch (error) {
    results.db_files_read = {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown',
    };
  }

  try {
    const storageClient = admin ?? anon;
    await storageClient.storage.from(bucket).createSignedUrl('non-existent', 60);
    results.storage_signed_url = { ok: true };
  } catch (error) {
    results.storage_signed_url = {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown',
    };
  }

  return NextResponse.json({ ok: true, results });
}
