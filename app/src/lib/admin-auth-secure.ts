import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

import { createClient } from '@supabase/supabase-js';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export async function verifyAdminAccess(req: NextRequest): Promise<
  | {
      success: true;
      user: AdminUser;
    }
  | {
      success: false;
      error: string;
      status: number;
    }
> {
  try {
    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Variables de entorno de Supabase no configuradas');
      return {
        success: false,
        error: 'Server configuration error',
        status: 500,
      };
    }

    // Obtener token de autenticación desde header Authorization o cookies
    let token = '';

    // 1. Intentar obtener del header Authorization (Bearer token)
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('✅ Token encontrado en header Authorization');
    }

    // 2. Si no hay token en header, buscar en cookies
    if (!token) {
      const cookieStore = await cookies();
      const possibleTokens = [
        cookieStore.get('sb-access-token')?.value,
        cookieStore.get('sb:token')?.value,
        cookieStore.get('supabase-auth-token')?.value,
        cookieStore.get('sb-localhost-auth-token')?.value,
        cookieStore.get('sb-iiyavhodskjhqmycivus-auth-token')?.value,
      ].filter(Boolean);

      if (possibleTokens.length > 0) {
        token = possibleTokens[0] as string;
        console.log('✅ Token encontrado en cookies');
      }
    }

    if (!token) {
      console.log('❌ No se encontró token de acceso en header ni cookies');
      console.log('Authorization header:', authHeader ? 'presente' : 'ausente');
      const cookieStore = await cookies();
      console.log(
        'Available cookies:',
        cookieStore.getAll().map((c) => c.name),
      );
      return {
        success: false,
        error: 'Authentication required',
        status: 401,
      };
    }

    // Verificar el token obtenido
    let user = null;
    let authError = null;

    try {
      const testSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });

      const {
        data: { user: testUser },
        error: testError,
      } = await testSupabase.auth.getUser();

      if (!testError && testUser) {
        user = testUser;
        authError = null;
        console.log('✅ Token válido encontrado para usuario:', testUser.email);
      } else {
        authError = testError;
        console.log('❌ Token inválido:', testError?.message);
      }
    } catch (error) {
      authError = error;
      console.log('❌ Error verificando token:', error);
    }

    if (!user) {
      console.log('❌ Token de acceso inválido o usuario no encontrado');
      return {
        success: false,
        error: 'Invalid authentication token',
        status: 401,
      };
    }

    // Crear cliente Supabase con el token del usuario
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verificar que el usuario tenga rol de admin en la base de datos
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, name')
      .eq('id', user.id)
      .eq('role', 'admin')
      .single();

    if (profileError || !profile) {
      console.log('❌ Usuario no tiene permisos de admin:', user.email);
      return {
        success: false,
        error: 'Admin access required',
        status: 403,
      };
    }

    // Verificar que el email coincida (doble verificación)
    if (profile.email !== user.email) {
      console.log('❌ Email mismatch entre auth y profile:', user.email, profile.email);
      return {
        success: false,
        error: 'Authentication mismatch',
        status: 403,
      };
    }

    console.log('✅ Acceso admin verificado para:', profile.email);

    return {
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        name: profile.name,
      },
    };
  } catch (error) {
    console.error('❌ Error en verifyAdminAccess:', error);
    return {
      success: false,
      error: 'Internal server error',
      status: 500,
    };
  }
}

// Verify that the requester is either manager or admin
export async function verifyManagerOrAdminAccess(req: NextRequest): Promise<
  | {
      success: true;
      user: AdminUser;
    }
  | {
      success: false;
      error: string;
      status: number;
    }
> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        error: 'Server configuration error',
        status: 500,
      };
    }

    let token = '';
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (!token) {
      const cookieStore = await cookies();
      const possibleTokens = [
        cookieStore.get('sb-access-token')?.value,
        cookieStore.get('sb:token')?.value,
        cookieStore.get('supabase-auth-token')?.value,
        cookieStore.get('sb-localhost-auth-token')?.value,
        cookieStore.get('sb-iiyavhodskjhqmycivus-auth-token')?.value,
      ].filter(Boolean);
      if (possibleTokens.length > 0) token = possibleTokens[0] as string;
    }

    if (!token) {
      return { success: false, error: 'Authentication required', status: 401 };
    }

    const testSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
      error: authError,
    } = await testSupabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Invalid authentication token', status: 401 };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, name')
      .eq('id', user.id)
      .in('role', ['admin', 'manager'])
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Manager or admin access required', status: 403 };
    }

    if (profile.email !== user.email) {
      return { success: false, error: 'Authentication mismatch', status: 403 };
    }

    return {
      success: true,
      user: { id: profile.id, email: profile.email, role: profile.role, name: profile.name },
    };
  } catch (error) {
    return { success: false, error: 'Internal server error', status: 500 };
  }
}

// Función para verificar si un usuario es admin (sin hacer request)
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .eq('role', 'admin')
      .single();

    return !error && !!profile;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
