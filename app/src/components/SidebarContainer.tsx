'use client';

import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';

export default function SidebarContainer() {
  const { profile } = useAuth();

  if (!profile) {
    // No sidebar when profile is not loaded — Header handles sign-out.
    // Returning null keeps the flex layout intact (content fills full width).
    return null;
  }

  return <Sidebar />;
}
