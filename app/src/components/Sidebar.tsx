'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';
import { supabaseClient } from '@/lib/supabase-client';

export default function Sidebar() {
  const { profile, signOut, forceSignOut } = useAuth();
  const showForceSignOut = process.env.NODE_ENV !== 'production';
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const pathname = usePathname();
  const [isCollapsed, setCollapsed] = useState(false);
  // Auto-collapse on small screens to save space
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = () => {
      if (mq.matches) setCollapsed(true);
    };
    apply();
    mq.addEventListener?.('change', apply);
    return () => {
      mq.removeEventListener?.('change', apply);
    };
  }, []);
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'HEAD Sport Hub';
  const logoPathEnv = process.env.NEXT_PUBLIC_LOGO_PATH || '/head-logo.svg';
  const logoSrc = logoPathEnv.endsWith('.html') ? '/head-logo.svg' : logoPathEnv;

  const profileAvatarPath = (profile as any)?.avatar_path as string | undefined;
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const bucket = (process.env.NEXT_PUBLIC_UPLOADS_BUCKET as string) || 'content';
        const avatarPath = profileAvatarPath || null;
        if (!avatarPath) {
          setAvatarUrl(null);
          return;
        }
        const { data, error } = await supabaseClient.storage
          .from(bucket)
          .createSignedUrl(avatarPath, 60 * 60);
        if (!error && data?.signedUrl) return setAvatarUrl(data.signedUrl);
        const pub = supabaseClient.storage.from(bucket).getPublicUrl(avatarPath);
        if (pub?.data?.publicUrl) setAvatarUrl(pub.data.publicUrl);
      } catch {
        setAvatarUrl(null);
      }
    };
    loadAvatar();
  }, [profile?.id, profileAvatarPath]);

  const navigationItems = [
    // Put Admin Dashboard first and hide generic dashboard for admins
    {
      name: 'Admin Dashboard',
      href: '/admin/dashboard',
      icon: 'grid',
      roles: ['admin', 'superadmin'],
    },
    {
      name: 'Dashboard',
      href: '/',
      icon: 'grid',
      roles: ['athlete', 'manager'],
    },
    {
      name: 'Content',
      href: '/content',
      icon: 'box',
      roles: ['athlete', 'manager', 'admin', 'superadmin'],
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: 'checkmark-box',
      roles: ['athlete', 'manager', 'admin', 'superadmin'],
    },
    {
      name: 'My Stats',
      href: '/my-stats',
      icon: 'trending-up',
      roles: ['athlete'],
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: 'trending-up',
      roles: ['admin', 'manager', 'superadmin'],
    },
    // Pending Orders merged into Orders page for managers/admin
    // Removed explicit Profile link; avatar area links to /profile for a cleaner sidebar

    // Only for managers and administrators
    {
      name: 'Profile Management',
      href: '/profile-management',
      icon: 'users',
      roles: ['admin', 'manager', 'superadmin'],
    },
    {
      name: 'Product Management',
      href: '/admin/product-management',
      icon: 'box',
      roles: ['admin', 'superadmin'],
    },
    {
      name: 'Content Moderation',
      href: '/admin/content-moderation',
      icon: 'shield-check',
      roles: ['admin', 'superadmin'],
    },
    // Consolidated: invitations and admin creation live inside Profile Management
  ].filter((item) => !profile || item.roles.includes(profile.role));

  const getIcon = (iconName: string) => {
    const icons: { [key: string]: string } = {
      grid: 'M3 3h8v8H3V3zm0 10h8v8H3v-8zM13 3h8v8h-8V3zm0 10h8v8h-8v-8z',
      box: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      'checkmark-box': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      users:
        'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
      user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      'box-arrow-down': 'M7 16l-4-4m0 0l4-4m-4 4h18M7 16v-4m0 0h18',
      'user-plus':
        'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
      gear: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      'trending-up': 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      'shield-check':
        'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    };
    return icons[iconName] || icons.grid;
  };

  if (!profile) return null;

  return (
    <div
      className={`bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-contrast))] transition-all duration-300 ${isCollapsed ? 'w-12 sm:w-16' : 'w-64'}`}
    >
      <div className="flex flex-col h-full">
        <div className="px-4 py-6">
          <div className="flex items-center gap-3">
            <div
              className="relative w-10 h-10 rounded-md overflow-hidden bg-[hsl(var(--sidebar))] flex items-center justify-center"
              style={{ border: '1px solid hsl(var(--sidebar-contrast) / 0.12)' }}
            >
              <Image
                src={logoSrc}
                width={36}
                height={36}
                alt={brandName}
                style={{ width: 'auto', height: 'auto' }}
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="text-base font-semibold tracking-tight">{brandName}</h1>
                <p className="text-xs text-[hsl(var(--sidebar-contrast) / 0.7)]">
                  Sports Management Platform
                </p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="mt-3">
              <span
                className="inline-flex px-2 py-1 text-[10px] font-semibold rounded-full"
                style={{
                  backgroundColor: 'hsl(var(--sidebar-contrast) / 0.12)',
                  color: 'hsl(var(--sidebar-contrast))',
                }}
              >
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </span>
            </div>
          )}
        </div>
        <nav className={`${isCollapsed ? 'px-2 py-4' : 'px-4 py-6'} flex-1`}>
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    title={item.name}
                    aria-label={item.name}
                    className={`flex items-center ${isCollapsed ? 'justify-center p-2' : 'space-x-3 px-3 py-2'} rounded-lg transition-colors ${
                      isActive
                        ? 'bg-white/10 text-[hsl(var(--sidebar-contrast))] border border-white/10'
                        : 'text-[hsl(var(--sidebar-contrast) / 0.7)] hover:bg-white/5 hover:text-[hsl(var(--sidebar-contrast))] border border-transparent'
                    }`}
                  >
                    <svg
                      className={`${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={getIcon(item.icon)}
                      />
                    </svg>
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4" style={{ borderTop: '1px solid hsl(var(--sidebar-contrast) / 0.12)' }}>
          {isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center">
                <Link
                  href="/profile"
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5"
                  title="Profile"
                  aria-label="Profile"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </Link>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => setCollapsed(false)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/5"
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={signOut}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/5"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
              {showForceSignOut ? (
                <div className="flex justify-center">
                  <button
                    onClick={forceSignOut}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/5 text-red-300"
                    title="Force sign out"
                    aria-label="Force sign out"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v8m4-4H8m12 0a8 8 0 11-16 0 8 8 0 0116 0z"
                      />
                    </svg>
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Link
                  href="/profile"
                  className="flex items-center space-x-3 flex-1 min-w-0 rounded-lg p-2 hover:bg-white/5"
                  style={{ border: '1px solid hsl(var(--sidebar-contrast) / 0.12)' }}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'hsl(var(--sidebar-contrast) / 0.12)' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {profile.name || profile.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs text-[hsl(var(--sidebar-contrast) / 0.7)] truncate">
                      {profile.email}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-2 rounded-md hover:bg-white/5 ml-2"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              </div>
              <button
                onClick={signOut}
                className="w-full px-3 py-2 text-sm rounded-lg flex items-center space-x-2 hover:bg-white/5"
                style={{ border: '1px solid hsl(var(--sidebar-contrast) / 0.12)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Sign Out</span>
              </button>
              {showForceSignOut ? (
                <button
                  onClick={forceSignOut}
                  className="w-full mt-2 px-3 py-2 text-sm rounded-lg flex items-center space-x-2 hover:bg-white/5 text-red-300"
                  style={{ border: '1px solid hsl(var(--sidebar-contrast) / 0.12)' }}
                  title="Force sign out"
                  aria-label="Force sign out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v8m4-4H8m12 0a8 8 0 11-16 0 8 8 0 0116 0z"
                    />
                  </svg>
                  <span>Force Sign Out</span>
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
