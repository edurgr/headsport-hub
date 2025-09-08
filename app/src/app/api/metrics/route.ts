import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    profiles_count: number;
    orders_count: number;
    invitations_count: number;
    upload_files_count: number;
  };
  application: {
    version: string;
    environment: string;
  };
}

export async function GET() {
  try {
    const startTime = Date.now();

    // Memory usage
    const memoryUsage = process.memoryUsage();
    const memoryData = {
      used: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100, // MB
      total: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100, // MB
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
    };

    // Database metrics
    let dbMetrics = {
      profiles_count: 0,
      orders_count: 0,
      invitations_count: 0,
      upload_files_count: 0,
    };

    if (supabaseAdmin) {
      try {
        const [profilesResult, ordersResult, invitationsResult, filesResult] = await Promise.all([
          supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('invites').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('upload_files').select('*', { count: 'exact', head: true }),
        ]);

        dbMetrics = {
          profiles_count: profilesResult.count || 0,
          orders_count: ordersResult.count || 0,
          invitations_count: invitationsResult.count || 0,
          upload_files_count: filesResult.count || 0,
        };
      } catch (error) {
        logger.warn('Failed to fetch database metrics', { error });
      }
    }

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      memory: memoryData,
      database: dbMetrics,
      application: {
        version: process.env.npm_package_version || '0.1.0',
        environment: process.env.NODE_ENV || 'development',
      },
    };

    logger.info('Metrics collected', {
      responseTime: Date.now() - startTime,
      memoryUsed: memoryData.used,
      profilesCount: dbMetrics.profiles_count,
    });

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    logger.error('Failed to collect metrics', error);

    return NextResponse.json(
      {
        error: 'Failed to collect metrics',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
