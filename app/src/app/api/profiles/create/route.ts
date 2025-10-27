import { NextResponse } from 'next/server';

import {
  addSecurityHeaders,
  createSecureErrorResponse,
  schemas,
  validateRequest,
} from '@/lib/security';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

interface CreateProfileRequest {
  email: string;
  name: string;
  role: 'athlete' | 'manager' | 'admin';
  organization?: string;
  // Additional fields removed to match current DB schema
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate request body with Zod schema
    const validation = validateRequest(schemas.profile, body);
    if (!validation.success) {
      return addSecurityHeaders(createSecureErrorResponse(validation.error, 400));
    }

    const { email, name, role, organization } = validation.data;

    const sb = await supabaseServer();

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await sb
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      return addSecurityHeaders(createSecureErrorResponse('Failed to check existing profile', 500));
    }

    if (existingProfile) {
      return addSecurityHeaders(
        createSecureErrorResponse('Profile with this email already exists', 409),
      );
    }

    // Ensure admin client is configured
    if (!supabaseAdmin) {
      return addSecurityHeaders(createSecureErrorResponse('Server configuration error', 500));
    }

    // Try to create auth user (or retrieve existing)
    let userId: string | null = null;
    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser(
      {
        email,
        email_confirm: true,
      },
    );

    if (createUserError) {
      // If user already exists, try to resolve profile by email
      // Fallback: find profile by email to get id
      const { data: existingByEmail, error: findByEmailError } = await sb
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (findByEmailError || !existingByEmail) {
        return NextResponse.json(
          {
            error: 'Failed to create or find existing user: ' + createUserError.message,
          },
          { status: 500 },
        );
      }
      userId = existingByEmail.id;
    } else {
      userId = createdUser.user?.id ?? null;
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID not available after creation' }, { status: 500 });
    }

    // At this point, the signup trigger should have created a profile row. Update it with provided details.
    const { data: profile, error: updateError } = await sb
      .from('profiles')
      .update({
        email,
        name,
        role,
        organization: organization || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update profile: ' + updateError.message },
        { status: 500 },
      );
    }

    // Optional: default address table not present in schema; skipping.

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile,
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
export const runtime = 'edge';
