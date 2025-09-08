'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  Users, 
  ShoppingCart, 
  FileImage, 
  Package, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';

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
  recent_activity: {
    recent_orders: any[];
    recent_users: any[];
    recent_content: any[];
  };
  system_health: {
    database_healthy: boolean;
    storage_healthy: boolean;
    uptime_hours: number;
  };
  backup_stats: {
    total_backups: number;
    successful_backups: number;
    failed_backups: number;
    last_backup_date?: string;
  };
  notification_stats: {
    unread_count: number;
    recent_notifications: any[];
  };
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { authenticatedFetch } = useAuthenticatedFetch();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchDashboardData();
    }
  }, [profile, selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`/api/admin/dashboard?period=${selectedPeriod}`);
      const data = await response.json();
      
      if (response.ok) {
        setDashboardData(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      setError('Error fetching dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'blue',
    subtitle,
    trend
  }: {
    title: string;
    value: string | number;
    icon: any;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
    subtitle?: string;
    trend?: { value: number; isPositive: boolean };
  }) => {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[hsl(var(--muted))]">{title}</p>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{value}</p>
            {subtitle && (
              <p className="text-sm text-[hsl(var(--muted))] mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center mt-2 text-sm" style={{ color: trend.isPositive ? 'hsl(var(--success))' : 'hsl(var(--error))' }}>
                <TrendingUp className={`w-4 h-4 mr-1 ${
                  trend.isPositive ? '' : 'rotate-180'
                }`} />
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          <div className="p-3 rounded-full" style={{ backgroundColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  };

  const HealthIndicator = ({ 
    healthy, 
    label 
  }: { 
    healthy: boolean; 
    label: string; 
  }) => (
    <div className="flex items-center space-x-2">
      {healthy ? (
        <CheckCircle className="w-5 h-5" style={{ color: 'hsl(var(--success))' }} />
      ) : (
        <AlertTriangle className="w-5 h-5" style={{ color: 'hsl(var(--error))' }} />
      )}
      <span className="text-sm" style={{ color: healthy ? 'hsl(var(--success))' : 'hsl(var(--error))' }}>
        {label}
      </span>
    </div>
  );

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="alert alert-error text-center">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">Access Denied</h1>
          <p>Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'hsl(var(--info))' }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="alert alert-error text-center">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  return (
    <ProtectedRoute requiredRole={['admin']}>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">Admin Dashboard</h1>
              <p className="text-[hsl(var(--muted))]">Overview of your HEAD-Hub system</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="input px-3 py-2"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <button
                onClick={() => window.open('/admin/audit-logs', '_blank')}
                className="btn px-4 py-2"
              >
                View All Logs
              </button>
              <button
                onClick={fetchDashboardData}
                className="btn px-4 py-2"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="mb-8">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">System Health</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <HealthIndicator 
                healthy={dashboardData.system_health.database_healthy} 
                label="Database" 
              />
              <HealthIndicator 
                healthy={dashboardData.system_health.storage_healthy} 
                label="Storage" 
              />
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5" style={{ color: 'hsl(var(--info))' }} />
                <span className="text-sm text-[hsl(var(--muted))]">
                  Uptime: {dashboardData.system_health.uptime_hours.toFixed(1)}h
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={dashboardData.user_stats.total_users}
            icon={Users}
            color="blue"
            subtitle={`${dashboardData.user_stats.new_users} new in ${selectedPeriod}d`}
          />
          <StatCard
            title="Total Orders"
            value={dashboardData.order_stats.total_orders}
            icon={ShoppingCart}
            color="green"
            subtitle={`${dashboardData.order_stats.period_orders} in ${selectedPeriod}d`}
          />
          <StatCard
            title="Total Content"
            value={dashboardData.content_stats.total_content}
            icon={FileImage}
            color="purple"
            subtitle={`${dashboardData.content_stats.total_storage_mb} MB used`}
          />
          <StatCard
            title="Total Products"
            value={dashboardData.product_stats.total_products}
            icon={Package}
            color="indigo"
            subtitle={`${dashboardData.product_stats.active_products} active`}
          />
        </div>

        {/* Orders Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Order Status</h2>
            <div className="space-y-3">
              {Object.entries(dashboardData.order_stats.orders_by_status).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--muted))] capitalize">
                    {status.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Distribution and Content Types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">User Distribution</h2>
            <div className="space-y-3">
              {Object.entries(dashboardData.user_stats.users_by_role).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--muted))] capitalize">{role}s</span>
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Content Types</h2>
            <div className="space-y-3">
              {Object.entries(dashboardData.content_stats.content_by_type).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--muted))] capitalize">{type}s</span>
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Recent Orders</h2>
            <div className="space-y-3">
              {dashboardData.recent_activity.recent_orders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {order.user_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted))] capitalize">
                      {order.status}
                    </p>
                  </div>
                  <span className="text-xs text-[hsl(var(--muted))]">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Recent Users</h2>
            <div className="space-y-3">
              {dashboardData.recent_activity.recent_users.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {user.name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted))] capitalize">{user.role}</p>
                  </div>
                  <span className="text-xs text-[hsl(var(--muted))]">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Recent Content</h2>
            <div className="space-y-3">
              {dashboardData.recent_activity.recent_content.map((content: any) => (
                <div key={content.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate" title={content.filename}>
                      {content.filename.length > 25 ? `${content.filename.substring(0, 25)}...` : content.filename}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted))] capitalize">
                      {content.file_type} • {content.upload_sessions?.profiles?.name || 'Unknown User'}
                    </p>
                  </div>
                  <span className="text-xs text-[hsl(var(--muted))] ml-2 flex-shrink-0">
                    {new Date(content.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Backup Status */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Backup Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--info))' }}>{dashboardData.backup_stats.total_backups}</p>
              <p className="text-sm text-[hsl(var(--muted))]">Total Backups</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--success))' }}>{dashboardData.backup_stats.successful_backups}</p>
              <p className="text-sm text-[hsl(var(--muted))]">Successful</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--error))' }}>{dashboardData.backup_stats.failed_backups}</p>
              <p className="text-sm text-[hsl(var(--muted))]">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-[hsl(var(--foreground))]">
                {dashboardData.backup_stats.last_backup_date 
                  ? new Date(dashboardData.backup_stats.last_backup_date).toLocaleDateString()
                  : 'Never'
                }
              </p>
              <p className="text-sm text-[hsl(var(--muted))]">Last Backup</p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
