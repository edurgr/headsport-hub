import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

export async function PATCH(req: NextRequest) {
  try {
    // Verify caller is authenticated
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization') || '';
    let callerId: string | null = null;
    let callerRole: string | null = null;

    if (authHeader.startsWith('Bearer ')) {
      const authed = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await authed.auth.getUser();
      if (user) {
        callerId = user.id;
        const { data: callerProfile } = await authed
          .from('profiles').select('role').eq('id', callerId).single();
        callerRole = callerProfile?.role ?? null;
      }
    }

    if (!callerId) {
      // Fallback: try session cookie
      const sbCookie = await supabaseServer();
      const { data: { user } } = await sbCookie.auth.getUser();
      if (user) {
        callerId = user.id;
        const { data: callerProfile } = await sbCookie
          .from('profiles').select('role').eq('id', callerId).single();
        callerRole = callerProfile?.role ?? null;
      }
    }

    if (!callerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sb = supabaseAdmin || (await supabaseServer());
    const body = await req.json();
    const {
      id,
      name,
      email,
      phone,
      organization,
      role,
      manager_id,
      admin_id,
      payment_amount,
      contract_duration_months,
      instagram_followers,
      tiktok_followers,
      youtube_followers,
      accomplishments,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    // Only allow editing own profile unless admin/superadmin
    const isElevated = callerRole === 'admin' || callerRole === 'superadmin';
    // Managers can also edit their own athletes' profiles
    const isManager = callerRole === 'manager';
    if (!isElevated && !isManager && callerId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatePayload: any = {
      name,
      email,
      phone,
      organization,
      updated_at: new Date().toISOString(),
    };

    // Only admins/superadmins can change role
    if (typeof role === 'string' && ['admin', 'manager', 'athlete', 'superadmin'].includes(role)) {
      if (callerRole === 'superadmin') {
        updatePayload.role = role;
      } else if (callerRole === 'admin' && ['manager', 'athlete'].includes(role)) {
        updatePayload.role = role;
      }
    }

    // Admins and superadmins can assign manager_id (assign athlete to a manager)
    // Managers can also assign athletes to themselves
    if (manager_id !== undefined) {
      if (isElevated) {
        updatePayload.manager_id = manager_id || null;
      } else if (isManager) {
        updatePayload.manager_id = manager_id === callerId ? callerId : null;
      }
    }

    // Only superadmin can assign admin_id (manager → admin hierarchy)
    if (admin_id !== undefined && callerRole === 'superadmin') {
      updatePayload.admin_id = admin_id || null;
    }

    // Financial/legal fields — admin, superadmin, and manager
    if (isElevated || isManager) {
      if (payment_amount !== undefined) updatePayload.payment_amount = payment_amount ?? null;
      if (contract_duration_months !== undefined) updatePayload.contract_duration_months = contract_duration_months ?? null;
    }

    // Social/performance fields — admin, superadmin, manager, or self
    if (isElevated || isManager || callerId === id) {
      if (instagram_followers !== undefined) updatePayload.instagram_followers = instagram_followers ?? null;
      if (tiktok_followers !== undefined) updatePayload.tiktok_followers = tiktok_followers ?? null;
      if (youtube_followers !== undefined) updatePayload.youtube_followers = youtube_followers ?? null;
    }

    // Accomplishments — admin, superadmin, and manager, validate shape
    if ((isElevated || isManager) && accomplishments !== undefined) {
      if (Array.isArray(accomplishments)) {
        const isValid = accomplishments.every(
          (a: any) => typeof a.title === 'string' && typeof a.date === 'string' && typeof a.description === 'string',
        );
        if (!isValid) {
          return NextResponse.json({ error: 'Invalid accomplishments format' }, { status: 400 });
        }
        updatePayload.accomplishments = accomplishments;
      }
    }

    const { data, error } = await sb
      .from('profiles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile: ' + error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      profile: data,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
