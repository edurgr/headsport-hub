import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token is required',
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
          success: false,
          error: 'Server configuration error',
        },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the invitation by token
    const { data: invitation, error: findError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (findError || !invitation) {
      console.error('❌ Invitación no encontrada:', findError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired invitation',
        },
        { status: 404 },
      );
    }

    // Mark the invitation as accepted
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('❌ Error updating invitation:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update invitation',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
    });
  } catch (error) {
    console.error('❌ Error durante la aceptación:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
export const runtime = 'edge';
