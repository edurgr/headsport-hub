import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get('token') || '';

    if (!token) {
      return NextResponse.json(
        {
          valid: false,
          error: 'No token provided',
        },
        { status: 400 },
      );
    }

    // Usar el cliente de Supabase directamente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Faltan variables de entorno de Supabase');
      return NextResponse.json(
        {
          valid: false,
          error: 'Server configuration error',
        },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the invitation by token.
    // Intentar con 'invites' (nuevo esquema); si no existe, usar 'invitations' (esquema previo).
    let invitation: any = null;
    let error: any = null;
    const tryInvites = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();
    if (tryInvites.error && tryInvites.error.code === 'PGRST205') {
      const tryInvitations = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();
      invitation = tryInvitations.data;
      error = tryInvitations.error;
    } else {
      invitation = tryInvites.data;
      error = tryInvites.error;
    }

    if (error) {
      console.error('❌ Error searching invitation:', error);
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid or expired invitation',
        },
        { status: 404 },
      );
    }

    if (!invitation) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid or expired invitation',
        },
        { status: 404 },
      );
    }

    // Check if it has expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);

    if (expiresAt < now) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invitation has expired',
        },
        { status: 400 },
      );
    }

    // Return invitation details
    return NextResponse.json({
      valid: true,
      email: invitation.email,
      role: invitation.role_preset || invitation.role,
      expiresAt: invitation.expires_at,
      invitedBy: invitation.created_by || invitation.invited_by,
    });
  } catch (error) {
    console.error('❌ Error durante la validación:', error);
    return NextResponse.json(
      {
        valid: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
