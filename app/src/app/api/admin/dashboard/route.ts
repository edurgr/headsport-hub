import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { verifyAdminAccess } from '@/lib/admin-auth-secure';
import { validateRequest } from '@/lib/input-validator';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = checkRateLimit(req, true); // Admin rate limit
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        {
          status: rateLimitResult.status,
          headers: rateLimitResult.headers as Record<string, string>,
        },
      );
    }

    // Validate request parameters
    const validationResult = validateRequest(req);
    if (!validationResult.isValid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }

    // Check admin access
    const adminResult = await verifyAdminAccess(req);
    if (!adminResult.success) {
      console.log('Admin access denied:', adminResult.error);
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status });
    }

    const adminUser = adminResult.user;
    console.log('Admin access granted for:', adminUser.email);

    // Use service role key for admin operations; fall back to user-scoped client if unavailable
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    // Prefer service role key (bypasses RLS); fall back to user-scoped client
    const supabase = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : (() => {
          const authHeader = req.headers.get('authorization') ?? '';
          const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
          return createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
          });
        })();

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '30'; // days

    // Get all dashboard data in parallel with individual error handling (Promise.allSettled)
    const results = await Promise.allSettled([
      getUserStats(supabase, parseInt(period)),
      getOrderStats(supabase, parseInt(period)),
      getContentStats(supabase, parseInt(period)),
      getProductStats(supabase),
      getRecentActivity(supabase),
      getSystemHealth(supabase),
      getBackupStats(),
      getNotificationStats(supabase, adminUser.id),
    ]);

    // Helper to extract settled values
    const getValue = (result: PromiseSettledResult<any>, fallback: any) => {
      if (result.status === 'fulfilled') return result.value;
      console.error('Dashboard query failed:', result.reason);
      return fallback;
    };

    const userStats = getValue(results[0], {
      total_users: 0,
      new_users: 0,
      active_users: 0,
      users_by_role: {},
    });
    const orderStats = getValue(results[1], {
      total_orders: 0,
      period_orders: 0,
      orders_by_status: {},
      total_revenue: 0,
      average_order_value: 0,
    });
    const contentStats = getValue(results[2], {
      total_content: 0,
      period_content: 0,
      content_by_type: {},
      total_storage_mb: 0,
    });
    const productStats = getValue(results[3], {
      total_products: 0,
      active_products: 0,
      products_by_category: {
        accessories: 0,
        bindings: 0,
        boots: 0,
        goggles: 0,
        helmet: 0,
        ski: 0,
        snowboard: 0,
      },
    });
    const recentActivity = getValue(results[4], {
      recent_orders: [],
      recent_users: [],
      recent_content: [],
    });
    const systemHealth = getValue(results[5], {
      database_healthy: false,
      storage_healthy: false,
      uptime_seconds: null,
      uptime_hours: null,
    });
    const backupStats = getValue(results[6], {
      total_backups: 0,
      successful_backups: 0,
      failed_backups: 0,
      total_size_mb: 0,
      last_backup_date: null,
      avg_backup_duration_minutes: 0,
    });
    const notificationStats = getValue(results[7], {
      unread_count: 0,
      recent_notifications: [],
    });

    return NextResponse.json({
      period: parseInt(period),
      user_stats: userStats,
      order_stats: orderStats,
      content_stats: contentStats,
      product_stats: productStats,
      recent_activity: recentActivity,
      system_health: systemHealth,
      backup_stats: backupStats,
      notification_stats: notificationStats,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getUserStats(supabase: any, period: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  try {
    // Total users
    const { data: allUsers, error: totalError } = await supabase
      .from('profiles')
      .select('id, role, created_at, updated_at');

    if (totalError) {
      console.error('Error fetching users:', totalError);
      return {
        total_users: 0,
        new_users: 0,
        active_users: 0,
        users_by_role: {},
      };
    }

    const totalUsers = allUsers?.length || 0;

    // New users in period
    const newUsers =
      allUsers?.filter((user: any) => new Date(user.created_at) >= startDate).length || 0;

    // Users by role
    const roleCounts =
      allUsers?.reduce((acc: any, user: any) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {}) || {};

    // Active users (users with recent activity)
    const activeUsers =
      allUsers?.filter((user: any) => new Date(user.updated_at) >= startDate).length || 0;

    return {
      total_users: totalUsers,
      new_users: newUsers,
      active_users: activeUsers,
      users_by_role: roleCounts,
    };
  } catch (error) {
    console.error('Error in getUserStats:', error);
    return {
      total_users: 0,
      new_users: 0,
      active_users: 0,
      users_by_role: {},
    };
  }
}

async function getOrderStats(supabase: any, period: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  try {
    // Total orders
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Orders in period
    const { count: periodOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Orders by status
    const { data: ordersByStatus } = await supabase
      .from('orders')
      .select('status')
      .gte('created_at', startDate.toISOString());

    const statusCounts =
      ordersByStatus?.reduce((acc: any, order: any) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}) || {};

    return {
      total_orders: totalOrders || 0,
      period_orders: periodOrders || 0,
      orders_by_status: statusCounts,
      total_revenue: 0, // No hay columna total_amount
      average_order_value: 0,
    };
  } catch (error) {
    console.error('Error in getOrderStats:', error);
    return {
      total_orders: 0,
      period_orders: 0,
      orders_by_status: {},
      total_revenue: 0,
      average_order_value: 0,
    };
  }
}

async function getContentStats(supabase: any, period: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  try {
    // Total content
    const { data: allContent, error: contentError } = await supabase
      .from('upload_files')
      .select('id, file_type, file_size, created_at');

    if (contentError) {
      console.error('Error fetching content:', contentError);
      return {
        total_content: 0,
        period_content: 0,
        content_by_type: {},
        total_storage_mb: 0,
      };
    }

    const totalContent = allContent?.length || 0;

    // Content in period
    const periodContent =
      allContent?.filter((file: any) => new Date(file.created_at) >= startDate).length || 0;

    // Content by type
    const typeCounts =
      allContent?.reduce((acc: any, file: any) => {
        acc[file.file_type] = (acc[file.file_type] || 0) + 1;
        return acc;
      }, {}) || {};

    // Total storage
    const totalStorage =
      allContent?.reduce((sum: number, file: any) => sum + (parseInt(file.file_size) || 0), 0) || 0;

    return {
      total_content: totalContent,
      period_content: periodContent,
      content_by_type: typeCounts,
      total_storage_mb: Math.round((totalStorage / 1024 / 1024) * 100) / 100,
    };
  } catch (error) {
    console.error('Error in getContentStats:', error);
    return {
      total_content: 0,
      period_content: 0,
      content_by_type: {},
      total_storage_mb: 0,
    };
  }
}

async function getProductStats(supabase: any) {
  const categories = ['bindings', 'ski']; // Solo las tablas que existen
  let totalProducts = 0;
  const productsByCategory: any = {};

  try {
    for (const category of categories) {
      const { count } = await supabase.from(category).select('*', { count: 'exact', head: true });

      const countValue = count || 0;
      totalProducts += countValue;
      productsByCategory[category] = countValue;
    }

    // Agregar categorías que no existen con 0
    const allCategories = [
      'accessories',
      'bindings',
      'boots',
      'goggles',
      'helmet',
      'ski',
      'snowboard',
    ];
    allCategories.forEach((cat) => {
      if (!productsByCategory[cat]) {
        productsByCategory[cat] = 0;
      }
    });

    return {
      total_products: totalProducts,
      active_products: totalProducts, // Asumimos que todos están activos
      products_by_category: productsByCategory,
    };
  } catch (error) {
    console.error('Error in getProductStats:', error);
    return {
      total_products: 0,
      active_products: 0,
      products_by_category: {
        accessories: 0,
        bindings: 0,
        boots: 0,
        goggles: 0,
        helmet: 0,
        ski: 0,
        snowboard: 0,
      },
    };
  }
}

async function getRecentActivity(supabase: any) {
  try {
    // Separate queries to avoid nested foreign key failures in Cloudflare Workers
    const activityResults = await Promise.allSettled([
      // Query 1: Recent orders (without nested selects)
      supabase
        .from('orders')
        .select('id, status, created_at, athlete_email')
        .order('created_at', { ascending: false })
        .limit(5),

      // Query 2: All profiles for matching with orders
      supabase
        .from('profiles')
        .select('id, email, name', { count: 'exact' }),

      // Query 3: Recent users
      supabase
        .from('profiles')
        .select('id, name, email, role, created_at')
        .order('created_at', { ascending: false })
        .limit(5),

      // Query 4: Recent content files (without nested foreign keys)
      supabase
        .from('upload_files')
        .select('id, filename, file_type, file_size, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(5),

      // Query 5: Upload sessions (separate from files)
      supabase
        .from('upload_sessions')
        .select('id, user_id'),
    ]);

    // Extract results with fallbacks
    const ordersResult = activityResults[0];
    const profilesResult = activityResults[1];
    const recentUsersResult = activityResults[2];
    const contentResult = activityResults[3];
    const sessionsResult = activityResults[4];

    const recentOrders = ordersResult.status === 'fulfilled' ? ordersResult.value.data || [] : [];
    const allProfiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [];
    const recentUsers =
      recentUsersResult.status === 'fulfilled' ? recentUsersResult.value.data || [] : [];
    const recentContentFiles =
      contentResult.status === 'fulfilled' ? contentResult.value.data || [] : [];
    const uploadSessions =
      sessionsResult.status === 'fulfilled' ? sessionsResult.value.data || [] : [];

    // Process orders - join with profiles after query
    const profileMap = new Map(allProfiles.map((p: any) => [p.email, p as any]));

    const ordersWithNames = recentOrders.map((order: any) => {
      const profile = profileMap.get(order.athlete_email) as any;
      return {
        ...order,
        user_name: profile?.name || 'Unknown User',
        user_email: profile?.email || order.athlete_email,
      };
    });

    // Process content - join with sessions and profiles after query
    const sessionMap = new Map(uploadSessions.map((s: any) => [s.id, s as any]));

    const contentWithUsers = recentContentFiles.map((file: any) => {
      const session = sessionMap.get(file.user_id) as any;
      const profile =
        session && allProfiles.find((p: any) => p.id === session.user_id);

      return {
        id: file.id,
        filename: file.filename,
        file_type: file.file_type,
        file_size: file.file_size,
        created_at: file.created_at,
        uploaded_by: profile?.name || 'Unknown User',
        uploaded_by_email: profile?.email || 'unknown@example.com',
      };
    });

    // Log any failures for monitoring
    if (ordersResult.status === 'rejected') {
      console.warn('Failed to fetch recent orders:', ordersResult.reason);
    }
    if (profilesResult.status === 'rejected') {
      console.warn('Failed to fetch profiles:', profilesResult.reason);
    }
    if (recentUsersResult.status === 'rejected') {
      console.warn('Failed to fetch recent users:', recentUsersResult.reason);
    }
    if (contentResult.status === 'rejected') {
      console.warn('Failed to fetch recent content:', contentResult.reason);
    }
    if (sessionsResult.status === 'rejected') {
      console.warn('Failed to fetch upload sessions:', sessionsResult.reason);
    }

    return {
      recent_orders: ordersWithNames,
      recent_users: recentUsers,
      recent_content: contentWithUsers,
    };
  } catch (error) {
    console.error('Error in getRecentActivity:', error);
    return {
      recent_orders: [],
      recent_users: [],
      recent_content: [],
    };
  }
}

async function getSystemHealth(supabase: any) {
  try {
    // Database health
    const { data: dbHealth } = await supabase.from('profiles').select('id').limit(1);

    // Storage health (check if storage is accessible)
    let storageHealth = true;
    try {
      await supabase.storage.from('user-uploads').list('', { limit: 1 });
    } catch {
      storageHealth = false;
    }

    // Uptime: `process.uptime()` is not available on Edge runtimes (Cloudflare Workers).
    // Use `performance.now()` when available.
    const uptimeSeconds =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? Math.round(performance.now() / 1000)
        : null;

    return {
      database_healthy: !!dbHealth,
      storage_healthy: storageHealth,
      uptime_seconds: uptimeSeconds,
      uptime_hours: uptimeSeconds === null ? null : Math.round((uptimeSeconds / 3600) * 100) / 100,
    };
  } catch (error) {
    console.error('Error in getSystemHealth:', error);
    return {
      database_healthy: false,
      storage_healthy: false,
      uptime_seconds: null,
      uptime_hours: null,
    };
  }
}

async function getBackupStats() {
  // Por ahora, devolver stats mock ya que las tablas de backup no existen
  return {
    total_backups: 0,
    successful_backups: 0,
    failed_backups: 0,
    total_size_mb: 0,
    last_backup_date: null,
    avg_backup_duration_minutes: 0,
  };
}

async function getNotificationStats(_supabase: any, _userId: string) {
  // Por ahora, devolver stats mock ya que las tablas de notificaciones no existen
  return {
    unread_count: 0,
    recent_notifications: [],
  };
}
