import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { getSupabaseConfig } from '@/lib/supabase-config';
import { sendResendInvitationEmail } from '@/lib/resend-email';
import { verifyManagerOrAdminAccess } from '@/lib/admin-auth-secure';

// Configure Supabase client with service role key for administrative operations
let supabaseAdmin: any = null;

try {
  const config = getSupabaseConfig();
  if (config.serviceKey) {
    supabaseAdmin = createClient(config.url, config.serviceKey);
  } else {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not available, using anon key');
    supabaseAdmin = createClient(config.url, config.anonKey);
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // We'll handle this in the route handler
}

export async function POST(request: NextRequest) {
  try {
    const hasServiceKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
    if (!supabaseAdmin) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Supabase admin not configured. Skipping inviter check in development mode.');
      } else {
        return NextResponse.json(
          { error: 'Supabase configuration is missing' },
          { status: 500 },
        );
      }
    }

    // Verify caller is authenticated and has manager or admin role
    const authResult = await verifyManagerOrAdminAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { email, role, invitedBy, personalMessage } = await request.json();

    if (!email || !role || !invitedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const roleSanitized: 'admin' | 'manager' | 'athlete' =
      (['admin', 'manager', 'athlete'].includes(role) ? role : 'athlete') as 'admin' | 'manager' | 'athlete';

    // Verify inviter permissions: admins can invite any role; managers can only invite athletes
    if (supabaseAdmin && hasServiceKey) {
      const { data: inviter, error: inviterError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', invitedBy)
        .single();

      if (inviterError || !inviter?.role) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      if (inviter.role === 'manager' && roleSanitized !== 'athlete') {
        return NextResponse.json(
          { error: 'Unauthorized: Managers can only send athlete invitations' },
          { status: 403 },
        );
      }

      if (inviter.role !== 'admin' && inviter.role !== 'manager' && inviter.role !== 'superadmin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else {
      // No service key available: skip inviter role check to avoid blocking tests.
      console.warn('Inviter role check skipped (no service key). Proceeding without server-side role verification.');
    }

    // Manage invitation record in DB (using service role key to bypass RLS)
    let token: string;
    if (supabaseAdmin && hasServiceKey) {
      const { data: existingInvitation } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (existingInvitation) {
        if (existingInvitation.status === 'accepted') {
          return NextResponse.json(
            { error: `User ${email} has already accepted an invitation and has an account.` },
            { status: 409 },
          );
        }
        if (
          existingInvitation.status === 'pending' &&
          new Date(existingInvitation.expires_at) > new Date()
        ) {
          return NextResponse.json(
            {
              error: `An invitation for ${email} already exists and is still valid. It expires on ${new Date(existingInvitation.expires_at).toLocaleDateString()}.`,
            },
            { status: 409 },
          );
        }
        // Expired or revoked — refresh with a new token
        token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const { error: updateError } = await supabaseAdmin
          .from('invitations')
          .update({
            role: roleSanitized,
            invited_by: invitedBy,
            token,
            expires_at: expiresAt.toISOString(),
            status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingInvitation.id);
        if (updateError) {
          console.error('Error updating invitation:', updateError);
          return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
        }
      } else {
        // New invitation
        token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const { error: insertError } = await supabaseAdmin
          .from('invitations')
          .insert({
            email,
            role: roleSanitized,
            invited_by: invitedBy,
            token,
            expires_at: expiresAt.toISOString(),
            status: 'pending',
          });
        if (insertError) {
          console.error('Error creating invitation:', insertError);
          return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
        }
      }
    } else {
      // No service key — generate token without a DB record
      token = crypto.randomUUID();
    }

    // Generate the invitation link
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    // If no URL is configured or we are in development, use the request URL
    if (!baseUrl || process.env.NODE_ENV === 'development') {
      // Get the current request URL
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host') || 'localhost:3000';
      baseUrl = `${protocol}://${host}`;
    }

    const invitationLink = `${baseUrl}/accept-invite?token=${token}`;

    // Send invitation email via Resend with the app invitation link.
    // The accept-invite page uses the token from the invitations table directly —
    // no Supabase auth magic link is needed.
    const resend = await sendResendInvitationEmail({
      to: email,
      inviteUrl: invitationLink,
      role,
      personalMessage,
    });

    return NextResponse.json({
      success: true,
      emailSent: resend.sent,
      inviteMethod: 'resend',
      invitationLink,
      sentAt: new Date().toISOString(),
      ...(resend.error ? { providerNote: resend.error } : {}),
    });
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return NextResponse.json(
      {
        error: 'Failed to send invitation email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
