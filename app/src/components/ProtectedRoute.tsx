'use client';

import { useEffect } from 'react';
import type { FC, PropsWithChildren } from 'react';

import { useRouter, usePathname } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'athlete' | 'manager' | 'admin' | ('athlete' | 'manager' | 'admin')[];
  fallback?: React.ReactNode;
}

const ProtectedRoute: FC<PropsWithChildren> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Si la sesión ya se verificó (hydrated) y no hay usuario, redirigir
    if (loading && !user) {
      router.push('/login');
      return;
    }

    // Onboarding redirect: si el perfil está cargado y no tiene nombre, mandar a onboarding
    if (
      loading &&
      user &&
      profile &&
      (!profile.name || profile.name.trim().length === 0)
    ) {
      if (window.location.pathname !== '/onboarding') {
        router.push('/onboarding');
      }
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return children;
};

export default ProtectedRoute;
