import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';

import LayoutWrapper from '@/components/LayoutWrapper';
import { AuthProvider } from '@/contexts/AuthContext';
import { DownloadProvider } from '@/contexts/DownloadContext';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'HEAD Sport Hub',
  description: 'Content and order management for HEAD athletes and managers.',
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <DownloadProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
          </DownloadProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
