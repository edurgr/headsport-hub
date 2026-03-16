import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { getSupabaseConfig } from '@/lib/supabase-config';

let supabaseAdmin: any = null;

try {
  const config = getSupabaseConfig();
  if (config.serviceKey) {
    supabaseAdmin = createClient(config.url, config.serviceKey);
  }
} catch (error) {
  console.error('Failed to init Supabase admin client for delete:', error);
}

export async function POST(request: NextRequest) {
  try {
    const { invitationId, requestedBy } = await request.json();

    if (!invitationId || !requestedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server not configured for privileged operations' },
        { status: 500 },
      );
    }

    // Fetch requester role
    const { data: requester, error: requesterError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', requestedBy)
      .single();

    if (requesterError || !requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch invitation to check ownership when manager
    const { data: invitation, error: invError } = await supabaseAdmin
      .from('invitations')
      .select('id, invited_by')
      .eq('id', invitationId)
      .single();

    if (invError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (requester.role === 'manager' && invitation.invited_by !== requester.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete invitation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete invitation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}






