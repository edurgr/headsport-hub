import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: HealthCheck[];
}

export async function GET() {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];

  try {
    // Environment variables check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      checks.push({
        service: 'environment',
        status: 'unhealthy',
        error: 'Missing required environment variables',
      });
    } else {
      checks.push({
        service: 'environment',
        status: 'healthy',
      });
    }

    // Database connectivity check
    if (serviceRoleKey && supabaseUrl) {
      const dbCheckStart = Date.now();
      try {
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const { data, error } = await supabase.from('profiles').select('count').limit(1).single();

        if (error) {
          checks.push({
            service: 'database',
            status: 'unhealthy',
            responseTime: Date.now() - dbCheckStart,
            error: error.message,
          });
        } else {
          checks.push({
            service: 'database',
            status: 'healthy',
            responseTime: Date.now() - dbCheckStart,
          });
        }
      } catch (error) {
        checks.push({
          service: 'database',
          status: 'unhealthy',
          responseTime: Date.now() - dbCheckStart,
          error: error instanceof Error ? error.message : 'Database connection failed',
        });
      }
    } else {
      checks.push({
        service: 'database',
        status: 'unhealthy',
        error: 'Missing database configuration',
      });
    }

    // Storage check
    if (serviceRoleKey && supabaseUrl) {
      const storageCheckStart = Date.now();
      try {
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const bucket = process.env.NEXT_PUBLIC_UPLOADS_BUCKET || 'user-uploads';

        // Try to create a signed URL as a connectivity test
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl('health-check-dummy', 60);

        if (error && !error.message.includes('not found')) {
          checks.push({
            service: 'storage',
            status: 'unhealthy',
            responseTime: Date.now() - storageCheckStart,
            error: error.message,
          });
        } else {
          checks.push({
            service: 'storage',
            status: 'healthy',
            responseTime: Date.now() - storageCheckStart,
          });
        }
      } catch (error) {
        checks.push({
          service: 'storage',
          status: 'unhealthy',
          responseTime: Date.now() - storageCheckStart,
          error: error instanceof Error ? error.message : 'Storage connection failed',
        });
      }
    } else {
      checks.push({
        service: 'storage',
        status: 'unhealthy',
        error: 'Missing storage configuration',
      });
    }

    // Overall health status
    const overallStatus = checks.every((check) => check.status === 'healthy')
      ? 'healthy'
      : 'unhealthy';

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      checks,
    };

    logger.info('Health check completed', {
      status: overallStatus,
      responseTime: Date.now() - startTime,
      checks: checks.length,
    });

    return NextResponse.json(response, {
      status: overallStatus === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    logger.error('Health check failed', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        uptime: process.uptime(),
        checks: [
          {
            service: 'system',
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'System error',
          },
        ],
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
