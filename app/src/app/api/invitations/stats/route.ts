import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const sb = supabaseAdmin;
    
    if (!sb) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get pending invitations count
    const { count: pendingCount, error: pendingError } = await sb
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (pendingError) {
      console.error('Error fetching pending invitations:', pendingError);
    }

    // Get accepted invitations count
    const { count: acceptedCount, error: acceptedError } = await sb
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted');

    if (acceptedError) {
      console.error('Error fetching accepted invitations:', acceptedError);
    }

    return NextResponse.json({
      pending: pendingCount || 0,
      accepted: acceptedCount || 0,
      total: (pendingCount || 0) + (acceptedCount || 0)
    });

  } catch (error) {
    console.error('Error fetching invitation stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
