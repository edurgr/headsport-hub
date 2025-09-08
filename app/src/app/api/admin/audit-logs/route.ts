import { NextRequest, NextResponse } from 'next/server';

import { verifyAdminAccess } from '@/lib/admin-auth-secure';
import { validateRequest } from '@/lib/input-validator';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = checkRateLimit(req, true);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        {
          status: rateLimitResult.status,
          headers: rateLimitResult.headers as Record<string, string>,
        }
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
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status });
    }

    // Get query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const action = url.searchParams.get('action');
    const resourceType = url.searchParams.get('resourceType');
    const userId = url.searchParams.get('userId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Generate mock audit logs since audit_logs table doesn't exist
    const mockLogs = [
      {
        id: '1',
        user_id: '153e8352-8abd-44a7-a9d1-f947549a005a',
        user_email: 'athlete7management@gmail.com',
        action: 'dashboard_viewed',
        resource_type: 'dashboard',
        resource_id: null,
        details: { period: '30', timestamp: new Date().toISOString() },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        user_id: '153e8352-8abd-44a7-a9d1-f947549a005a',
        user_email: 'athlete7management@gmail.com',
        action: 'product_created',
        resource_type: 'product',
        resource_id: 'prod-123',
        details: { name: 'Test Product', category: 'ski' },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '3',
        user_id: '8e76e106-0b01-4c56-b28b-19b508e5748e',
        user_email: 'egorospe@uoc.edu',
        action: 'user_login',
        resource_type: 'user',
        resource_id: '8e76e106-0b01-4c56-b28b-19b508e5748e',
        details: { login_method: 'email', success: true },
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: '4',
        user_id: '03f164e9-028f-43bc-a0eb-0f8c54553356',
        user_email: 'edurgr@gmail.com',
        action: 'file_uploaded',
        resource_type: 'file',
        resource_id: 'file-456',
        details: { filename: 'test.jpg', file_size: 1024000, file_type: 'image' },
        ip_address: '192.168.1.101',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
        created_at: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        id: '5',
        user_id: '153e8352-8abd-44a7-a9d1-f947549a005a',
        user_email: 'athlete7management@gmail.com',
        action: 'content_moderated',
        resource_type: 'content',
        resource_id: 'content-789',
        details: { action: 'approved', reason: 'passed_all_checks' },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        created_at: new Date(Date.now() - 14400000).toISOString(),
      },
    ];

    // Apply filters to mock data
    let filteredLogs = mockLogs;

    if (action) {
      filteredLogs = filteredLogs.filter(log =>
        log.action.toLowerCase().includes(action.toLowerCase())
      );
    }
    if (resourceType) {
      filteredLogs = filteredLogs.filter(log =>
        log.resource_type.toLowerCase().includes(resourceType.toLowerCase())
      );
    }
    if (userId) {
      filteredLogs = filteredLogs.filter(
        log => log.user_id.includes(userId) || log.user_email.includes(userId)
      );
    }
    if (startDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.created_at) >= new Date(startDate));
    }
    if (endDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.created_at) <= new Date(endDate));
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit;
    const paginatedLogs = filteredLogs.slice(from, to);

    return NextResponse.json({
      logs: paginatedLogs,
      total: filteredLogs.length,
      page,
      limit,
      totalPages: Math.ceil(filteredLogs.length / limit),
    });
  } catch (error) {
    console.error('Error in audit logs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
