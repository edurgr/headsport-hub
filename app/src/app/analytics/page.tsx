'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  CheckCircle,
  Clock,
  FileImage,
  Package,
  ShoppingCart,
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

import { useAuth } from '@/contexts/AuthContext';

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
  products: Array<{
    name: string;
    category: string;
    sku: string;
    quantity: number;
  }>;
  total_products: number;
  total_quantity: number;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function AnalyticsPage() {
  const { user, profile, loading, hydrated } = useAuth();
  const [activeTab, setActiveTab] = useState<'content' | 'orders' | 'products'>('content');
  const [globalContentStats, setGlobalContentStats] = useState<ContentStats | null>(null);
  const [globalOrderStats, setGlobalOrderStats] = useState<OrderStats | null>(null);
  const [athleteContentStats, setAthleteContentStats] = useState<AthleteContentStats[]>([]);
  const [athleteOrderStats, setAthleteOrderStats] = useState<AthleteOrderStats[]>([]);
  const [productStats, setProductStats] = useState<ProductStats[]>([]);
  const [athleteProductStats, setAthleteProductStats] = useState<AthleteProductStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [visibleAthletes, setVisibleAthletes] = useState(12);

  const fetchAllStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      await Promise.all([
        fetchGlobalContentStats(),
        fetchGlobalOrderStats(),
        fetchAthleteContentStats(),
        fetchAthleteOrderStats(),
        fetchProductStats(),
        fetchAthleteProductStats(),
      ]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated && user) {
      fetchAllStats();
    }
  }, [user, hydrated, fetchAllStats]);

  const fetchGlobalContentStats = async () => {
    try {
      const response = await fetch('/api/analytics/content-simple?group_by=global', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (data.success) {
        setGlobalContentStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching global content stats:', error);
    }
  };

  const fetchGlobalOrderStats = async () => {
    try {
      const response = await fetch('/api/analytics/orders-simple?group_by=global', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (data.success) {
        setGlobalOrderStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching global order stats:', error);
    }
  };

  const fetchAthleteContentStats = async () => {
    try {
      const response = await fetch('/api/analytics/content-simple?group_by=athlete', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (data.success) {
        setAthleteContentStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching athlete content stats:', error);
    }
  };

  const fetchAthleteOrderStats = async () => {
    try {
      const response = await fetch('/api/analytics/orders-simple?group_by=athlete', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (data.success) {
        setAthleteOrderStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching athlete order stats:', error);
    }
  };

  const fetchProductStats = async () => {
    try {
      const response = await fetch('/api/analytics/orders-simple?group_by=products', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (data.success) {
        setProductStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching product stats:', error);
    }
  };

  const fetchAthleteProductStats = async () => {
    try {
      const response = await fetch('/api/analytics/athlete-products', { cache: 'no-store' });
      const data = await response.json();
      if (data.success) {
        setAthleteProductStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching athlete product stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--info))] mx-auto"></div>
          <p className="mt-4 text-[hsl(var(--muted))]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!user || (profile && !['admin', 'manager'].includes(profile.role))) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">Access Denied</h1>
          <p className="text-[hsl(var(--muted))]">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const contentChartData = [
    { name: 'Photos', value: globalContentStats?.photos || 0, color: CHART_COLORS[0] },
    { name: 'Videos', value: globalContentStats?.videos || 0, color: CHART_COLORS[1] },
  ];

  const orderStatusData = [
    { name: 'Pending', value: globalOrderStats?.pending_orders || 0, color: CHART_COLORS[3] },
    { name: 'Approved', value: globalOrderStats?.approved_orders || 0, color: CHART_COLORS[1] },
    { name: 'Rejected', value: globalOrderStats?.rejected_orders || 0, color: CHART_COLORS[2] },
  ];

  const athleteContentChartData = athleteContentStats.map(athlete => ({
    name: athlete.athlete_name,
    photos: athlete.photos,
    videos: athlete.videos,
    total: athlete.total_content,
  }));

  const athleteOrderChartData = athleteOrderStats.map(athlete => ({
    name: athlete.athlete_name,
    orders: athlete.total_orders,
    items: athlete.total_items,
  }));

  const topProductsData = productStats.slice(0, 10).map(product => ({
    name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
    quantity: product.total_quantity,
    orders: product.order_count,
    fullName: product.name,
  }));

  // Group products by category for pie chart
  const categoryData = productStats.reduce(
    (acc: Array<{ name: string; quantity: number; orders: number; color: string }>, product) => {
      const existing = acc.find(item => item.name === product.category);
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
    []
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">System Analytics</h1>
          <p className="mt-2 text-[hsl(var(--muted))]">
            Data visualization for athlete content and orders
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-[hsl(var(--border))]">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('content')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'content'
                    ? 'border-[hsl(var(--info))] text-[hsl(var(--info))]'
                    : 'border-transparent text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--border))]'
                }`}
              >
                Content
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-[hsl(var(--info))] text-[hsl(var(--info))]'
                    : 'border-transparent text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--border))]'
                }`}
              >
                Orders
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'products'
                    ? 'border-[hsl(var(--info))] text-[hsl(var(--info))]'
                    : 'border-transparent text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--border))]'
                }`}
              >
                Products
              </button>
            </nav>
          </div>
        </div>

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-8">
            {/* Global Content Stats */}
            <div className="card">
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-6">
                Global Content Statistics
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: 'hsl(var(--info) / 0.08)' }}
                >
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

                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: 'hsl(var(--success) / 0.08)' }}
                >
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

                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: 'hsl(var(--muted) / 0.1)' }}
                >
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
                          placeholder="Search athlete by name or email..."
                          value={athleteSearch}
                          onChange={e => {
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
                          .filter(a => {
                            if (!athleteSearch.trim()) return true;
                            const q = athleteSearch.toLowerCase();
                            return (
                              a.athlete_name.toLowerCase().includes(q) ||
                              a.athlete_email.toLowerCase().includes(q)
                            );
                          })
                          .sort((a, b) => (b.total_content || 0) - (a.total_content || 0))
                          .slice(0, visibleAthletes)
                          .map(athlete => (
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
                      {athleteContentStats.filter(a => {
                        if (!athleteSearch.trim()) return true;
                        const q = athleteSearch.toLowerCase();
                        return (
                          a.athlete_name.toLowerCase().includes(q) ||
                          a.athlete_email.toLowerCase().includes(q)
                        );
                      }).length > visibleAthletes && (
                        <div className="mt-4 text-center">
                          <button
                            onClick={() => setVisibleAthletes(v => v + 12)}
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
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-8">
            {/* Global Order Stats */}
            <div className="card">
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-6">
                Global Order Statistics
              </h2>

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
                        {globalOrderStats?.pending_orders || 0}
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
                        {globalOrderStats?.approved_orders || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: 'hsl(var(--error) / 0.08)' }}
                >
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

                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: 'hsl(var(--info) / 0.08)' }}
                >
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
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-8">
            <div className="card">
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-6">
                Most Requested Products
              </h2>

              {loadingStats ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--info))]"></div>
                  <p className="ml-4 text-[hsl(var(--muted))]">Loading product data...</p>
                </div>
              ) : productStats.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-[hsl(var(--muted))] mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-2">
                    No Product Data
                  </h3>
                  <p className="text-[hsl(var(--muted))]">No products have been ordered yet.</p>
                </div>
              ) : (
                <>
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
                          {topProductsData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [value, 'Quantity']}
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
                            <Tooltip formatter={(value, name) => [value, 'Quantity']} />
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
                            <Tooltip formatter={(value, name) => [value, 'Orders']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-6">
                      Products Received by Athletes
                    </h3>

                    {/* Overall Summary Counters */}
                    {athleteProductStats.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow p-6 text-center">
                          <div className="flex items-center justify-center mb-2">
                            <Users className="w-6 h-6 mr-2" style={{ color: 'hsl(var(--info))' }} />
                            <span
                              className="text-sm font-medium"
                              style={{ color: 'hsl(var(--info))' }}
                            >
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

                        <div className="bg-white rounded-lg shadow p-6 text-center">
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
                            <span
                              className="text-sm font-medium"
                              style={{ color: 'hsl(var(--success))' }}
                            >
                              TOTAL SKIS
                            </span>
                          </div>
                          <div className="text-3xl font-bold text-[hsl(var(--foreground))]">
                            {athleteProductStats.reduce(
                              (sum, athlete) =>
                                sum +
                                athlete.products
                                  .filter(product => product.category === 'skis')
                                  .reduce(
                                    (productSum, product) => productSum + product.quantity,
                                    0
                                  ),
                              0
                            )}
                          </div>
                          <div className="text-xs" style={{ color: 'hsl(var(--success))' }}>
                            units delivered
                          </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6 text-center">
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
                                  .filter(product => product.category === 'bindings')
                                  .reduce(
                                    (productSum, product) => productSum + product.quantity,
                                    0
                                  ),
                              0
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
                        {athleteProductStats.map(athlete => (
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

                            {/* Category Counters */}
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
                                  <span
                                    className="text-sm font-medium"
                                    style={{ color: 'hsl(var(--info))' }}
                                  >
                                    SKIS
                                  </span>
                                </div>
                                <div
                                  className="text-2xl font-bold"
                                  style={{ color: 'hsl(var(--foreground))' }}
                                >
                                  {athlete.products
                                    .filter(product => product.category === 'skis')
                                    .reduce((sum, product) => sum + product.quantity, 0)}
                                </div>
                                <div className="text-xs" style={{ color: 'hsl(var(--info))' }}>
                                  {
                                    athlete.products.filter(product => product.category === 'skis')
                                      .length
                                  }{' '}
                                  products
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
                                  <span
                                    className="text-sm font-medium"
                                    style={{ color: 'hsl(var(--success))' }}
                                  >
                                    BINDINGS
                                  </span>
                                </div>
                                <div
                                  className="text-2xl font-bold"
                                  style={{ color: 'hsl(var(--foreground))' }}
                                >
                                  {athlete.products
                                    .filter(product => product.category === 'bindings')
                                    .reduce((sum, product) => sum + product.quantity, 0)}
                                </div>
                                <div className="text-xs" style={{ color: 'hsl(var(--success))' }}>
                                  {
                                    athlete.products.filter(
                                      product => product.category === 'bindings'
                                    ).length
                                  }{' '}
                                  products
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
                                            item => item.name === product.category
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
                                        [] as Array<{
                                          name: string;
                                          quantity: number;
                                          color: string;
                                        }>
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
                                              item => item.name === product.category
                                            );
                                            if (existing) {
                                              existing.quantity += product.quantity;
                                            } else {
                                              acc.push({
                                                name: product.category,
                                                quantity: product.quantity,
                                                color:
                                                  CHART_COLORS[acc.length % CHART_COLORS.length],
                                              });
                                            }
                                            return acc;
                                          },
                                          [] as Array<{
                                            name: string;
                                            quantity: number;
                                            color: string;
                                          }>
                                        )
                                        .map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [value, 'Quantity']} />
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
                                      className="flex justify-between items-center bg-white rounded p-2 text-sm"
                                    >
                                      <div>
                                        <span className="font-medium text-[hsl(var(--foreground))]">
                                          {product.name}
                                        </span>
                                        <span className="text-[hsl(var(--muted))] ml-2">
                                          ({product.category})
                                        </span>
                                      </div>
                                      <span
                                        className="font-semibold"
                                        style={{ color: 'hsl(var(--info))' }}
                                      >
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                              Product
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                              SKU
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                              Total Quantity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                              Number of Orders
                            </th>
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
          </div>
        )}
      </div>
    </div>
  );
}
