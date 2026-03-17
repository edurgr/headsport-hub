'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!hydrated) return;

    // if not logged in, redirect to login page
    if (!user) {
      router.push('/login');
      return;
    }

    // if logged in, but no profile, redirect to onboarding
    if (!profile) {
      router.push('/onboarding');
    }
  }, [user, profile, loading, hydrated, router, pathname]);

  if (fallback && (loading || !hydrated || !user || !profile)) return <>{fallback}</>;

  if (loading || !hydrated || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check role access (superadmin can access everything)
  if (requiredRole) {
    if (profile.role === 'superadmin') return <>{children}</>;
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasAccess = allowedRoles.includes(profile.role);

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
