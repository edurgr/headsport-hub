import { NextRequest, NextResponse } from 'next/server';

import { verifyAdminAccessBypass } from '@/lib/admin-auth-bypass';
import { BackupService } from '@/lib/backup';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    // Check admin access
    const adminResult = await verifyAdminAccessBypass();
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status });
    }

    // const supabase = await supabaseServer();

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'operations') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const status = url.searchParams.get('status');

      const result = await BackupService.getBackupOperations(
        limit,
        (page - 1) * limit,
        status as any,
      );

      return NextResponse.json(result);
    }

    if (action === 'stats') {
      const stats = await BackupService.getBackupStats();
      return NextResponse.json(stats);
    }

    if (action === 'schedules') {
      const schedules = await BackupService.getBackupSchedules();
      return NextResponse.json({ schedules });
    }

    if (action === 'settings') {
      const settings = await BackupService.getBackupSettings();
      return NextResponse.json({ settings });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in backup API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { type, tables_included: _tables_included } = body;

      if (!type) {
        return NextResponse.json({ error: 'Backup type is required' }, { status: 400 });
      }

      const backupId = await BackupService.createBackup(type, user.id);

      // Log the action
      // const requestInfo = getRequestInfo(req);
      // await AuditLogger.logAction(
      //   'backup_created',
      //   'system',
      //   backupId,
      //   { backup_type: type, tables_included },
      //   user.id,
      //   user.email
      // );

      // Start backup process asynchronously
      BackupService.performBackup(backupId, type).catch((error) => {
        console.error('Backup process failed:', error);
      });

      return NextResponse.json({ backup_id: backupId });
    }

    if (action === 'schedule') {
      const { name, type, cron_expression, retention_days, tables_to_include } = body;

      if (!name || !type || !cron_expression) {
        return NextResponse.json(
          { error: 'Name, type, and cron expression are required' },
          { status: 400 },
        );
      }

      await BackupService.createBackupSchedule({
        name,
        type,
        cron_expression,
        is_active: true,
        retention_days: retention_days || 30,
        tables_to_include,
      });

      // Log the action
      // const requestInfo = getRequestInfo(req);
      // await AuditLogger.logAction(
      //   'backup_schedule_created',
      //   'system',
      //   'backup_system',
      //   { schedule_name: name, backup_type: type, cron_expression },
      //   user.id,
      //   user.email
      // );

      return NextResponse.json({ success: true });
    }

    if (action === 'cleanup') {
      const { retention_days } = body;
      const deletedCount = await BackupService.cleanupOldBackups(retention_days || 30);

      // Log the action
      // const requestInfo = getRequestInfo(req);
      // await AuditLogger.logAction(
      //   'backup_cleanup',
      //   'system',
      //   'backup_system',
      //   { retention_days: retention_days || 30, deleted_count: deletedCount },
      //   user.id,
      //   user.email
      // );

      return NextResponse.json({ deleted_count: deletedCount });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in backup API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'schedule') {
      const { schedule_id, updates } = body;

      if (!schedule_id) {
        return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
      }

      await BackupService.updateBackupSchedule(schedule_id, updates);

      // Log the action
      // const requestInfo = getRequestInfo(req);
      // await AuditLogger.logAction(
      //   'backup_schedule_updated',
      //   'system',
      //   schedule_id,
      //   { updates },
      //   user.id,
      //   user.email
      // );

      return NextResponse.json({ success: true });
    }

    if (action === 'settings') {
      const { settings } = body;

      await BackupService.updateBackupSettings(settings);

      // Log the action
      // const requestInfo = getRequestInfo(req);
      // await AuditLogger.logAction(
      //   'backup_settings_updated',
      //   'system',
      //   'backup_system',
      //   { settings },
      //   user.id,
      //   user.email
      // );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in backup API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(req.url);
    const scheduleId = url.searchParams.get('schedule_id');

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    await BackupService.deleteBackupSchedule(scheduleId);

    // Log the action
    // const requestInfo = getRequestInfo(req);
    // await AuditLogger.logAction(
    //   'backup_schedule_deleted',
    //   'system',
    //   scheduleId,
    //   {},
    //   user.id,
    //   user.email
    // );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in backup API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
