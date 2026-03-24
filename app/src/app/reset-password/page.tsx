'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Supabase may link to /reset-password in its default email template.
// Redirect to /auth/callback which handles the PASSWORD_RECOVERY flow.
export default function ResetPasswordPage() {
  const router = useRouter();
  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    router.replace(`/auth/callback${search}${hash}`);
  }, [router]);
  return null;
}
