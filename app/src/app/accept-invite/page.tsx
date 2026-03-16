'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Password visibility toggle removed - not implemented in UI
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [invitationDetails, setInvitationDetails] = useState<{
    email: string;
    role: string;
    expiresAt: string;
    invitedBy?: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided. Please check your invitation link.');
      setIsValidating(false);
      return;
    }

    // Validate the real token
    const validateInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/validate?token=${token}`);
        const data = await response.json();

        if (data.valid) {
          setInvitationDetails({
            email: data.email,
            role: data.role,
            expiresAt: data.expiresAt,
            invitedBy: data.invitedBy,
          });
          setEmail(data.email);
        } else {
          setError(data.error || 'Invalid or expired invitation');
        }
      } catch (error) {
        console.error('Validation error:', error);
        setError('Failed to validate invitation. Please try again.');
      } finally {
        setIsValidating(false);
      }
    };

    validateInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('Invalid invitation token.');
      return;
    }

    setError(null);
    setInfo(null);
    setIsLoading(true);

    try {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      // Use the new server API
      const response = await fetch('/api/invitations/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limiting
          setError(
            '⏰ Rate limit reached: Please wait 36 seconds before trying to create another account.',
          );
          setInfo(
            '💡 Tip: If you just created another account, wait a moment before trying again.',
          );
        } else if (response.status === 409 && data?.code === 'user_exists') {
          setError('An account with this email already exists. Sign in to accept the invitation.');
          // Redirect to login with invitation token to accept after login
          setTimeout(() => {
            const params = new URLSearchParams();
            params.set('email', email);
            params.set('invite_token', token!);
            router.push('/login' + '?' + params.toString());
          }, 1500);
        } else {
          setError(data.error || 'Could not create account with invitation.');
        }
        return;
      }

      if (data.success) {
        if (data.action === 'recovery_link_sent' || data.action === 'recovery_initiated') {
          setInfo(
            '✅ We sent you a secure link to set your password. Check your inbox and then sign in to finish the invitation.',
          );
          const loginUrl = data.loginUrl || `/login?email=${encodeURIComponent(email)}&invite_token=${encodeURIComponent(token)}`;
          setTimeout(() => router.push(loginUrl), 1500);
          return;
        }
        // New user flow: sign in immediately with provided password
        try {
          const { error: signInErr } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
          });
          if (signInErr) {
            // If sign-in fails, fall back to redirect to login with email prefilled
            const loginUrl = `/login?email=${encodeURIComponent(email)}`;
            setInfo('Account created. Please sign in to continue.');
            setTimeout(() => router.push(loginUrl), 1200);
            return;
          }
          setInfo('✅ Account created. Redirecting to your dashboard...');
          setTimeout(() => router.push('/'), 1000);
        } catch {
          const loginUrl = `/login?email=${encodeURIComponent(email)}`;
          setInfo('Account created. Please sign in to continue.');
          setTimeout(() => router.push(loginUrl), 1200);
        }
      } else {
        setError(data.error || 'Could not create account with invitation.');
      }
    } catch (err: any) {
      console.error('Error during signup:', err);
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Validating Invitation...</h1>
            <p className="text-gray-600">Please wait while we verify your invitation.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !invitationDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Invalid Invitation</h1>
            <p className="text-gray-600 mb-6">
              {error ||
                'No invitation token provided. Please check your invitation link or contact your administrator.'}
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Accept Invitation</h1>
          <p className="text-gray-600">Complete your registration with the provided invitation</p>
        </div>

        {invitationDetails && (
          <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-200">
            <div className="text-sm text-blue-800">
              <div className="flex items-center mb-2">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium">Invitation Details</span>
              </div>
              <div className="space-y-1 text-xs">
                <p>
                  <strong>Email:</strong> {invitationDetails.email}
                </p>
                <p>
                  <strong>Role:</strong>{' '}
                  {invitationDetails.role.charAt(0).toUpperCase() + invitationDetails.role.slice(1)}
                </p>
                <p>
                  <strong>Expires:</strong>{' '}
                  {new Date(invitationDetails.expiresAt).toLocaleDateString()}
                </p>
                {invitationDetails.invitedBy && (
                  <p>
                    <strong>Invited by:</strong> {invitationDetails.invitedBy}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your full name"
              type="text"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your.email@example.com"
              type="email"
              required
            />
            <p className="text-xs text-gray-500 mt-1">You can modify the email if needed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              type="password"
              minLength={6}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Password must be at least 6 characters long
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              type="password"
              minLength={6}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Re-enter the same password</p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                {error}
              </div>
            </div>
          )}
          {info && (
            <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {info}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 rounded-md text-white font-medium ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        {/* Help Information */}
        <div className="mt-6 p-3 bg-blue-50 rounded-md border border-blue-200">
          <div className="text-sm text-blue-800">
            <div className="flex items-center mb-1">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">About Invitations</span>
            </div>
            <ul className="text-xs space-y-1 ml-6">
              <li>• Your role is pre-selected and cannot be changed</li>
              <li>• Email confirmation is required after registration</li>
              <li>• You'll have access based on your assigned role</li>
              <li>• Contact your administrator if you have questions</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
