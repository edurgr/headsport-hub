'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileImage,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Video,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

// ─── Type definitions ────────────────────────────────────────────────────────

interface DashboardData {
  period: number;
  user_stats: {
    total_users: number;
    new_users: number;
    active_users: number;
    users_by_role: Record<string, number>;
  };
  order_stats: {
    total_orders: number;
    period_orders: number;
    orders_by_status: Record<string, number>;
    total_revenue: number;
    average_order_value: number;
  };
  content_stats: {
    total_content: number;
    period_content: number;
    content_by_type: Record<string, number>;
    total_storage_mb: number;
  };
  product_stats: {
    total_products: number;
    active_products: number;
    products_by_category: Record<string, number>;
  };
  system_health: {
    database_healthy: boolean;
    storage_healthy: boolean;
    uptime_hours: number;
  };
}

interface AthleteStats {
  athlete: { id: string; name: string; email: string };
  content: { total_content: number; photos: number; videos: number };
  orders: {
    total_orders: number;
    pending_orders: number;
    approved_orders: number;
    rejected_orders: number;
    total_items: number;
  };
}

interface ContentStats {
  total_content: number;
  photos: number;
  videos: number;
}

interface OrderStats {
  total_orders: number;
  pending_orders: number;
  approved_orders: number;
  rejected_orders: number;
  total_items: number;
}

interface AthleteContentStats {
  athlete_id: string;
  athlete_name: string;
  athlete_email: string;
  total_content: number;
  photos: number;
  videos: number;
}

interface AthleteOrderStats {
  athlete_id: string;
  athlete_name: string;
  athlete_email: string;
  total_orders: number;
  pending_orders: number;
  approved_orders: number;
  rejected_orders: number;
  total_items: number;
}

interface ProductStats {
  name: string;
  category: string;
  sku: string;
  total_quantity: number;
  order_count: number;
}

interface AthleteProductStats {
  athlete_id: string;
  athlete_name: string;
  athlete_email: string;
  products: Array<{ name: string; category: string; sku: string; quantity: number }>;
  total_products: number;
  total_quantity: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const PERIOD_OPTIONS = [
  { label: '7d', value: '7' },
  { label: '30d', value: '30' },
  { label: '90d', value: '90' },
  { label: '1y', value: '365' },
];

// ─── Page component ──────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { user, profile, session, loading, hydrated } = useAuth();

  const isAdminOrSuper =
    !!profile && ['admin', 'superadmin'].includes(profile.role);
  const canViewGlobal =
    !!profile && ['admin', 'manager', 'superadmin'].includes(profile.role);

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'orders'>('overview');

  // Overview – admin KPIs
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  // Overview – personal stats
  const [myStats, setMyStats] = useState<AthleteStats | null>(null);
  const [myStatsLoading, setMyStatsLoading] = useState(false);
  const [myStatsError, setMyStatsError] = useState<string | null>(null);

  // Content Analytics tab
  const [globalContentStats, setGlobalContentStats] = useState<ContentStats | null>(null);
  const [athleteContentStats, setAthleteContentStats] = useState<AthleteContentStats[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [visibleAthletes, setVisibleAthletes] = useState(12);

  // Order Analytics tab
  const [globalOrderStats, setGlobalOrderStats] = useState<OrderStats | null>(null);
  const [athleteOrderStats, setAthleteOrderStats] = useState<AthleteOrderStats[]>([]);
  const [productStats, setProductStats] = useState<ProductStats[]>([]);
  const [athleteProductStats, setAthleteProductStats] = useState<AthleteProductStats[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // ─── Auth fetch helper ────────────────────────────────────────────────────

  const authFetch = useCallback(
    async (url: string) => {
      const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      return fetch(url, { headers, cache: 'no-store' });
    },
    [session],
  );

  // ─── Fetchers ─────────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    if (!isAdminOrSuper) return;
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const res = await authFetch(`/api/admin/dashboard?period=${selectedPeriod}`);
      const data = await res.json();
      if (res.ok) {
        setDashboardData(data);
      } else {
        setDashboardError(data.error || 'Failed to load dashboard data.');
      }
    } catch {
      setDashboardError('Failed to load dashboard data.');
    } finally {
      setDashboardLoading(false);
    }
  }, [authFetch, isAdminOrSuper, selectedPeriod]);

  const fetchMyStats = useCallback(async () => {
    if (!user) return;
    setMyStatsLoading(true);
    setMyStatsError(null);
    try {
      const res = await authFetch(`/api/analytics/my-stats?athlete_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setMyStats(data.data);
      } else {
        setMyStatsError(data.error || 'Failed to load your statistics.');
      }
    } catch {
      setMyStatsError('Failed to load your statistics.');
    } finally {
      setMyStatsLoading(false);
    }
  }, [authFetch, user]);

  const fetchContentTab = useCallback(async () => {
    if (!canViewGlobal) return;
    setContentLoading(true);
    setContentError(null);
    try {
      const [globalRes, athleteRes] = await Promise.all([
        authFetch('/api/analytics/content-simple?group_by=global'),
        authFetch('/api/analytics/content-simple?group_by=athlete'),
      ]);
      const globalData = await globalRes.json();
      const athleteData = await athleteRes.json();
      if (globalData.success) setGlobalContentStats(globalData.data);
      if (athleteData.success) setAthleteContentStats(athleteData.data);
      if (!globalData.success || !athleteData.success) {
        setContentError('Some content data could not be loaded.');
      }
    } catch {
      setContentError('Failed to load content analytics.');
    } finally {
      setContentLoading(false);
    }
  }, [authFetch, canViewGlobal]);

  const fetchOrdersTab = useCallback(async () => {
    if (!canViewGlobal) return;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const [globalOrderRes, athleteOrderRes, productsRes, athleteProductsRes] = await Promise.all([
        authFetch('/api/analytics/orders-simple?group_by=global'),
        authFetch('/api/analytics/orders-simple?group_by=athlete'),
        authFetch('/api/analytics/orders-simple?group_by=products'),
        authFetch('/api/analytics/athlete-products'),
      ]);
      const go = await globalOrderRes.json();
      const ao = await athleteOrderRes.json();
      const ps = await productsRes.json();
      const aps = await athleteProductsRes.json();
      if (go.success) setGlobalOrderStats(go.data);
      if (ao.success) setAthleteOrderStats(ao.data);
      if (ps.success) setProductStats(ps.data);
      if (aps.success) setAthleteProductStats(aps.data);
      if (!go.success || !ao.success) {
        setOrdersError('Some order data could not be loaded.');
      }
    } catch {
      setOrdersError('Failed to load order analytics.');
    } finally {
      setOrdersLoading(false);
    }
  }, [authFetch, canViewGlobal]);

  // ─── Effects ──────────────────────────────────────────────────────────────

  // Overview tab: load on mount / when period changes
  useEffect(() => {
    if (!hydrated || loading || !user) return;
    if (activeTab === 'overview') {
      if (isAdminOrSuper && dashboardData === null) {
        fetchDashboard();
      }
      if (myStats === null) {
        fetchMyStats();
      }
    }
  }, [hydrated, loading, user, activeTab, isAdminOrSuper]);

  // Re-fetch dashboard when period changes (only on overview tab)
  useEffect(() => {
    if (!hydrated || loading || !user || !isAdminOrSuper) return;
    fetchDashboard();
  }, [selectedPeriod]);

  // Content tab: lazy load
  useEffect(() => {
    if (!hydrated || loading || !user) return;
    if (activeTab === 'content' && globalContentStats === null && !contentLoading) {
      fetchContentTab();
    }
  }, [activeTab, hydrated, loading, user]);

  // Orders tab: lazy load
  useEffect(() => {
    if (!hydrated || loading || !user) return;
    if (activeTab === 'orders' && globalOrderStats === null && !ordersLoading) {
      fetchOrdersTab();
    }
  }, [activeTab, hydrated, loading, user]);

  // ─── Derived chart data ───────────────────────────────────────────────────

  const myContentData = [
    { name: 'Photos', value: myStats?.content.photos || 0, color: CHART_COLORS[0] },
    { name: 'Videos', value: myStats?.content.videos || 0, color: CHART_COLORS[1] },
  ];

  const myOrderStatusData = [
    { name: 'Pending', value: myStats?.orders.pending_orders || 0, color: CHART_COLORS[3] },
    { name: 'Approved', value: myStats?.orders.approved_orders || 0, color: CHART_COLORS[1] },
    { name: 'Rejected', value: myStats?.orders.rejected_orders || 0, color: CHART_COLORS[2] },
  ];

  const contentChartData = [
    { name: 'Photos', value: globalContentStats?.photos || 0, color: CHART_COLORS[0] },
    { name: 'Videos', value: globalContentStats?.videos || 0, color: CHART_COLORS[1] },
  ];

  const orderStatusData = [
    { name: 'Pending', value: globalOrderStats?.pending_orders || 0, color: CHART_COLORS[3] },
    { name: 'Approved', value: globalOrderStats?.approved_orders || 0, color: CHART_COLORS[1] },
    { name: 'Rejected', value: globalOrderStats?.rejected_orders || 0, color: CHART_COLORS[2] },
  ];

  const athleteOrderChartData = athleteOrderStats.map((a) => ({
    name: a.athlete_name,
    orders: a.total_orders,
    items: a.total_items,
  }));

  const topProductsData = productStats.slice(0, 10).map((p) => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
    quantity: p.total_quantity,
    orders: p.order_count,
    fullName: p.name,
  }));

  const categoryData = productStats.reduce(
    (acc: Array<{ name: string; quantity: number; orders: number; color: string }>, product) => {
      const existing = acc.find((item) => item.name === product.category);
      if (existing) {
        existing.quantity += product.total_quantity;
        existing.orders += product.order_count;
      } else {
        acc.push({
          name: product.category,
          quantity: product.total_quantity,
          orders: product.order_count,
          color: CHART_COLORS[acc.length % CHART_COLORS.length],
        });
      }
      return acc;
    },
    [],
  );

  // ─── Tab button helper ────────────────────────────────────────────────────

  const tabClass = (tab: typeof activeTab) =>
    `py-2 px-1 border-b-2 font-medium text-sm ${
      activeTab === tab
        ? 'border-[hsl(var(--info))] text-[hsl(var(--info))]'
        : 'border-transparent text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--border))]'
    }`;

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (loading || !hydrated) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--info))] mx-auto" />
          <p className="mt-4 text-[hsl(var(--muted))]">Loading insights...</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* ── Page header ─────────────────────────────────────────────── */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">Insights</h1>
              <p className="mt-2 text-[hsl(var(--muted))]">
                Analytics, statistics and platform health at a glance
              </p>
            </div>

            {/* Period selector — only visible to admin/superadmin */}
            {isAdminOrSuper && activeTab === 'overview' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[hsl(var(--muted))]">Period:</span>
                <div className="flex rounded-lg overflow-hidden border border-[hsl(var(--border))]">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedPeriod(opt.value)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        selectedPeriod === opt.value
                          ? 'bg-[hsl(var(--info))] text-[hsl(var(--info-foreground,var(--foreground)))]'
                          : 'text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] bg-[hsl(var(--secondary))]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div className="mb-8">
            <div className="border-b border-[hsl(var(--border))]">
              <nav className="-mb-px flex space-x-8">
                <button onClick={() => setActiveTab('overview')} className={tabClass('overview')}>
                  Overview
                </button>
                {canViewGlobal && (
                  <>
                    <button onClick={() => setActiveTab('content')} className={tabClass('content')}>
                      Content Analytics
                    </button>
                    <button onClick={() => setActiveTab('orders')} className={tabClass('orders')}>
                      Order Analytics
                    </button>
                  </>
                )}
              </nav>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              TAB: OVERVIEW
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-8">

              {/* ── Admin / Superadmin KPI cards ────────────────────────── */}
              {isAdminOrSuper && (
                <div>
                  {dashboardError && (
                    <div
                      className="mb-4 rounded-lg p-4 flex items-center gap-3"
                      style={{
                        backgroundColor: 'hsl(var(--error) / 0.08)',
                        border: '1px solid hsl(var(--error) / 0.3)',
                      }}
                    >
                      <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: 'hsl(var(--error))' }} />
                      <p className="text-sm" style={{ color: 'hsl(var(--error))' }}>{dashboardError}</p>
                    </div>
                  )}

                  {dashboardLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[hsl(var(--info))]" />
                      <p className="ml-4 text-[hsl(var(--muted))]">Loading dashboard data…</p>
                    </div>
                  ) : (
                    <>
                      {/* KPI cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        {/* Total Users */}
                        <div
                          className="card p-6"
                          style={{ border: '1px solid hsl(var(--border))' }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[hsl(var(--muted))]">Total Users</p>
                              <p className="text-3xl font-bold text-[hsl(var(--foreground))] mt-1">
                                {dashboardData?.user_stats.total_users ?? '—'}
                              </p>
                            </div>
                            <div
                              className="rounded-full p-3"
                              style={{ backgroundColor: 'hsl(var(--info) / 0.1)' }}
                            >
                              <Users className="h-6 w-6" style={{ color: 'hsl(var(--info))' }} />
                            </div>
                          </div>
                          <p className="text-xs text-[hsl(var(--muted))] mt-2">
                            +{dashboardData?.user_stats.new_users ?? 0} in last {selectedPeriod}d
                          </p>
                        </div>

                        {/* Total Orders */}
                        <div
                          className="card p-6"
                          style={{ border: '1px solid hsl(var(--border))' }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[hsl(var(--muted))]">Total Orders</p>
                              <p className="text-3xl font-bold text-[hsl(var(--foreground))] mt-1">
                                {dashboardData?.order_stats.total_orders ?? '—'}
                              </p>
                            </div>
                            <div
                              className="rounded-full p-3"
                              style={{ backgroundColor: 'hsl(var(--success) / 0.1)' }}
                            >
                              <ShoppingCart className="h-6 w-6" style={{ color: 'hsl(var(--success))' }} />
                            </div>
                          </div>
                          <p className="text-xs text-[hsl(var(--muted))] mt-2">
                            {dashboardData?.order_stats.period_orders ?? 0} in last {selectedPeriod}d
                          </p>
                        </div>

                        {/* Total Content */}
                        <div
                          className="card p-6"
                          style={{ border: '1px solid hsl(var(--border))' }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[hsl(var(--muted))]">Total Content</p>
                              <p className="text-3xl font-bold text-[hsl(var(--foreground))] mt-1">
                                {dashboardData?.content_stats.total_content ?? '—'}
                              </p>
                            </div>
                            <div
                              className="rounded-full p-3"
                              style={{ backgroundColor: 'hsl(var(--warning) / 0.1)' }}
                            >
                              <FileImage className="h-6 w-6" style={{ color: 'hsl(var(--warning))' }} />
                            </div>
                          </div>
                          <p className="text-xs text-[hsl(var(--muted))] mt-2">
                            {dashboardData?.content_stats.period_content ?? 0} in last {selectedPeriod}d
                          </p>
                        </div>

                        {/* Total Products */}
                        <div
                          className="card p-6"
                          style={{ border: '1px solid hsl(var(--border))' }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[hsl(var(--muted))]">Total Products</p>
                              <p className="text-3xl font-bold text-[hsl(var(--foreground))] mt-1">
                                {dashboardData?.product_stats.total_products ?? '—'}
                              </p>
                            </div>
                            <div
                              className="rounded-full p-3"
                              style={{ backgroundColor: 'hsl(var(--muted) / 0.15)' }}
                            >
                              <Package className="h-6 w-6" style={{ color: 'hsl(var(--muted))' }} />
                            </div>
                          </div>
                          <p className="text-xs text-[hsl(var(--muted))] mt-2">
                            {dashboardData?.product_stats.active_products ?? 0} active
                          </p>
                        </div>
                      </div>

                      {/* System health row */}
                      {dashboardData?.system_health && (
                        <div className="card p-6 mb-2" style={{ border: '1px solid hsl(var(--border))' }}>
                          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" style={{ color: 'hsl(var(--info))' }} />
                            System Health
                          </h2>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3">
                              {dashboardData.system_health.database_healthy ? (
                                <CheckCircle className="h-5 w-5" style={{ color: 'hsl(var(--success))' }} />
                              ) : (
                                <AlertTriangle className="h-5 w-5" style={{ color: 'hsl(var(--error))' }} />
                              )}
                              <span className="text-sm text-[hsl(var(--foreground))]">
                                Database{' '}
                                <span
                                  style={{
                                    color: dashboardData.system_health.database_healthy
                                      ? 'hsl(var(--success))'
                                      : 'hsl(var(--error))',
                                  }}
                                >
                                  {dashboardData.system_health.database_healthy ? 'Healthy' : 'Degraded'}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {dashboardData.system_health.storage_healthy ? (
                                <CheckCircle className="h-5 w-5" style={{ color: 'hsl(var(--success))' }} />
                              ) : (
                                <AlertTriangle className="h-5 w-5" style={{ color: 'hsl(var(--error))' }} />
                              )}
                              <span className="text-sm text-[hsl(var(--foreground))]">
                                Storage{' '}
                                <span
                                  style={{
                                    color: dashboardData.system_health.storage_healthy
                                      ? 'hsl(var(--success))'
                                      : 'hsl(var(--error))',
                                  }}
                                >
                                  {dashboardData.system_health.storage_healthy ? 'Healthy' : 'Degraded'}
                                </span>
                              </span>
                            </div>
                            {dashboardData.system_health.uptime_hours != null && (
                              <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5" style={{ color: 'hsl(var(--info))' }} />
                                <span className="text-sm text-[hsl(var(--foreground))]">
                                  Uptime:{' '}
                                  <span style={{ color: 'hsl(var(--info))' }}>
                                    {dashboardData.system_health.uptime_hours}h
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Personal stats section (ALL roles) ──────────────────── */}
              <div>
                <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-6">
                  My Statistics
                </h2>

                {myStatsError && (
                  <div
                    className="mb-4 rounded-lg p-4 flex items-center gap-3"
                    style={{
                      backgroundColor: 'hsl(var(--error) / 0.08)',
                      border: '1px solid hsl(var(--error) / 0.3)',
                    }}
                  >
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: 'hsl(var(--error))' }} />
                    <p className="text-sm" style={{ color: 'hsl(var(--error))' }}>{myStatsError}</p>
                  </div>
                )}

                {myStatsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[hsl(var(--info))]" />
                    <p className="ml-4 text-[hsl(var(--muted))]">Loading your statistics…</p>
                  </div>
                ) : (
                  <>
                    {/* Content mini-cards */}
                    <div className="card mb-6">
                      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
                        Uploaded Content
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--info) / 0.08)' }}>
                          <div className="flex items-center">
                            <FileImage className="h-7 w-7" style={{ color: 'hsl(var(--info))' }} />
                            <div className="ml-3">
                              <p className="text-sm font-medium" style={{ color: 'hsl(var(--info))' }}>
                                Photos
                              </p>
                              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                {myStats?.content.photos || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--success) / 0.08)' }}>
                          <div className="flex items-center">
                            <Video className="h-7 w-7" style={{ color: 'hsl(var(--success))' }} />
                            <div className="ml-3">
                              <p className="text-sm font-medium" style={{ color: 'hsl(var(--success))' }}>
                                Videos
                              </p>
                              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                {myStats?.content.videos || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--muted) / 0.1)' }}>
                          <div className="flex items-center">
                            <Package className="h-7 w-7" style={{ color: 'hsl(var(--muted))' }} />
                            <div className="ml-3">
                              <p className="text-sm font-medium" style={{ color: 'hsl(var(--muted))' }}>
                                Total
                              </p>
                              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                {myStats?.content.total_content || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content distribution pie */}
                      <div className="max-w-sm mx-auto">
                        <h4 className="text-base font-medium text-[hsl(var(--foreground))] mb-3 text-center">
                          Content Distribution
                        </h4>
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie
                              data={myContentData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) =>
                                `${name} ${((percent || 0) * 100).toFixed(0)}%`
                              }
                              outerRadius={80}
                              fill={CHART_COLORS[3]}
                              dataKey="value"
                            >
                              {myContentData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Orders mini-cards */}
                    <div className="card">
                      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
                        Orders Made
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--warning) / 0.1)' }}>
                          <div className="flex items-center">
                            <Clock className="h-7 w-7" style={{ color: 'hsl(var(--warning))' }} />
                            <div className="ml-3">
                              <p className="text-sm font-medium" style={{ color: 'hsl(var(--warning))' }}>
                                Pending
                              </p>
                              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                {myStats?.orders.pending_orders || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--success) / 0.08)' }}>
                          <div className="flex items-center">
                            <CheckCircle className="h-7 w-7" style={{ color: 'hsl(var(--success))' }} />
                            <div className="ml-3">
                              <p className="text-sm font-medium" style={{ color: 'hsl(var(--success))' }}>
                                Approved
                              </p>
                              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                {myStats?.orders.approved_orders || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--error) / 0.08)' }}>
                          <div className="flex items-center">
                            <XCircle className="h-7 w-7" style={{ color: 'hsl(var(--error))' }} />
                            <div className="ml-3">
                              <p className="text-sm font-medium" style={{ color: 'hsl(var(--error))' }}>
                                Rejected
                              </p>
                              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                {myStats?.orders.rejected_orders || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--info) / 0.08)' }}>
                          <div className="flex items-center">
                            <ShoppingCart className="h-7 w-7" style={{ color: 'hsl(var(--info))' }} />
                            <div className="ml-3">
                              <p className="text-sm font-medium" style={{ color: 'hsl(var(--info))' }}>
                                Items
                              </p>
                              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                {myStats?.orders.total_items || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Order status pie */}
                        <div>
                          <h4 className="text-base font-medium text-[hsl(var(--foreground))] mb-3">
                            Order Status
                          </h4>
                          <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                              <Pie
                                data={myOrderStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) =>
                                  `${name} ${((percent || 0) * 100).toFixed(0)}%`
                                }
                                outerRadius={80}
                                fill={CHART_COLORS[3]}
                                dataKey="value"
                              >
                                {myOrderStatusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Activity summary */}
                        <div>
                          <h4 className="text-base font-medium text-[hsl(var(--foreground))] mb-3">
                            Activity Summary
                          </h4>
                          <div className="space-y-3">
                            {[
                              { label: 'Total Orders', value: myStats?.orders.total_orders || 0 },
                              { label: 'Items Requested', value: myStats?.orders.total_items || 0 },
                              { label: 'Total Content', value: myStats?.content.total_content || 0 },
                              {
                                label: 'Approval Rate',
                                value:
                                  myStats?.orders?.total_orders && myStats.orders.total_orders > 0
                                    ? `${((myStats.orders.approved_orders / myStats.orders.total_orders) * 100).toFixed(1)}%`
                                    : '0%',
                              },
                            ].map(({ label, value }) => (
                              <div
                                key={label}
                                className="rounded-lg p-4"
                                style={{
                                  backgroundColor: 'hsl(var(--secondary))',
                                  border: '1px solid hsl(var(--border))',
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-[hsl(var(--muted))]">
                                    {label}
                                  </span>
                                  <span className="text-lg font-bold text-[hsl(var(--foreground))]">
                                    {value}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: CONTENT ANALYTICS
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'content' && (
            <div className="space-y-8">
              {contentError && (
                <div
                  className="rounded-lg p-4 flex items-center gap-3"
                  style={{
                    backgroundColor: 'hsl(var(--error) / 0.08)',
                    border: '1px solid hsl(var(--error) / 0.3)',
                  }}
                >
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: 'hsl(var(--error))' }} />
                  <p className="text-sm" style={{ color: 'hsl(var(--error))' }}>{contentError}</p>
                </div>
              )}

              {contentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--info))]" />
                  <p className="ml-4 text-[hsl(var(--muted))]">Loading content analytics…</p>
                </div>
              ) : (
                <div className="card">
                  <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-6">
                    Global Content Statistics
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--info) / 0.08)' }}>
                      <div className="flex items-center">
                        <FileImage className="h-8 w-8" style={{ color: 'hsl(var(--info))' }} />
                        <div className="ml-4">
                          <p className="text-sm font-medium" style={{ color: 'hsl(var(--info))' }}>
                            Total Photos
                          </p>
                          <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                            {globalContentStats?.photos || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--success) / 0.08)' }}>
                      <div className="flex items-center">
                        <Video className="h-8 w-8" style={{ color: 'hsl(var(--success))' }} />
                        <div className="ml-4">
                          <p className="text-sm font-medium" style={{ color: 'hsl(var(--success))' }}>
                            Total Videos
                          </p>
                          <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                            {globalContentStats?.videos || 0}
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
                            {globalContentStats?.total_content || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    {/* Pie chart */}
                    <div className="relative z-0">
                      <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-4">
                        Content Distribution
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={contentChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                            }
                            outerRadius={80}
                            fill={CHART_COLORS[4]}
                            dataKey="value"
                          >
                            {contentChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Per-athlete table */}
                    <div className="relative z-10">
                      <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-4">
                        Content by Athlete
                      </h3>
                      {athleteContentStats.length === 0 ? (
                        <div className="text-center py-8 text-[hsl(var(--muted))]">
                          No athlete content yet
                        </div>
                      ) : (
                        <>
                          <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2">
                            <input
                              type="text"
                              placeholder="Search athlete by name or email…"
                              value={athleteSearch}
                              onChange={(e) => {
                                setAthleteSearch(e.target.value);
                                setVisibleAthletes(12);
                              }}
                              className="input sm:max-w-sm"
                            />
                            <span className="text-xs text-[hsl(var(--muted))]">
                              {athleteContentStats.length} athletes
                            </span>
                          </div>
                          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {athleteContentStats
                              .slice()
                              .filter((a) => {
                                if (!athleteSearch.trim()) return true;
                                const q = athleteSearch.toLowerCase();
                                return (
                                  a.athlete_name.toLowerCase().includes(q) ||
                                  a.athlete_email.toLowerCase().includes(q)
                                );
                              })
                              .sort((a, b) => (b.total_content || 0) - (a.total_content || 0))
                              .slice(0, visibleAthletes)
                              .map((athlete) => (
                                <div
                                  key={athlete.athlete_id}
                                  className="relative z-10 card p-4 pt-7 flex flex-col min-h-[132px] hover:shadow-md transition-shadow overflow-hidden"
                                >
                                  <div className="absolute top-3 right-3 z-20">
                                    <span
                                      className="badge"
                                      style={{
                                        backgroundColor: 'hsl(var(--border))',
                                        color: 'hsl(var(--foreground))',
                                      }}
                                    >
                                      Total {athlete.total_content}
                                    </span>
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                    <div className="w-full">
                                      <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
                                        {athlete.athlete_name}
                                      </h4>
                                      <p className="text-xs text-[hsl(var(--muted))] break-words whitespace-normal">
                                        {athlete.athlete_email}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-3 grid grid-cols-2 gap-3">
                                    <div
                                      className="rounded-md p-3 flex items-center"
                                      style={{ backgroundColor: 'hsl(var(--info) / 0.08)' }}
                                    >
                                      <FileImage
                                        className="h-5 w-5"
                                        style={{ color: 'hsl(var(--info))' }}
                                      />
                                      <div className="ml-3">
                                        <div
                                          className="text-[11px] font-medium leading-3"
                                          style={{ color: 'hsl(var(--info))' }}
                                        >
                                          Photos
                                        </div>
                                        <div
                                          className="text-base font-semibold"
                                          style={{ color: 'hsl(var(--foreground))' }}
                                        >
                                          {athlete.photos}
                                        </div>
                                      </div>
                                    </div>
                                    <div
                                      className="rounded-md p-3 flex items-center"
                                      style={{ backgroundColor: 'hsl(var(--success) / 0.08)' }}
                                    >
                                      <Video
                                        className="h-5 w-5"
                                        style={{ color: 'hsl(var(--success))' }}
                                      />
                                      <div className="ml-3">
                                        <div
                                          className="text-[11px] font-medium leading-3"
                                          style={{ color: 'hsl(var(--success))' }}
                                        >
                                          Videos
                                        </div>
                                        <div
                                          className="text-base font-semibold"
                                          style={{ color: 'hsl(var(--foreground))' }}
                                        >
                                          {athlete.videos}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                          {athleteContentStats
                            .filter((a) => {
                              if (!athleteSearch.trim()) return true;
                              const q = athleteSearch.toLowerCase();
                              return (
                                a.athlete_name.toLowerCase().includes(q) ||
                                a.athlete_email.toLowerCase().includes(q)
                              );
                            })
                            .length > visibleAthletes && (
                            <div className="mt-4 text-center">
                              <button
                                onClick={() => setVisibleAthletes((v) => v + 12)}
                                className="btn text-sm"
                              >
                                Load more
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: ORDER ANALYTICS
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'orders' && (
            <div className="space-y-8">
              {ordersError && (
                <div
                  className="rounded-lg p-4 flex items-center gap-3"
                  style={{
                    backgroundColor: 'hsl(var(--error) / 0.08)',
                    border: '1px solid hsl(var(--error) / 0.3)',
                  }}
                >
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: 'hsl(var(--error))' }} />
                  <p className="text-sm" style={{ color: 'hsl(var(--error))' }}>{ordersError}</p>
                </div>
              )}

              {ordersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--info))]" />
                  <p className="ml-4 text-[hsl(var(--muted))]">Loading order analytics…</p>
                </div>
              ) : (
                <>
                  {/* ── Global order stats ───────────────────────────────── */}
                  <div className="card">
                    <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-6">
                      Global Order Statistics
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                      <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--warning) / 0.1)' }}>
                        <div className="flex items-center">
                          <Clock className="h-8 w-8" style={{ color: 'hsl(var(--warning))' }} />
                          <div className="ml-4">
                            <p className="text-sm font-medium" style={{ color: 'hsl(var(--warning))' }}>
                              Pending
                            </p>
                            <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                              {globalOrderStats?.pending_orders || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--success) / 0.08)' }}>
                        <div className="flex items-center">
                          <CheckCircle className="h-8 w-8" style={{ color: 'hsl(var(--success))' }} />
                          <div className="ml-4">
                            <p className="text-sm font-medium" style={{ color: 'hsl(var(--success))' }}>
                              Approved
                            </p>
                            <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                              {globalOrderStats?.approved_orders || 0}
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
                              {globalOrderStats?.rejected_orders || 0}
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
                              {globalOrderStats?.total_items || 0}
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
                              label={({ name, percent }) =>
                                `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                              }
                              outerRadius={80}
                              fill={CHART_COLORS[4]}
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
                          Orders by Athlete
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={athleteOrderChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="name"
                              angle={-45}
                              textAnchor="end"
                              height={100}
                              stroke="hsl(var(--muted))"
                              tick={{ fill: 'hsl(var(--muted))' }}
                            />
                            <YAxis stroke="hsl(var(--muted))" tick={{ fill: 'hsl(var(--muted))' }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="orders" fill={CHART_COLORS[4]} name="Orders" />
                            <Bar dataKey="items" fill={CHART_COLORS[1]} name="Items" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* ── Products section ─────────────────────────────────── */}
                  <div className="card">
                    <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-6">
                      Most Requested Products
                    </h2>

                    {productStats.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="h-12 w-12 text-[hsl(var(--muted))] mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-2">
                          No Product Data
                        </h3>
                        <p className="text-[hsl(var(--muted))]">No products have been ordered yet.</p>
                      </div>
                    ) : (
                      <>
                        {/* Products by quantity pie */}
                        <div className="mb-8">
                          <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-4">
                            Products by Quantity
                          </h3>
                          <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                              <Pie
                                data={topProductsData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) =>
                                  `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                                }
                                outerRadius={120}
                                fill={CHART_COLORS[4]}
                                dataKey="quantity"
                              >
                                {topProductsData.map((_entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value, _name) => [value, 'Quantity']}
                                labelFormatter={(label, payload) => {
                                  if (payload && payload[0] && payload[0].payload) {
                                    return payload[0].payload.fullName;
                                  }
                                  return label;
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Products by category */}
                        <div className="mt-8">
                          <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-4">
                            Products by Category
                          </h3>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                              <h4 className="text-md font-medium text-[hsl(var(--muted))] mb-4">
                                Quantity by Category
                              </h4>
                              <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                  <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) =>
                                      `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                                    }
                                    outerRadius={80}
                                    fill={CHART_COLORS[4]}
                                    dataKey="quantity"
                                  >
                                    {categoryData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value, _name) => [value, 'Quantity']} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div>
                              <h4 className="text-md font-medium text-[hsl(var(--muted))] mb-4">
                                Orders by Category
                              </h4>
                              <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                  <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) =>
                                      `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                                    }
                                    outerRadius={80}
                                    fill={CHART_COLORS[4]}
                                    dataKey="orders"
                                  >
                                    {categoryData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value, _name) => [value, 'Orders']} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>

                        {/* Products received by athletes */}
                        <div className="mt-8">
                          <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-6">
                            Products Received by Athletes
                          </h3>

                          {athleteProductStats.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                              <div
                                className="rounded-lg shadow p-6 text-center"
                                style={{
                                  backgroundColor: 'hsl(var(--secondary))',
                                  border: '1px solid hsl(var(--border))',
                                }}
                              >
                                <div className="flex items-center justify-center mb-2">
                                  <Users className="w-6 h-6 mr-2" style={{ color: 'hsl(var(--info))' }} />
                                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--info))' }}>
                                    ATHLETES
                                  </span>
                                </div>
                                <div className="text-3xl font-bold text-[hsl(var(--foreground))]">
                                  {athleteProductStats.length}
                                </div>
                                <div className="text-xs" style={{ color: 'hsl(var(--info))' }}>
                                  with products
                                </div>
                              </div>

                              <div
                                className="rounded-lg shadow p-6 text-center"
                                style={{
                                  backgroundColor: 'hsl(var(--secondary))',
                                  border: '1px solid hsl(var(--border))',
                                }}
                              >
                                <div className="flex items-center justify-center mb-2">
                                  <svg
                                    className="w-6 h-6 mr-2"
                                    style={{ color: 'hsl(var(--success))' }}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--success))' }}>
                                    TOTAL SKIS
                                  </span>
                                </div>
                                <div className="text-3xl font-bold text-[hsl(var(--foreground))]">
                                  {athleteProductStats.reduce(
                                    (sum, athlete) =>
                                      sum +
                                      athlete.products
                                        .filter((p) => p.category === 'skis')
                                        .reduce((s, p) => s + p.quantity, 0),
                                    0,
                                  )}
                                </div>
                                <div className="text-xs" style={{ color: 'hsl(var(--success))' }}>
                                  units delivered
                                </div>
                              </div>

                              <div
                                className="rounded-lg shadow p-6 text-center"
                                style={{
                                  backgroundColor: 'hsl(var(--secondary))',
                                  border: '1px solid hsl(var(--border))',
                                }}
                              >
                                <div className="flex items-center justify-center mb-2">
                                  <svg
                                    className="w-6 h-6 mr-2"
                                    style={{ color: 'hsl(var(--muted))' }}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                  </svg>
                                  <span className="text-sm font-medium text-[hsl(var(--muted))]">
                                    TOTAL BINDINGS
                                  </span>
                                </div>
                                <div className="text-3xl font-bold text-[hsl(var(--foreground))]">
                                  {athleteProductStats.reduce(
                                    (sum, athlete) =>
                                      sum +
                                      athlete.products
                                        .filter((p) => p.category === 'bindings')
                                        .reduce((s, p) => s + p.quantity, 0),
                                    0,
                                  )}
                                </div>
                                <div className="text-xs text-[hsl(var(--muted))]">units delivered</div>
                              </div>
                            </div>
                          )}

                          {athleteProductStats.length === 0 ? (
                            <div className="text-center py-8">
                              <Package className="h-12 w-12 text-[hsl(var(--muted))] mx-auto mb-4" />
                              <h4 className="text-lg font-medium text-[hsl(var(--foreground))] mb-2">
                                No Products Delivered
                              </h4>
                              <p className="text-[hsl(var(--muted))]">
                                No athletes have received products from approved orders yet.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {athleteProductStats.map((athlete) => (
                                <div
                                  key={athlete.athlete_id}
                                  className="rounded-lg p-6"
                                  style={{
                                    backgroundColor: 'hsl(var(--secondary))',
                                    border: '1px solid hsl(var(--border))',
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                                      {athlete.athlete_name}
                                    </h4>
                                    <div className="flex space-x-4 text-sm text-[hsl(var(--muted))]">
                                      <span>Products: {athlete.total_products}</span>
                                      <span>Total Quantity: {athlete.total_quantity}</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div
                                      className="rounded-lg p-4 text-center"
                                      style={{ backgroundColor: 'hsl(var(--info) / 0.08)' }}
                                    >
                                      <div className="flex items-center justify-center mb-2">
                                        <svg
                                          className="w-6 h-6 mr-2"
                                          style={{ color: 'hsl(var(--info))' }}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                          />
                                        </svg>
                                        <span className="text-sm font-medium" style={{ color: 'hsl(var(--info))' }}>
                                          SKIS
                                        </span>
                                      </div>
                                      <div className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                        {athlete.products
                                          .filter((p) => p.category === 'skis')
                                          .reduce((s, p) => s + p.quantity, 0)}
                                      </div>
                                      <div className="text-xs" style={{ color: 'hsl(var(--info))' }}>
                                        {athlete.products.filter((p) => p.category === 'skis').length} products
                                      </div>
                                    </div>

                                    <div
                                      className="rounded-lg p-4 text-center"
                                      style={{ backgroundColor: 'hsl(var(--success) / 0.08)' }}
                                    >
                                      <div className="flex items-center justify-center mb-2">
                                        <svg
                                          className="w-6 h-6 mr-2"
                                          style={{ color: 'hsl(var(--success))' }}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 10V3L4 14h7v7l9-11h-7z"
                                          />
                                        </svg>
                                        <span className="text-sm font-medium" style={{ color: 'hsl(var(--success))' }}>
                                          BINDINGS
                                        </span>
                                      </div>
                                      <div className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                        {athlete.products
                                          .filter((p) => p.category === 'bindings')
                                          .reduce((s, p) => s + p.quantity, 0)}
                                      </div>
                                      <div className="text-xs" style={{ color: 'hsl(var(--success))' }}>
                                        {athlete.products.filter((p) => p.category === 'bindings').length} products
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div>
                                      <h5 className="text-md font-medium text-[hsl(var(--muted))] mb-3">
                                        Products by Category
                                      </h5>
                                      <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                          <Pie
                                            data={athlete.products.reduce(
                                              (acc, product) => {
                                                const existing = acc.find(
                                                  (item) => item.name === product.category,
                                                );
                                                if (existing) {
                                                  existing.quantity += product.quantity;
                                                } else {
                                                  acc.push({
                                                    name: product.category,
                                                    quantity: product.quantity,
                                                    color: CHART_COLORS[acc.length % CHART_COLORS.length],
                                                  });
                                                }
                                                return acc;
                                              },
                                              [] as Array<{ name: string; quantity: number; color: string }>,
                                            )}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) =>
                                              `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                                            }
                                            outerRadius={60}
                                            fill={CHART_COLORS[4]}
                                            dataKey="quantity"
                                          >
                                            {athlete.products
                                              .reduce(
                                                (acc, product) => {
                                                  const existing = acc.find(
                                                    (item) => item.name === product.category,
                                                  );
                                                  if (existing) {
                                                    existing.quantity += product.quantity;
                                                  } else {
                                                    acc.push({
                                                      name: product.category,
                                                      quantity: product.quantity,
                                                      color: CHART_COLORS[acc.length % CHART_COLORS.length],
                                                    });
                                                  }
                                                  return acc;
                                                },
                                                [] as Array<{ name: string; quantity: number; color: string }>,
                                              )
                                              .map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                              ))}
                                          </Pie>
                                          <Tooltip formatter={(value, _name) => [value, 'Quantity']} />
                                        </PieChart>
                                      </ResponsiveContainer>
                                    </div>

                                    <div>
                                      <h5 className="text-md font-medium text-[hsl(var(--muted))] mb-3">
                                        Product Details
                                      </h5>
                                      <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {athlete.products.map((product, index) => (
                                          <div
                                            key={index}
                                            className="flex justify-between items-center rounded p-2 text-sm"
                                            style={{
                                              backgroundColor: 'hsl(var(--background))',
                                              border: '1px solid hsl(var(--border))',
                                            }}
                                          >
                                            <div>
                                              <span className="font-medium text-[hsl(var(--foreground))]">
                                                {product.name}
                                              </span>
                                              <span className="text-[hsl(var(--muted))] ml-2">
                                                ({product.category})
                                              </span>
                                            </div>
                                            <span className="font-semibold" style={{ color: 'hsl(var(--info))' }}>
                                              {product.quantity}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Product details table */}
                        <div className="mt-8">
                          <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-4">
                            Product Details
                          </h3>
                          <div className="overflow-x-auto">
                            <table
                              className="min-w-full divide-y"
                              style={{ borderColor: 'hsl(var(--border))' }}
                            >
                              <thead style={{ backgroundColor: 'hsl(var(--secondary))' }}>
                                <tr>
                                  {['Product', 'Category', 'SKU', 'Total Quantity', 'Number of Orders'].map(
                                    (col) => (
                                      <th
                                        key={col}
                                        className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider"
                                      >
                                        {col}
                                      </th>
                                    ),
                                  )}
                                </tr>
                              </thead>
                              <tbody
                                className="divide-y"
                                style={{
                                  backgroundColor: 'hsl(var(--secondary))',
                                  borderColor: 'hsl(var(--border))',
                                }}
                              >
                                {productStats.slice(0, 20).map((product, index) => (
                                  <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[hsl(var(--foreground))]">
                                      {product.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--muted))]">
                                      {product.category}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--muted))]">
                                      {product.sku}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--muted))]">
                                      {product.total_quantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--muted))]">
                                      {product.order_count}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
