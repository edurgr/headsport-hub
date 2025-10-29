'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useAuth } from '@/contexts/AuthContext';
import { MountainIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

import NotificationCenter from './NotificationCenter';
import { useEffect, useState } from 'react';

export default function Header() {
  const { user } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    setIsDemoMode(process.env.NEXT_PUBLIC_DEMO_MODE === 'true');
  }, []);

  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'HEAD Sport Hub';
  const logoPathEnv = process.env.NEXT_PUBLIC_LOGO_PATH || '/head-logo.svg';
  const logoSrc = logoPathEnv.endsWith('.html') ? '/head-logo.svg' : logoPathEnv;

  if (!user) return null;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6 dark:bg-gray-950">
      <div className="flex items-center gap-4">
        <Link href="#" className="flex items-center gap-2" prefetch={false}>
          <MountainIcon className="h-6 w-6" />
          <span className="font-semibold">Acme Inc</span>
        </Link>
        {isDemoMode && (
          <div className="rounded-md bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">Demo Mode</div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full">
          <NotificationCenter />
        </Button>
        <button className="px-3 h-9 inline-flex items-center rounded-md bg-[var(--foreground)] text-white text-sm hover:opacity-90 transition-colors">
          Quick Action
        </button>
      </div>
    </header>
  );
}
