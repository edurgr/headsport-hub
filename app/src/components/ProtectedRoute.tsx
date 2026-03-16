'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?:
    | 'athlete'
    | 'manager'
    | 'admin'
    | 'superadmin'
    | ('athlete' | 'manager' | 'admin' | 'superadmin')[];
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ children, requiredRole, fallback }: ProtectedRouteProps) {
  const { user, profile, loading, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si la sesión ya se verificó (hydrated) y no hay usuario, redirigir
    if (hydrated && !loading && !user) {
      router.push('/login');
      return;
    }

    // Onboarding redirect: si el perfil está cargado y no tiene nombre, mandar a onboarding
    if (
      hydrated &&
      !loading &&
      user &&
      profile &&
      (!profile.name || profile.name.trim().length === 0)
    ) {
      if (window.location.pathname !== '/onboarding') {
        router.push('/onboarding');
      }
    }
  }, [user, profile, loading, hydrated, router]);

  // Mostrar spinner mientras se carga la sesión por primera vez
  if (!hydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Si después de cargar no hay usuario, mostrar "Acceso denegado"
  if (!user) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">Please sign in to access this page.</p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      )
    );
  }

  // Comprobar rol una vez que el perfil está cargado
  if (requiredRole && !profile) {
    // Si se requiere un rol pero el perfil aún no carga, seguimos esperando
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  // Check role access (superadmin can access everything)
  if (requiredRole && profile) {
    if ((profile.role as any) === 'superadmin') {
      return <>{children}</>;
    }
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasAccess = allowedRoles.includes(profile.role as any);

    if (!hasAccess) {
      const roleText = Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole;
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You need {roleText} role to access this page. Your current role is {profile.role}.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
