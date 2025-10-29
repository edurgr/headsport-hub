import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const groupBy = url.searchParams.get('group_by') || 'global';

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection required for analytics' },
        { status: 500 },
      );
    }

    console.log('Analytics API called with groupBy:', groupBy);

    if (groupBy === 'athlete') {
      // Get content stats per athlete
      const { data: athletes, error: athletesError } = await supabaseAdmin
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'athlete')
        .order('name');

      if (athletesError) {
        return NextResponse.json({ error: 'Failed to fetch athletes' }, { status: 500 });
      }

      const athleteStats = await Promise.all(
        (athletes || []).map(async (athlete) => {
          // Get sessions for this athlete
          const { data: sessions } = await supabaseAdmin!
            .from('upload_sessions')
            .select('id')
            .eq('user_id', athlete.id);

          const sessionIds = (sessions || []).map((s: any) => s.id);

          if (sessionIds.length === 0) {
            return {
              athlete_id: athlete.id,
              athlete_name: athlete.name,
              athlete_email: athlete.email,
              total_content: 0,
              photos: 0,
              videos: 0,
            };
          }

          // Get file counts by type
          const [totalResult, photosResult, videosResult] = await Promise.all([
            supabaseAdmin!
              .from('upload_files')
              .select('*', { count: 'exact', head: true })
              .in('session_id', sessionIds),
            supabaseAdmin!
              .from('upload_files')
              .select('*', { count: 'exact', head: true })
              .in('session_id', sessionIds)
              .eq('file_type', 'image'),
            supabaseAdmin!
              .from('upload_files')
              .select('*', { count: 'exact', head: true })
              .in('session_id', sessionIds)
              .eq('file_type', 'video'),
          ]);

          return {
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            athlete_email: athlete.email,
            total_content: totalResult.count || 0,
            photos: photosResult.count || 0,
            videos: videosResult.count || 0,
          };
        }),
      );

      return NextResponse.json({
        success: true,
        data: athleteStats,
        type: 'athlete_breakdown',
      });
    } else {
      // Get global content stats
      const [totalResult, photosResult, videosResult] = await Promise.all([
        supabaseAdmin.from('upload_files').select('*', { count: 'exact', head: true }),
        supabaseAdmin
          .from('upload_files')
          .select('*', { count: 'exact', head: true })
          .eq('file_type', 'image'),
        supabaseAdmin
          .from('upload_files')
          .select('*', { count: 'exact', head: true })
          .eq('file_type', 'video'),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          total_content: totalResult.count || 0,
          photos: photosResult.count || 0,
          videos: videosResult.count || 0,
        },
        type: 'global_summary',
      });
    }
  } catch (error) {
    console.error('Analytics content error:', error);
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
