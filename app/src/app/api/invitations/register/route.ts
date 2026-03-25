import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';
import { sendResendEmail } from '@/lib/resend-email';

export async function POST(req: NextRequest) {
  try {
    let { email, password, name, token } = await req.json();
    email = (email || '').trim().toLowerCase();
    password = (password || '').trim();
    name = (name || '').trim();

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

    // Determine invited role upfront (works for new/existing users)
    const invitedRoleRaw = (invite.role_preset || invite.role || '').toLowerCase();
    const invitedRole = ['admin', 'manager', 'athlete', 'superadmin'].includes(invitedRoleRaw)
      ? invitedRoleRaw
      : 'athlete';

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

      // If user already exists (e.g., created at invite time), or profile already present,
      // initiate recovery flow and return 200 so the UI continues
      const looksLikeExisting =
        /already\s*registered|already\s*exists|duplicate|conflict/i.test(
          userError.message || '',
        );
      const existingProfile = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (looksLikeExisting || existingProfile.data) {
        // Try to set the submitted password directly for the existing user (no email flow)
        let targetUserId: string | null = existingProfile.data?.id || null;
        try {
          if (!targetUserId) {
            const list = await supabase.auth.admin.listUsers();
            const found = (list?.data?.users || []).find((u: any) => (u.email || '').toLowerCase() === email);
            targetUserId = found?.id || null;
          }
          if (targetUserId) {
            await supabase.auth.admin.updateUserById(targetUserId, { password, email_confirm: true } as any);
          }
        } catch { /* best-effort user lookup */ }

        // Ensure profile has the invited role
        try {
          await supabase
            .from('profiles')
            .upsert(
              {
                id: targetUserId || undefined,
                email,
                name,
                role: invitedRole,
                updated_at: new Date().toISOString(),
              } as any,
              { onConflict: 'email' } as any,
            );
        } catch { /* best-effort profile upsert */ }
        let actionLink: string | null = null;
        try {
          const { data: linkData } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: { redirectTo: `${baseUrl}/auth/callback?invite_token=${token}` },
          });
          actionLink = (linkData as any)?.properties?.action_link || null;
        } catch {
          // ignore, we'll still return instructions
        }

        // Try to send recovery email via Resend if configured
        if (actionLink) {
          const subject = 'HEAD Hub — Set your password';
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #111827;">Finish setting up your HEAD Hub account</h2>
              <p>Click the button below to set your password and complete your invitation.</p>
              <p style="margin-top: 16px;">
                <a href="${actionLink}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 18px;text-decoration:none;border-radius:8px;">Set my password</a>
              </p>
              <p style="font-size:12px;color:#6b7280;margin-top:16px;">If the button doesn't work, copy and paste this link in your browser:</p>
              <p style="font-size:12px;word-break: break-all;"><a href="${actionLink}">${actionLink}</a></p>
            </div>`;
          try { await sendResendEmail({ to: email, subject, html }); } catch { /* email sending is best-effort */ }
        }

        const loginUrl = `${baseUrl}/login?email=${encodeURIComponent(email)}&invite_token=${encodeURIComponent(
          token,
        )}`;
        return NextResponse.json({
          success: true,
          action: 'password_set',
          message:
            'Account already existed. Password set (if possible) and role applied. You can sign in now.',
          loginUrl,
          ...(actionLink ? { actionLink } : {}),
        });
      }

      return NextResponse.json(
        { success: false, error: userError.message || 'Failed to create user' },
        { status: 500 },
      );
    }

    // 3. Create or update profile with the role from invitation (force correct role)

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userData.user.id,
          email: email,
          name: name,
          role: invitedRole,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

    if (profileError) {
      console.error('❌ Error upserting profile:', profileError);
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
        role: invitedRole,
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
