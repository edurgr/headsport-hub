import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/admin-auth-secure';

/**
 * POST /api/profiles/assign
 * Handles hierarchical user assignment:
 *   manager_to_admin: superadmin assigns a manager to an admin (sets manager.admin_id)
 *   athlete_to_manager: admin or superadmin assigns an athlete to a manager (sets athlete.manager_id)
 *
 * Body: { targetId: string, assignmentType: 'manager_to_admin' | 'athlete_to_manager', assignToId: string | null }
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const sb = supabaseAdmin ?? createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authResult.token}` } },
    });

    // Get caller's role
    const { data: callerProfile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', authResult.userId)
      .single();

    const callerRole = callerProfile?.role as string | undefined;
    if (!callerRole || !['admin', 'superadmin'].includes(callerRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { targetId, assignmentType, assignToId } = body as {
      targetId: string;
      assignmentType: 'manager_to_admin' | 'athlete_to_manager';
      assignToId: string | null;
    };

    if (!targetId || !assignmentType) {
      return NextResponse.json({ error: 'targetId and assignmentType are required' }, { status: 400 });
    }

    if (assignmentType === 'manager_to_admin') {
      // Only superadmin can assign managers to admins
      if (callerRole !== 'superadmin') {
        return NextResponse.json({ error: 'Only superadmin can assign managers to admins' }, { status: 403 });
      }

      // Verify target is a manager
      const { data: target } = await sb.from('profiles').select('role').eq('id', targetId).single();
      if (!target || target.role !== 'manager') {
        return NextResponse.json({ error: 'Target user must be a manager' }, { status: 400 });
      }

      // Verify assignTo is an admin (if not null)
      if (assignToId) {
        const { data: adminProfile } = await sb.from('profiles').select('role').eq('id', assignToId).single();
        if (!adminProfile || !['admin', 'superadmin'].includes(adminProfile.role)) {
          return NextResponse.json({ error: 'assignToId must reference an admin or superadmin' }, { status: 400 });
        }
      }

      const { error } = await sb
        .from('profiles')
        .update({ admin_id: assignToId || null, updated_at: new Date().toISOString() })
        .eq('id', targetId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Manager assigned to admin' });
    }

    if (assignmentType === 'athlete_to_manager') {
      // Admin or superadmin can assign athletes to managers
      // Verify target is an athlete
      const { data: target } = await sb.from('profiles').select('role').eq('id', targetId).single();
      if (!target || target.role !== 'athlete') {
        return NextResponse.json({ error: 'Target user must be an athlete' }, { status: 400 });
      }

      // Verify assignTo is a manager (if not null)
      if (assignToId) {
        const { data: managerProfile } = await sb.from('profiles').select('role').eq('id', assignToId).single();
        if (!managerProfile || managerProfile.role !== 'manager') {
          return NextResponse.json({ error: 'assignToId must reference a manager' }, { status: 400 });
        }
      }

      const { error } = await sb
        .from('profiles')
        .update({ manager_id: assignToId || null, updated_at: new Date().toISOString() })
        .eq('id', targetId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Athlete assigned to manager' });
    }

    return NextResponse.json({ error: 'Invalid assignmentType' }, { status: 400 });
  } catch (error) {
    console.error('Profile assign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
