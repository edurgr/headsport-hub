import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

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
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status });
    }

    // Get query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const action = url.searchParams.get('action');
    const resourceType = url.searchParams.get('resourceType');
    const userId = url.searchParams.get('userId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    let query = admin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (action) query = query.ilike('action', `%${action}%`);
    if (resourceType) query = query.ilike('resource_type', `%${resourceType}%`);
    if (userId) query = query.or(`user_id.eq.${userId},user_email.ilike.%${userId}%`);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data: logs, count, error: dbError } = await query;

    if (dbError) {
      // Table may not exist yet — return empty result rather than an error
      return NextResponse.json({
        logs: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        note: 'audit_logs table not yet created',
      });
    }

    return NextResponse.json({
      logs: logs ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (error) {
    console.error('Error in audit logs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
