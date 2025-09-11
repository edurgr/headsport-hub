// Supabase configuration with fallbacks for different environments
export function getSupabaseConfig() {
  // Try different ways to get the environment variables
  const supabaseUrl = 
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const supabaseAnonKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  const supabaseServiceKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    '';

  // Log configuration for debugging
  console.log('Supabase Config Debug:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceKey,
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE')),
  });

  if (!supabaseUrl) {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is required. Current env: ${process.env.NODE_ENV}`);
  }
  
  if (!supabaseAnonKey) {
    throw new Error(`NEXT_PUBLIC_SUPABASE_ANON_KEY is required. Current env: ${process.env.NODE_ENV}`);
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    serviceKey: supabaseServiceKey,
  };
}
