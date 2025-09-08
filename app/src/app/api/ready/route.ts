import { NextResponse } from 'next/server';

/**
 * Readiness probe endpoint for Kubernetes/Docker deployments
 * This endpoint should return 200 when the application is ready to serve traffic
 */
export async function GET() {
  try {
    // Basic readiness checks
    const checks = {
      environment: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      uptime: process.uptime() > 5, // Application has been running for at least 5 seconds
    };

    const isReady = Object.values(checks).every(Boolean);

    if (isReady) {
      return NextResponse.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json'
        }
      });
    } else {
      return NextResponse.json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        checks
      }, {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  }
}
