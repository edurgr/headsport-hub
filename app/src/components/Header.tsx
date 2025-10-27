'use client';

import Image from 'next/image';

import { useAuth } from '@/contexts/AuthContext';

import NotificationCenter from './NotificationCenter';

export default function Header() {
  const { user } = useAuth();
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'HEAD Sport Hub';
  const logoPathEnv = process.env.NEXT_PUBLIC_LOGO_PATH || '/head-logo.svg';
  const logoSrc = logoPathEnv.endsWith('.html') ? '/head-logo.svg' : logoPathEnv;

  if (!user) return null;

  return (
    <header className="px-2 py-2">
      <div className="flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-md bg-white overflow-hidden flex items-center justify-center ring-1 ring-[var(--border)]">
            <Image
              src={logoSrc}
              width={28}
              height={28}
              alt={brandName}
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>
          <span className="hidden md:inline text-sm text-[var(--muted)]">{brandName}</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button className="px-3 h-9 inline-flex items-center rounded-md bg-[var(--foreground)] text-white text-sm hover:opacity-90 transition-colors">
            Quick Action
          </button>
        </div>
      </div>
    </header>
  );
}
