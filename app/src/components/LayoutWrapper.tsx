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
  const { user, profile } = useAuth();
  const pathname = usePathname();

  // Páginas públicas que no necesitan sidebar ni layout especial
  const publicPages = [
    '/login',
    '/signup',
    '/accept-invite',
    '/auth/callback',
    '/onboarding',
    '/forgot-password',
  ];

  // `usePathname()` can be null briefly during hydration; treat it as public to avoid flashing the app shell.
  const isPublicPage = !pathname || publicPages.some((page) => pathname.startsWith(page));

  if (isPublicPage) {
    return (
      <div className="min-h-screen">
        {children}
        <DownloadOverlay />
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
