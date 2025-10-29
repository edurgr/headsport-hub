import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseClient } from '@/lib/supabase-client';

export function useAuthenticatedFetch() {
  const { session } = useAuth();

  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    // Obtener el token de la sesión actual
    let token = '';

    console.log('🔍 useAuthenticatedFetch: Iniciando request a', url);
    console.log(
      '🔍 useAuthenticatedFetch: Session del contexto:',
      session ? 'disponible' : 'no disponible',
    );

    if (session?.access_token) {
      token = session.access_token;
      console.log('✅ useAuthenticatedFetch: Token obtenido del contexto');
    } else {
      console.log('⚠️ useAuthenticatedFetch: No hay sesión en contexto, obteniendo de Supabase...');
      // Si no hay sesión en el contexto, intentar obtenerla de Supabase
      const {
        data: { session: currentSession },
        error,
      } = await supabaseClient.auth.getSession();
      if (error) {
        console.error('❌ useAuthenticatedFetch: Error obteniendo sesión:', error.message);
      } else if (currentSession?.access_token) {
        token = currentSession.access_token;
        console.log('✅ useAuthenticatedFetch: Token obtenido de Supabase');
      } else {
        console.log('❌ useAuthenticatedFetch: No se pudo obtener token de Supabase');
      }
    }

    // Configurar headers con autenticación
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ useAuthenticatedFetch: Token incluido en headers');
    } else {
      console.log('❌ useAuthenticatedFetch: No hay token disponible');
    }

    console.log('📤 useAuthenticatedFetch: Realizando request con headers:', Object.keys(headers));

    try {
      const res = await fetch(url, {
        cache: 'no-store',
        redirect: 'follow',
        ...options,
        headers,
        credentials: 'include',
      });
      if (!res.ok) {
        // Attempt to parse error from response body
        const errorBody = await res.json().catch(() => ({ error: 'Request failed with status ' + res.status }));
        // Throw an error that includes the status and message
        throw new Error(errorBody.error || `HTTP error! status: ${res.status}`);
      }
      return res;
    } catch (error) {
      // Re-throw the error to be caught by the caller
      throw error;
    }
  }, [session]); 

  return { authenticatedFetch };
}

