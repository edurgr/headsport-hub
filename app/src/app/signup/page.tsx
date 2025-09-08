'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const { signUpWithEmail, profile } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Check if user has permissions to register
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      setError('Access denied. Only administrators can create new accounts.');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check permissions
    if (!profile || profile.role !== 'admin') {
      setError('Access denied. Only administrators can create new accounts.');
      return;
    }

    setError(null);
    setInfo(null);
    setIsLoading(true);

    try {
      const { requiresEmailConfirmation } = await signUpWithEmail(
        email,
        password,
        name || undefined
      );
      if (requiresEmailConfirmation) {
        setInfo('Check your email to confirm the new administrator account.');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not create administrator account.');
    } finally {
      setIsLoading(false);
    }
  };

  // If not admin, show access denied message
  if (profile && profile.role !== 'admin') {
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
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-6">
              Only administrators can create new accounts. Please contact your system administrator
              for an invitation.
            </p>
            <div className="space-y-3">
              <Link
                href="/login"
                className="w-full inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Go to Login
              </Link>
              <Link
                href="/"
                className="w-full inline-block px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Create Administrator Account
          </h1>
          <p className="text-gray-600">Register a new administrator for the system</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Administrator name"
              type="text"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@example.com"
              type="email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
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
            {isLoading ? 'Creating Administrator Account…' : 'Create Administrator Account'}
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
              <span className="font-medium">Administrator Registration</span>
            </div>
            <ul className="text-xs space-y-1 ml-6">
              <li>• Only existing administrators can create new admin accounts</li>
              <li>• New administrators will have full system access</li>
              <li>• Email confirmation is required after registration</li>
              <li>• For other users, use the invitation system</li>
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
