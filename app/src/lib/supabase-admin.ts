import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const supabaseAdmin =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

// Fallback para desarrollo local cuando las variables de entorno no están configuradas
export const getSupabaseAdmin = () => {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  // Para desarrollo local, usar las claves públicas si están disponibles
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && anonKey) {
    console.warn('Using anon key for admin operations - this should only be used in development');
    return createClient(supabaseUrl, anonKey);
  }

  return null;
};
