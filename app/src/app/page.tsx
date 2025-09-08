'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';
import { supabaseClient } from '@/lib/supabase-client';

export default function Home() {
  const router = useRouter();
  const { user, profile, loading, hydrated, signInWithEmail } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkMsg, setLinkMsg] = useState<string | null>(null);
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'HEAD Hub';

  useEffect(() => {
    setMounted(true);
  }, []);

  // If Supabase recovery link lands on root (/) with hash tokens, forward to /auth/callback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    if (!hash) return;
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const isRecovery = hashParams.get('type') === 'recovery' || hashParams.has('access_token');
    if (isRecovery) {
      const target = `/auth/callback${window.location.search || ''}${hash}`;
      router.push(target);
    }
  }, [router]);

  // Preserve invite_token from URL and store locally for flows
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const inviteToken = url.searchParams.get('invite_token');
    const prefillEmail = url.searchParams.get('email');
    let changed = false;
    if (inviteToken && !localStorage.getItem('invite_token')) {
      localStorage.setItem('invite_token', inviteToken);
    }
    if (prefillEmail && !email) {
      setEmail(prefillEmail);
      changed = true;
    }
    if (inviteToken || prefillEmail) {
      url.searchParams.delete('invite_token');
      url.searchParams.delete('email');
      if (changed || inviteToken) {
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [email]);

  // Remove auto-redirects on '/' so all roles can view the dashboard page

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user && !profile) {
    // Login form for unauthenticated users
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full card space-y-8 p-8">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center">
              <Image
                src="/head-logo.svg"
                alt="HEAD Logo"
                width={48}
                height={48}
                className="h-12 w-12"
              />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-[hsl(var(--foreground))]">
              Sign in to {brandName}
            </h2>
            <p className="mt-2 text-center text-sm text-[hsl(var(--muted))]">
              Athlete management platform
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
            {error && (
              <div className="alert alert-error">
                <div className="text-sm">{error}</div>
              </div>
            )}
            {linkMsg && (
              <div className="alert alert-success">
                <div className="text-sm">{linkMsg}</div>
              </div>
            )}
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input rounded-t-md"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="input rounded-b-md"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button type="submit" disabled={isLoading} className="btn w-full">
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="font-medium underline text-[hsl(var(--foreground))] hover:opacity-80"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard for authenticated users
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {profile?.name || user?.email}!
        </h1>
        <p className="mt-2 text-gray-600">Manage your athlete profile and content</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link
          href="/profile"
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Profile</h3>
              <p className="text-sm text-gray-500">View and edit your profile</p>
            </div>
          </div>
        </Link>

        <Link
          href="/content"
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
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
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Content</h3>
              <p className="text-sm text-gray-500">Manage your content and media</p>
            </div>
          </div>
        </Link>

        <Link
          href="/orders"
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Orders</h3>
              <p className="text-sm text-gray-500">View your equipment orders</p>
            </div>
          </div>
        </Link>

        {/* Athletes card: visible solo a managers/admin */}
        {profile?.role !== 'athlete' && (
          <Link
            href="/athlete-management"
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Athletes</h3>
                <p className="text-sm text-gray-500">Manage athlete profiles</p>
              </div>
            </div>
          </Link>
        )}

        {/* My Stats card: visible solo a atletas */}
        {profile?.role === 'athlete' && (
          <Link
            href="/my-stats"
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
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
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">My Stats</h3>
                <p className="text-sm text-gray-500">View your performance</p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        {profile?.role === 'athlete' ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Latest Content</h3>
              <ContentSummary userId={user?.id || ''} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Latest Orders</h3>
              <OrdersSummary email={user?.email || ''} />
            </div>
          </div>
        ) : (
          <TeamSnapshot />
        )}
      </div>
    </div>
  );

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }
}

function ContentSummary({ userId }: { userId: string }) {
  const [items, setItems] = useState<
    { id: string; filename: string; created_at: string; thumbnail_url?: string }[]
  >([]);
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/content/gallery?limit=5&user_id=${encodeURIComponent(userId)}`, {
      cache: 'no-store',
    })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(j =>
        setItems(
          (j.items || []).map((x: any) => ({
            id: x.id,
            filename: x.filename,
            created_at: x.created_at,
            thumbnail_url: x.thumbnail_url,
          }))
        )
      )
      .catch(() => setItems([]));
  }, [userId]);
  if (items.length === 0) return <p className="text-sm text-gray-500">No recent uploads.</p>;
  return (
    <div className="grid grid-cols-5 gap-3">
      {items.map(i => (
        <div key={i.id} className="text-center">
          <div className="w-16 h-16 mx-auto rounded overflow-hidden bg-gray-100 flex items-center justify-center">
            {i.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={i.thumbnail_url} alt={i.filename} className="w-full h-full object-cover" />
            ) : (
              <div className="text-xs text-gray-400">No preview</div>
            )}
          </div>
          <div className="mt-1 text-[11px] text-gray-700 truncate" title={i.filename}>
            {i.filename}
          </div>
          <div className="text-[10px] text-gray-400">
            {new Date(i.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}

function OrdersSummary({ email }: { email: string }) {
  const [orders, setOrders] = useState<{ id: string; created_at: string; status: string }[]>([]);
  useEffect(() => {
    if (!email) return;
    fetch(`/api/orders?scope=mine&athleteEmail=${encodeURIComponent(email)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(j =>
        setOrders(
          (j.orders || [])
            .slice(0, 5)
            .map((o: any) => ({ id: o.id, created_at: o.created_at, status: o.status }))
        )
      )
      .catch(() => setOrders([]));
  }, [email]);
  if (orders.length === 0) return <p className="text-sm text-gray-500">No recent orders.</p>;
  return (
    <ul className="text-sm text-gray-700 space-y-1">
      {orders.map(o => (
        <li key={o.id} className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-[10px] rounded-full ${o.status === 'approved' ? 'badge-success' : o.status === 'pending_approval' ? 'badge-warning' : 'badge-error'}`}
          >
            {o.status}
          </span>
          <span>{new Date(o.created_at).toLocaleDateString()}</span>
        </li>
      ))}
    </ul>
  );
}

function TeamSnapshot() {
  const [totals, setTotals] = useState<{ athletes: number; pending: number; uploads: number }>({
    athletes: 0,
    pending: 0,
    uploads: 0,
  });
  const [recent, setRecent] = useState<{
    approvals: { id: string; created_at: string; athlete: string }[];
    pending: { id: string; created_at: string; athlete: string }[];
  }>({ approvals: [], pending: [] });

  useEffect(() => {
    // Athletes total
    fetch('/api/profiles/list?role=athlete&limit=1', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(j => setTotals(t => ({ ...t, athletes: j.pagination?.total || 0 })))
      .catch(() => {});
    // Pending orders
    fetch('/api/orders?scope=pending', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(j => setTotals(t => ({ ...t, pending: (j.orders || []).length })))
      .catch(() => {});
    // Latest uploads (count last 24h approx by filtering client-side)
    fetch('/api/content/gallery?limit=20', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(j => {
        const now = Date.now();
        const uploads24h = (j.items || []).filter(
          (x: any) => now - Date.parse(x.created_at) < 24 * 3600 * 1000
        ).length;
        setTotals(t => ({ ...t, uploads: uploads24h }));
      })
      .catch(() => {});
    // Recent approvals and pending queue
    fetch('/api/orders?scope=approved', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(j =>
        setRecent(s => ({
          ...s,
          approvals: (j.orders || []).slice(0, 5).map((o: any) => ({
            id: o.id,
            created_at: o.approved_at || o.created_at,
            athlete: o.athlete_name || o.athlete_email,
          })),
        }))
      )
      .catch(() => {});
    fetch('/api/orders?scope=pending', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(j =>
        setRecent(s => ({
          ...s,
          pending: (j.orders || []).slice(0, 5).map((o: any) => ({
            id: o.id,
            created_at: o.created_at,
            athlete: o.athlete_name || o.athlete_email,
          })),
        }))
      )
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded border bg-gray-50">
          <div className="text-xs text-gray-500">Athletes</div>
          <div className="text-2xl font-bold">{totals.athletes}</div>
        </div>
        <div className="p-3 rounded border bg-yellow-50">
          <div className="text-xs text-yellow-700">Pending Orders</div>
          <div className="text-2xl font-bold text-yellow-700">{totals.pending}</div>
        </div>
        <div className="p-3 rounded border bg-blue-50">
          <div className="text-xs text-blue-700">Uploads (24h)</div>
          <div className="text-2xl font-bold text-blue-700">{totals.uploads}</div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Approvals</h3>
          {recent.approvals.length === 0 ? (
            <p className="text-sm text-gray-500">No approvals yet.</p>
          ) : (
            <ul className="text-sm text-gray-700 space-y-1">
              {recent.approvals.map(a => (
                <li key={a.id}>
                  • {a.athlete} — {new Date(a.created_at).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Pending Queue</h3>
          {recent.pending.length === 0 ? (
            <p className="text-sm text-gray-500">No pending orders.</p>
          ) : (
            <ul className="text-sm text-gray-700 space-y-1">
              {recent.pending.map(p => (
                <li key={p.id}>
                  • {p.athlete} — {new Date(p.created_at).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
