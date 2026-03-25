import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin as serviceClient } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';
import { decodeBase64ToUtf8 } from '@/lib/edge-compat';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build Supabase client: prefer Authorization header if provided (matches content API behavior)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration in profiles/list');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    let sb = await supabaseServer();
    const authHeader =
      (req as any).headers?.get?.('authorization') || (req as any).headers?.get?.('Authorization');
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      sb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }) as any;
    }

    // Identify requester id and role
    let requesterId: string | null = null;
    const header = authHeader as string | undefined;
    if (header && header.startsWith('Bearer ')) {
      const token = header.substring(7);
      try {
        const payloadB64 = token.split('.')[1];
        const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        const payloadJson = decodeBase64ToUtf8(base64);
        const payload = JSON.parse(payloadJson);
        requesterId = payload.sub || payload.user_id || null;
      } catch { /* ignore JWT parse errors */ }
    }
    if (!requesterId) {
      try {
        const { data: authInfo } = await (sb as any).auth.getUser();
        requesterId = authInfo?.user?.id || null;
      } catch { /* ignore auth errors */ }
    }

    let requesterRole: 'athlete' | 'manager' | 'admin' | 'superadmin' | null = null;
    if (requesterId) {
      try {
        const source = serviceClient ?? sb;
        const { data: me } = await source
          .from('profiles')
          .select('role')
          .eq('id', requesterId)
          .single();
        requesterRole = (me?.role as any) || null;
      } catch { /* ignore role lookup errors */ }
    }

    if (!requesterId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for managers/admins to avoid RLS misconfig issues
    const client =
      serviceClient && (requesterRole === 'admin' || requesterRole === 'manager' || requesterRole === 'superadmin')
        ? serviceClient
        : sb;

    // Build data query
    let query = client
      .from('profiles')
      .select(
        `
        id,
        email,
        name,
        role,
        organization,
        phone,
        address,
        city,
        state,
        postal_code,
        country,
        manager_id,
        created_at,
        updated_at
      `,
      )
      .order('created_at', { ascending: false });

    // Filter by role if specified
    if (role && ['athlete', 'manager', 'admin', 'superadmin'].includes(role)) {
      query = query.eq('role', role);
    } else if (requesterRole === 'manager') {
      // Managers can only see athletes — never admin or superadmin profiles
      query = query.in('role', ['athlete']);
    }

    // Search by name or email if specified
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Execute count and data queries in parallel for better performance
    const [countResult, profilesResult] = await Promise.all([
      // Count query
      (async () => {
        let countQuery = client.from('profiles').select('*', { count: 'exact', head: true });

        if (role && ['athlete', 'manager', 'admin', 'superadmin'].includes(role)) {
          countQuery = countQuery.eq('role', role);
        } else if (requesterRole === 'manager') {
          countQuery = countQuery.in('role', ['athlete']);
        }
        if (search) {
          countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        return await countQuery;
      })(),
      // Data query
      query.range(offset, offset + limit - 1),
    ]);

    const { count, error: countError } = countResult;
    const { data: profiles, error: profilesError } = profilesResult;

    if (countError) {
      return NextResponse.json(
        {
          error: 'Failed to get profile count: ' + countError.message,
        },
        { status: 500 },
      );
    }

    if (profilesError) {
      return NextResponse.json(
        {
          error: 'Failed to fetch profiles: ' + profilesError.message,
        },
        { status: 500 },
      );
    }

    // Transform the data to match frontend expectations
    const transformedProfiles =
      profiles?.map((profile: any) => ({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        organization: profile.organization,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        postalCode: profile.postal_code,
        country: profile.country,
        managerId: profile.manager_id,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      })) || [];

    return NextResponse.json({
      success: true,
      profiles: transformedProfiles,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
