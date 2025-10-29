'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';

import NotificationCenter from './NotificationCenter';

export default function Header() {
  const { user } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    setIsDemoMode(process.env.NEXT_PUBLIC_DEMO_MODE === 'true');
  }, []);

  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'HEAD Sport Hub';
  const logoPathEnv = process.env.NEXT_PUBLIC_LOGO_PATH || '/head-logo.svg';

  // Fallback to a default logo if the env var is not set or is an invalid path
  const logoSrc = logoPathEnv.startsWith('/') ? logoPathEnv : '/head-logo.svg';

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6 dark:bg-gray-950">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src={logoSrc} alt={brandName} width={24} height={24} />
          <span className="font-semibold">{brandName}</span>
        </Link>
        {isDemoMode && (
          <div className="rounded-md bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">Demo Mode</div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <NotificationCenter />
        <button className="px-3 h-9 inline-flex items-center rounded-md bg-gray-900 text-white text-sm hover:opacity-90 transition-colors dark:bg-gray-50 dark:text-gray-900">
          Quick Action
        </button>
      </div>
    </header>
  );
}
