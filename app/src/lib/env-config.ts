// Centralized environment configuration with proper error handling
export function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  }
  
  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    serviceKey: supabaseServiceKey,
  };
}

export function getAuthConfig() {
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;

  if (!nextAuthSecret) {
    throw new Error('NEXTAUTH_SECRET is required');
  }

  return {
    secret: nextAuthSecret,
    url: nextAuthUrl || 'http://localhost:3000',
  };
}

export function getAppConfig() {
  return {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}
