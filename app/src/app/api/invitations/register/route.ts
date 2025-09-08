import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, token } = await req.json();

    if (!email || !password || !name || !token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email, password, name and token are required',
        },
        { status: 400 },
      );
    }

    // Usar el cliente de Supabase del servidor
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

    // Build redirect base URL from env or request
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || '';
    if (!baseUrl) {
      const protocol = req.headers.get('x-forwarded-proto') || 'http';
      const host = req.headers.get('host') || 'localhost:3000';
      baseUrl = `${protocol}://${host}`;
    }

    // 1. Validate the invitation (compatibility 'invites' | 'invitations')
    let invite: any = null;
    let invitationError: any = null;
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
      invite = tryInvitations.data;
      invitationError = tryInvitations.error;
    } else {
      invite = tryInvites.data;
      invitationError = tryInvites.error;
    }

    if (invitationError || !invite) {
      console.error('❌ Invitación inválida:', invitationError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired invitation',
        },
        { status: 404 },
      );
    }

    // Check if it has expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);

    if (expiresAt < now) {
      console.error('❌ Invitation expired');
      return NextResponse.json(
        {
          success: false,
          error: 'Invitation has expired',
        },
        { status: 400 },
      );
    }

    // 2. Create user using admin API
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      // We accept the password from the form, but will still send a password reset link
      password,
      email_confirm: true, // Confirm email automatically
      user_metadata: { name },
    });

    if (userError) {
      console.error('❌ Error creating user:', userError);

      // Handle rate limiting error specifically
      if (userError.message && userError.message.includes('36 seconds')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit reached. Please wait 36 seconds before trying again.',
          },
          { status: 429 },
        );
      }

      // If user already exists, respond with specific code to redirect to Login
      if (/already\s*registered|already\s*exists/i.test(userError.message || '')) {
        // User already exists: send recovery link to set password and accept invitation
        const { error: linkError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: `${baseUrl}/auth/callback?invite_token=${token}` },
        });
        if (linkError) {
          return NextResponse.json(
            {
              success: false,
              code: 'user_exists',
              error: 'User exists. Use Forgot password to continue.',
            },
            { status: 409 },
          );
        }
        return NextResponse.json({
          success: true,
          action: 'recovery_link_sent',
          message: 'We sent you an email to set your password and finish accepting the invitation.',
          // Nota: en dev podríamos incluir linkData.properties.action_link
        });
      }

      return NextResponse.json(
        { success: false, error: userError.message || 'Failed to create user' },
        { status: 500 },
      );
    }

    // 3. Update/create profile (DB trigger already creates profile; here we update data and role)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        email: email,
        name: name,
        role: invite.role_preset || invite.role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userData.user.id);

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      // Don't fail if profile can't be created, user already exists
    }

    // 4. Mark the invitation as used
    let acceptError: any = null;
    if ('used' in invite) {
      const { error } = await supabase.from('invites').update({ used: true }).eq('id', invite.id);
      acceptError = error;
    } else {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', invite.id);
      acceptError = error;
    }

    if (acceptError) {
      console.error('❌ Error marking invitation as accepted:', acceptError);
      // Don't fail if it can't be marked as accepted
    }

    return NextResponse.json({
      success: true,
      message: 'User registered successfully. You can now sign in with your password.',
      user: {
        id: userData.user.id,
        email: userData.user.email,
        role: invite.role_preset || invite.role,
      },
      requiresEmailConfirmation: false,
    });
  } catch (error) {
    console.error('❌ Error durante el registro:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
