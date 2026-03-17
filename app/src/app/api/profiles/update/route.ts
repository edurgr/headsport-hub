import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function PATCH(req: Request) {
  try {
    const sb = supabaseAdmin || (await supabaseServer());
    const body = await req.json();
    const {
      id,
      name,
      email,
      phone,
      organization,
      role,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    const updatePayload: any = {
      name,
      email,
      phone,
      organization,
      // Note: performance metrics are not persisted (no column). Only core profile fields are updated.
      updated_at: new Date().toISOString(),
    };

    // Only admins can change role (verify via Authorization header token)
    if (typeof role === 'string' && ['admin', 'manager', 'athlete', 'superadmin'].includes(role)) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
        const authHeader = req.headers.get('authorization') || '';
        if (supabaseUrl && supabaseAnonKey && authHeader.startsWith('Bearer ')) {
          const authed = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
          });
          const {
            data: { user: requester },
          } = await authed.auth.getUser();
          if (requester) {
            const { data: requesterProfile } = await authed
              .from('profiles')
              .select('role')
              .eq('id', requester.id)
              .single();
            const requesterRole = requesterProfile?.role;
            if (requesterRole === 'superadmin') {
              updatePayload.role = role; // full power
            } else if (requesterRole === 'admin') {
              // Admins can only set non-admin roles
              if (['manager', 'athlete'].includes(role)) {
                updatePayload.role = role;
              }
            }
          }
        }
      } catch {
        // ignore: if we can't verify admin, do not allow role change
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
export const runtime = 'edge';
