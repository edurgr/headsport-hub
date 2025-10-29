'use client';

import { useEffect } from 'react';
import type { FC, PropsWithChildren } from 'react';

import { useRouter, usePathname } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute: FC<PropsWithChildren> = ({ children }) => {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // if not logged in, redirect to login page
    if (!user) {
      router.push('/login');
      return;
    }

    // if logged in, but no profile, redirect to onboarding
    if (!profile) {
      router.push('/onboarding');
    }
  }, [user, profile, loading, router, pathname]);

  if (loading || !user || !profile) {
    return <div>Loading...</div>;
  }

  return children;
};

export default ProtectedRoute;
