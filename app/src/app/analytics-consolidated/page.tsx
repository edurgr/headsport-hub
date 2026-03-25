'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

interface AnalyticsData {
  period: string;
  total_revenue: number;
  revenue_growth: number;
  active_athletes: number;
  total_workouts: number;
  workout_completion_rate: number;
  dietary_compliance: number;
  engagement_rate: number;
  revenue_by_sport?: Record<string, number>;
  workouts_by_type?: Record<string, number>;
  daily_revenue?: Array<{ date: string; revenue: number }>;
}

export default function AnalyticsConsolidatedPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30d');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/dashboard?period=${period}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }

      const analyticsData = await response.json();
      setData(analyticsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'superadmin']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600">
              Comprehensive insights into your sports management platform
            </p>
          </div>

          {/* Period Selector */}
          <div className="mb-6 flex gap-3">
            {['7d', '30d', '90d', '1y'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p === '7d' && 'Last 7 days'}
                {p === '30d' && 'Last 30 days'}
                {p === '90d' && 'Last 90 days'}
                {p === '1y' && 'Last year'}
              </button>
            ))}
          </div>

          {/* Loading & Error States */}
          {loading && (
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading analytics...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-medium">Error loading analytics</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Dashboard Grid */}
          {data && !loading && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Revenue */}
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">
                        Total Revenue
                      </p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        ${data.total_revenue?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div
                      className={`text-2xl font-bold ${
                        (data.revenue_growth || 0) >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {data.revenue_growth ? (
                        <>
                          {(data.revenue_growth || 0) >= 0 ? '↑' : '↓'}
                          {Math.abs(data.revenue_growth || 0).toFixed(1)}%
                        </>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                </div>

                {/* Active Athletes */}
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                  <p className="text-gray-600 text-sm font-medium">
                    Active Athletes
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {data.active_athletes || '0'}
                  </p>
                </div>

                {/* Workouts */}
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                  <p className="text-gray-600 text-sm font-medium">
                    Total Workouts
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {data.total_workouts?.toLocaleString() || '0'}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Completion:{' '}
                    {data.workout_completion_rate
                      ? `${data.workout_completion_rate.toFixed(1)}%`
                      : '—'}
                  </p>
                </div>

                {/* Dietary Compliance */}
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
                  <p className="text-gray-600 text-sm font-medium">
                    Dietary Compliance
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {data.dietary_compliance
                      ? `${data.dietary_compliance.toFixed(1)}%`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Engagement Rate */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Engagement Rate
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-600 text-sm mb-2">
                        User Engagement
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all"
                          style={{
                            width: `${Math.min(data.engagement_rate || 0, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-gray-900 ml-4">
                      {data.engagement_rate
                        ? `${data.engagement_rate.toFixed(1)}%`
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Revenue by Sport */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Revenue by Sport
                  </h3>
                  <div className="space-y-2">
                    {data.revenue_by_sport && Object.keys(data.revenue_by_sport).length > 0 ? (
                      Object.entries(data.revenue_by_sport).map(([sport, revenue]) => (
                        <div
                          key={sport}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-gray-600 capitalize">{sport}</span>
                          <span className="font-medium text-gray-900">
                            ${Number(revenue).toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No revenue data available
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Last Updated */}
              <div className="mt-8 text-center text-gray-500 text-sm">
                <p>
                  Period: <span className="font-medium">{data.period || period}</span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
