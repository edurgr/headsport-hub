'use client';

import { usePathname } from 'next/navigation';

import type { FC, ReactNode } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import Header from './Header';
import SidebarContainer from './SidebarContainer';
import { DownloadProvider } from '@/contexts/DownloadContext';
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

  const isPublicPage = publicPages.some((page) => pathname?.startsWith(page));

  if (isPublicPage) {
    return (
      <div className="min-h-screen">
        <DownloadProvider>
          {children}
          <DownloadOverlay />
        </DownloadProvider>
      </div>
    );
  }

  // Páginas protegidas con sidebar
  return (
    <DownloadProvider>
      <div className="flex h-screen w-full">
        <SidebarContainer />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
      <DownloadOverlay />
    </DownloadProvider>
  );
};

export default LayoutWrapper;
