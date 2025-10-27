'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { supabaseClient } from '@/lib/supabase-client';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isRecovery, setIsRecovery] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();
  const redirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Prioritize recovery flow if 'type=recovery' is in the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery') {
      setIsRecovery(true);
      setStatus('success');
      setMessage('Please set your new password.');
      return; // Stop further processing to show the form
    }

    const handleAuthCallback = async () => {
      try {
        // Handle other auth flows (e.g., magic link, OAuth)
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) {
          console.error('Auth callback getSession error:', error);
          setStatus('error');
          setMessage('Authentication failed. Please try again.');
          return;
        }

        if (data.session) {
          setStatus('success');
          setMessage('Authentication successful! Redirecting...');

          // Redirect to dashboard; schedule and allow cancellation
          redirectTimerRef.current = window.setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('No HEAD Sport Hub session found. Please try signing in again.');
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleAuthCallback();

    // Set up a listener for PASSWORD_RECOVERY as a fallback
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setStatus('success');
        setMessage('Please set your new password.');
        if (redirectTimerRef.current) {
          clearTimeout(redirectTimerRef.current); // Cancel any pending redirect
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, [router]);

  // If recovery is detected later, cancel any scheduled redirect
  useEffect(() => {
    if (isRecovery && redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  }, [isRecovery]);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      setUpdating(true);
      if (password.length < 6) {
        setFormError('Password must be at least 6 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match');
        return;
      }
      const { data: upd, error: updErr } = await supabaseClient.auth.updateUser({ password });
      if (updErr) {
        console.error('updateUser error:', updErr);
        setFormError(updErr.message || 'Failed to update password');
        return;
      }
      setMessage('Password updated successfully! Redirecting...');

      // Accept pending invite if present
      const urlParams = new URLSearchParams(window.location.search);
      const inviteToken = urlParams.get('invite_token');
      if (inviteToken) {
        try {
          await fetch('/api/invitations/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: inviteToken }),
          });
        } catch {}
      }

      // Clear hash to avoid re-triggering recovery on back/refresh
      try {
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
      } catch {}
      setTimeout(() => router.push('/'), 1500);
    } catch (err) {
      setFormError('Unexpected error updating password');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Processing Authentication</h1>
            <p className="text-gray-600">Please wait while we complete your sign-in...</p>
          </>
        )}

        {status === 'success' && !isRecovery && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-green-900 mb-2">Success!</h1>
            <p className="text-green-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-red-900 mb-2">Authentication Failed</h1>
            <p className="text-red-600 mb-4">{message}</p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </button>
          </>
        )}

        {status === 'success' && isRecovery && (
          <>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 11c0-1.657-1.343-3-3-3S6 9.343 6 11s1.343 3 3 3 3-1.343 3-3z M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Reset your password</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <form onSubmit={handleResetPassword} className="text-left space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  minLength={6}
                  required
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  minLength={6}
                  required
                  placeholder="••••••••"
                />
              </div>
              {formError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                  {formError}
                </div>
              )}
              <button
                type="submit"
                disabled={updating}
                className={`w-full py-2.5 rounded-md text-white font-medium ${updating ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {updating ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
