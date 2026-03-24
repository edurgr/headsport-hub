'use client';

import { usePathname } from 'next/navigation';

import type { FC, ReactNode } from 'react';

import { useAuth } from '@/contexts/AuthContext';

import Header from './Header';
import SidebarContainer from './SidebarContainer';
import DownloadOverlay from './DownloadOverlay';

type LayoutWrapperProps = {
  children: ReactNode;
};

const LayoutWrapper: FC<LayoutWrapperProps> = ({ children }) => {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const effectivePath =
    pathname || (typeof window !== 'undefined' ? window.location.pathname : null);

  // Páginas públicas que no necesitan sidebar ni layout especial
  const publicPages = [
    '/login',
    '/signup',
    '/accept-invite',
    '/auth/callback',
    '/onboarding',
    '/forgot-password',
    '/reset-password',
  ];

  // Important: `/` renders a login form when unauthenticated (see `app/page.tsx`).
  // So treat `/` as public ONLY when the user is not authenticated; otherwise render the app shell.
  const isRoot = effectivePath === '/';
  const isAuthed = !!user || !!profile;

  // `usePathname()` can be null briefly during hydration; treat it as public to avoid flashing the app shell.
  const isPublicPage =
    !effectivePath ||
    publicPages.some((page) => effectivePath.startsWith(page)) ||
    (isRoot && !isAuthed) ||
    // While auth is loading on `/`, keep it public to avoid shell flash.
    (isRoot && loading);

  if (isPublicPage) {
    return (
      <div className="min-h-screen">
        {children}
        <DownloadOverlay />
      </div>
    );
  }

  // Show a loading screen while auth is still resolving to prevent layout flash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Páginas protegidas con sidebar
  return (
    <div className="flex h-screen w-full">
      <SidebarContainer />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <DownloadOverlay />
    </div>
  );
};

export default LayoutWrapper;
