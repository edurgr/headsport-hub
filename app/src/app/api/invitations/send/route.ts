import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { emailService } from '@/lib/email-service';
import { getSupabaseConfig } from '@/lib/supabase-config';

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
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase configuration is missing' }, 
        { status: 500 }
      );
    }

    const { email, role, token, invitedBy, personalMessage } = await request.json();

    if (!email || !role || !token || !invitedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify that the user sending the invitation is admin
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', invitedBy)
      .single();

    if (adminError || adminUser?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only administrators can send invitations' },
        { status: 403 },
      );
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

    // Verificar configuración del servicio de email
    const emailConfig = emailService.getConfigurationStatus();

    if (!emailConfig.configured && emailConfig.service !== 'mock') {
      console.warn('Email service not properly configured, using mock mode');
    }

    // Send email using the configured service
    const emailSent = await emailService.sendInvitationEmail({
      to: email,
      role,
      invitationLink,
      invitedBy,
      personalMessage,
    });

    if (!emailSent) {
      throw new Error('Failed to send invitation email');
    }

    // Log del envío exitoso

    return NextResponse.json({
      success: true,
      message: 'Invitation email sent successfully',
      invitationLink: invitationLink,
      emailService: emailConfig.service,
      serviceStatus: emailConfig.details,
      sentAt: new Date().toISOString(),
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
export const runtime = 'edge';
