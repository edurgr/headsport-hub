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

    // Helper to apply role/search filters to any query builder
    function applyFilters(q: any) {
      if (requesterRole !== 'superadmin') q = q.neq('role', 'superadmin');
      if (role && ['athlete', 'manager', 'admin', 'superadmin'].includes(role)) {
        if (role === 'superadmin' && requesterRole !== 'superadmin') return null; // blocked
        q = q.eq('role', role);
      } else if (requesterRole === 'manager') {
        q = q.in('role', ['athlete']);
      }
      if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      return q;
    }

    // Block superadmin-only requests for non-superadmins early
    if (role === 'superadmin' && requesterRole !== 'superadmin') {
      return NextResponse.json({ success: true, profiles: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }

    // Try full query (with extended columns from migration-003).
    // If those columns don't exist yet, fall back to base columns so the
    // directory still loads while migrations are pending.
    const FULL_SELECT = `
      id, email, name, role, organization, phone,
      address, city, state, postal_code, country,
      manager_id, admin_id,
      payment_amount, contract_duration_months,
      instagram_followers, tiktok_followers, youtube_followers,
      accomplishments, created_at, updated_at
    `;
    const BASE_SELECT = `
      id, email, name, role, organization, phone,
      address, city, state, postal_code, country,
      manager_id, created_at, updated_at
    `;

    let dataQuery = applyFilters(
      client.from('profiles').select(FULL_SELECT).order('created_at', { ascending: false }),
    );
    let countQuery = applyFilters(
      client.from('profiles').select('*', { count: 'exact', head: true }),
    );

    const [countResult, profilesResult] = await Promise.all([
      countQuery.then((r: any) => r),
      dataQuery.range(offset, offset + limit - 1).then((r: any) => r),
    ]);

    let { count, error: countError } = countResult;
    let { data: profiles, error: profilesError } = profilesResult;

    // If extended columns are missing (migration not yet applied) retry with base columns
    if (profilesError && profilesError.message?.includes('column')) {
      console.warn('profiles/list: extended columns missing, falling back to base select');
      const fallbackQuery = applyFilters(
        client.from('profiles').select(BASE_SELECT).order('created_at', { ascending: false }),
      );
      const fallback = await fallbackQuery.range(offset, offset + limit - 1);
      profiles = fallback.data;
      profilesError = fallback.error;
    }

    if (countError) {
      return NextResponse.json(
        { error: 'Failed to get profile count: ' + countError.message },
        { status: 500 },
      );
    }

    if (profilesError) {
      return NextResponse.json(
        { error: 'Failed to fetch profiles: ' + profilesError.message },
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
        postal_code: profile.postal_code,
        country: profile.country,
        manager_id: profile.manager_id,
        admin_id: profile.admin_id ?? null,
        payment_amount: profile.payment_amount ?? null,
        contract_duration_months: profile.contract_duration_months ?? null,
        instagram_followers: profile.instagram_followers ?? null,
        tiktok_followers: profile.tiktok_followers ?? null,
        youtube_followers: profile.youtube_followers ?? null,
        accomplishments: profile.accomplishments ?? [],
        created_at: profile.created_at,
        updated_at: profile.updated_at,
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
