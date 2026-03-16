'use client';

import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';

export default function SidebarContainer() {
  const { profile, signOut, forceSignOut, user } = useAuth();

  if (!profile) {
    // Fallback header actions when the sidebar is hidden due to missing profile
    return (
      <div className="w-full flex items-center justify-end gap-2 px-3 py-2">
        {user && (
          <button
            onClick={signOut}
            className="px-3 h-9 inline-flex items-center rounded-md bg-[var(--foreground)] text-white text-sm hover:opacity-90 transition-colors"
            title="Sign Out"
            aria-label="Sign Out"
          >
            Sign Out
          </button>
        )}
        <button
          onClick={forceSignOut}
          className="px-3 h-9 inline-flex items-center rounded-md bg-red-600 text-white text-sm hover:opacity-90 transition-colors"
          title="Force Sign Out"
          aria-label="Force Sign Out"
        >
          Force Sign Out
        </button>
      </div>
    );
  }

  return <Sidebar />;
}
