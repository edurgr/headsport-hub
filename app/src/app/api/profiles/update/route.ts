import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

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
      expectedContentUploads,
      costPerAthlete,
      competitionPerformance,
      festivalAchievements,
      awards,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    // Update the profile with the provided data
    const { data, error } = await sb
      .from('profiles')
      .update({
        name,
        email,
        phone,
        organization,
        // Store performance metrics in a JSON field or separate columns
        performance_metrics: {
          expectedContentUploads: expectedContentUploads ? parseInt(expectedContentUploads) : null,
          costPerAthlete: costPerAthlete ? parseFloat(costPerAthlete) : null,
          competitionPerformance,
          festivalAchievements,
          awards,
          notes,
        },
        updated_at: new Date().toISOString(),
      })
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
