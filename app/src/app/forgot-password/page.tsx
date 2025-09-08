'use client';

import { useState } from 'react';

import { supabaseClient } from '@/lib/supabase-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setMessage('');
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabaseClient.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo,
        }
      );
      if (error) {
        setStatus('error');
        setMessage(error.message || 'Failed to send password reset email');
        return;
      }
      setStatus('sent');
      setMessage('Check your email for the password reset link.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.message || 'Failed to send password reset email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email and we will send you a reset link.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter your email"
            />
          </div>

          {message && (
            <div
              className={`text-sm text-center ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}
            >
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending…' : 'Send reset link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
