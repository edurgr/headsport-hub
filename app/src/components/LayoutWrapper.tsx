'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { FC, ReactNode } from 'react';

import { DownloadProvider } from '@/contexts/DownloadContext';

import SidebarContainer from './SidebarContainer';

const DownloadOverlay = dynamic(() => import('./DownloadOverlay'), { ssr: false });

type LayoutWrapperProps = {
  children: ReactNode;
};

const LayoutWrapper: FC<LayoutWrapperProps> = ({ children }) => {
  const pathname = usePathname();
  const { user, profile, loading, isAdmin } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
      <div className="flex h-screen overflow-x-hidden">
        <SidebarContainer />
        <div className="flex-1 flex flex-col overflow-x-hidden">
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-6 overflow-x-hidden">
              {children}
            </div>
          </main>
        </div>
      </div>
      <DownloadOverlay />
    </DownloadProvider>
  );
}
