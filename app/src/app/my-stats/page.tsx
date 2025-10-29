'use client';

import { useEffect, useState, useCallback } from 'react';

import { CheckCircle, Clock, FileImage, Package, ShoppingCart, Video, XCircle } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { useAuth } from '@/contexts/AuthContext';

interface AthleteStats {
  athlete: {
    id: string;
    name: string;
    email: string;
  };
  content: {
    total_content: number;
    photos: number;
    videos: number;
  };
  orders: {
    total_orders: number;
    pending_orders: number;
    approved_orders: number;
    rejected_orders: number;
    total_items: number;
  };
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

export default function MyStatsPage() {
  const { user, profile, loading } = useAuth();
  const [stats, setStats] = useState<AthleteStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchMyStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      // Pass the current user's ID as a parameter
      const athleteId = user?.id;
      const url = athleteId
        ? `/api/analytics/my-stats?athlete_id=${athleteId}`
        : '/api/analytics/my-stats';

      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
        redirect: 'follow',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error('Failed to fetch stats');
      }
    } catch (err) {
    } finally {
      setLoadingStats(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (profile) {
      fetchMyStats();
    }
  }, [profile, fetchMyStats]);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    if (!loading && user && profile) {
      const interval = setInterval(() => {
        fetchMyStats();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
    return undefined;
  }, [user, profile, loading, fetchMyStats]);

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--info))] mx-auto"></div>
          <p className="mt-4 text-[hsl(var(--muted))]">Loading your statistics...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">Access Denied</h1>
          <p className="text-[hsl(var(--muted))]">You must sign in to view your statistics.</p>
        </div>
      </div>
    );
  }

  const contentData = [
    { name: 'Photos', value: stats?.content.photos || 0, color: CHART_COLORS[0] },
    { name: 'Videos', value: stats?.content.videos || 0, color: CHART_COLORS[1] },
  ];

  const orderStatusData = [
    { name: 'Pending', value: stats?.orders.pending_orders || 0, color: CHART_COLORS[3] },
    { name: 'Approved', value: stats?.orders.approved_orders || 0, color: CHART_COLORS[1] },
    { name: 'Rejected', value: stats?.orders.rejected_orders || 0, color: CHART_COLORS[2] },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">My Statistics</h1>
            <p className="mt-2 text-[hsl(var(--muted))]">
              Summary of your activity on the platform
            </p>
          </div>
          <button
            onClick={fetchMyStats}
            disabled={loadingStats}
            className="btn disabled:opacity-50 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <svg
              className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{loadingStats ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Content Stats */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-6">
            Uploaded Content
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--info) / 0.08)' }}>
              <div className="flex items-center">
                <FileImage className="h-8 w-8" style={{ color: 'hsl(var(--info))' }} />
                <div className="ml-4">
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--info))' }}>
                    Photos Uploaded
                  </p>
                  <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                    {stats?.content.photos || 0}
                  </p>
                </div>
              </div>
            </div>

            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: 'hsl(var(--success) / 0.08)' }}
            >
              <div className="flex items-center">
                <Video className="h-8 w-8" style={{ color: 'hsl(var(--success))' }} />
                <div className="ml-4">
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--success))' }}>
                    Videos Uploaded
                  </p>
                  <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                    {stats?.content.videos || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--muted) / 0.1)' }}>
              <div className="flex items-center">
                <Package className="h-8 w-8" style={{ color: 'hsl(var(--muted))' }} />
                <div className="ml-4">
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--muted))' }}>
                    Total Content
                  </p>
                  <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                    {stats?.content.total_content || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-4 text-center">
              Content Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={contentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill={CHART_COLORS[3]}
                  dataKey="value"
                >
                  {contentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Stats */}
        <div className="card">
          <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-6">Orders Made</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: 'hsl(var(--warning) / 0.1)' }}
            >
              <div className="flex items-center">
                <Clock className="h-8 w-8" style={{ color: 'hsl(var(--warning))' }} />
                <div className="ml-4">
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--warning))' }}>
                    Pending
                  </p>
                  <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                    {stats?.orders.pending_orders || 0}
                  </p>
                </div>
              </div>
            </div>

            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: 'hsl(var(--success) / 0.08)' }}
            >
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8" style={{ color: 'hsl(var(--success))' }} />
                <div className="ml-4">
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--success))' }}>
                    Approved
                  </p>
                  <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                    {stats?.orders.approved_orders || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--error) / 0.08)' }}>
              <div className="flex items-center">
                <XCircle className="h-8 w-8" style={{ color: 'hsl(var(--error))' }} />
                <div className="ml-4">
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--error))' }}>
                    Rejected
                  </p>
                  <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                    {stats?.orders.rejected_orders || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--info) / 0.08)' }}>
              <div className="flex items-center">
                <ShoppingCart className="h-8 w-8" style={{ color: 'hsl(var(--info))' }} />
                <div className="ml-4">
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--info))' }}>
                    Total Items
                  </p>
                  <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                    {stats?.orders.total_items || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-4">
                Order Status
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill={CHART_COLORS[3]}
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-4">
                Activity Summary
              </h3>
              <div className="space-y-4">
                <div
                  className="rounded-lg p-4"
                  style={{
                    backgroundColor: 'hsl(var(--secondary))',
                    border: '1px solid hsl(var(--border))',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[hsl(var(--muted))]">
                      Total Orders
                    </span>
                    <span className="text-lg font-bold text-[hsl(var(--foreground))]">
                      {stats?.orders.total_orders || 0}
                    </span>
                  </div>
                </div>

                <div
                  className="rounded-lg p-4"
                  style={{
                    backgroundColor: 'hsl(var(--secondary))',
                    border: '1px solid hsl(var(--border))',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[hsl(var(--muted))]">
                      Items Requested
                    </span>
                    <span className="text-lg font-bold text-[hsl(var(--foreground))]">
                      {stats?.orders.total_items || 0}
                    </span>
                  </div>
                </div>

                <div
                  className="rounded-lg p-4"
                  style={{
                    backgroundColor: 'hsl(var(--secondary))',
                    border: '1px solid hsl(var(--border))',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[hsl(var(--muted))]">
                      Total Content
                    </span>
                    <span className="text-lg font-bold text-[hsl(var(--foreground))]">
                      {stats?.content.total_content || 0}
                    </span>
                  </div>
                </div>

                <div
                  className="rounded-lg p-4"
                  style={{
                    backgroundColor: 'hsl(var(--secondary))',
                    border: '1px solid hsl(var(--border))',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[hsl(var(--muted))]">
                      Approval Rate
                    </span>
                    <span className="text-lg font-bold text-[hsl(var(--foreground))]">
                      {stats?.orders?.total_orders && stats.orders.total_orders > 0
                        ? `${((stats.orders.approved_orders / stats.orders.total_orders) * 100).toFixed(1)}%`
                        : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
