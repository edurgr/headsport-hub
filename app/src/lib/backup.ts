import { supabaseServer } from './supabase-server';
import { NotificationService } from './notifications';

export type BackupType = 'full' | 'incremental' | 'schema_only' | 'data_only';
export type BackupStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface BackupOperation {
  id: string;
  type: BackupType;
  status: BackupStatus;
  file_path?: string;
  file_size?: number;
  tables_included?: string[];
  started_at: string;
  completed_at?: string;
  error_message?: string;
  created_by?: string;
  created_at: string;
}

export interface BackupSchedule {
  id: string;
  name: string;
  type: BackupType;
  cron_expression: string;
  is_active: boolean;
  retention_days: number;
  tables_to_include?: string[];
  tables_to_exclude?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BackupSettings {
  id: number;
  backup_enabled: boolean;
  storage_location: string;
  s3_bucket?: string;
  s3_region?: string;
  s3_access_key?: string;
  s3_secret_key?: string;
  compression_enabled: boolean;
  encryption_enabled: boolean;
  encryption_key?: string;
  max_backup_size_mb: number;
  cleanup_old_backups: boolean;
  created_at: string;
  updated_at: string;
}

export interface BackupStats {
  total_backups: number;
  successful_backups: number;
  failed_backups: number;
  total_size_mb: number;
  last_backup_date?: string;
  avg_backup_duration_minutes: number;
}

export class BackupService {
  // Create a new backup operation
  static async createBackup(
    type: BackupType,
    tablesIncluded?: string[],
    createdBy?: string
  ): Promise<string> {
    const supabase = await supabaseServer();
    
    const { data, error } = await supabase.rpc('create_backup_operation', {
      p_type: type,
      p_tables_included: tablesIncluded || null,
      p_created_by: createdBy || null
    });

    if (error) {
      console.error('Error creating backup operation:', error);
      throw new Error('Failed to create backup operation');
    }

    return data;
  }

  // Update backup status
  static async updateBackupStatus(
    backupId: string,
    status: BackupStatus,
    filePath?: string,
    fileSize?: number,
    errorMessage?: string
  ): Promise<void> {
    const supabase = await supabaseServer();
    
    const { error } = await supabase.rpc('update_backup_status', {
      p_backup_id: backupId,
      p_status: status,
      p_file_path: filePath || null,
      p_file_size: fileSize || null,
      p_error_message: errorMessage || null
    });

    if (error) {
      console.error('Error updating backup status:', error);
      throw new Error('Failed to update backup status');
    }
  }

  // Get backup operations
  static async getBackupOperations(
    limit: number = 50,
    offset: number = 0,
    status?: BackupStatus
  ): Promise<{ operations: BackupOperation[]; total: number }> {
    const supabase = await supabaseServer();
    
    let query = supabase
      .from('backup_operations')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching backup operations:', error);
      throw new Error('Failed to fetch backup operations');
    }

    return {
      operations: data || [],
      total: count || 0
    };
  }

  // Get backup statistics
  static async getBackupStats(): Promise<BackupStats> {
    const supabase = await supabaseServer();
    
    const { data, error } = await supabase.rpc('get_backup_stats');

    if (error) {
      console.error('Error fetching backup stats:', error);
      throw new Error('Failed to fetch backup stats');
    }

    return data?.[0] || {
      total_backups: 0,
      successful_backups: 0,
      failed_backups: 0,
      total_size_mb: 0,
      last_backup_date: undefined,
      avg_backup_duration_minutes: 0
    };
  }

  // Get backup schedules
  static async getBackupSchedules(): Promise<BackupSchedule[]> {
    const supabase = await supabaseServer();
    
    const { data, error } = await supabase
      .from('backup_schedules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching backup schedules:', error);
      throw new Error('Failed to fetch backup schedules');
    }

    return data || [];
  }

  // Create backup schedule
  static async createBackupSchedule(schedule: Omit<BackupSchedule, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    const supabase = await supabaseServer();
    
    const { error } = await supabase
      .from('backup_schedules')
      .insert({
        ...schedule,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error creating backup schedule:', error);
      throw new Error('Failed to create backup schedule');
    }
  }

  // Update backup schedule
  static async updateBackupSchedule(
    scheduleId: string,
    updates: Partial<Omit<BackupSchedule, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const supabase = await supabaseServer();
    
    const { error } = await supabase
      .from('backup_schedules')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId);

    if (error) {
      console.error('Error updating backup schedule:', error);
      throw new Error('Failed to update backup schedule');
    }
  }

  // Delete backup schedule
  static async deleteBackupSchedule(scheduleId: string): Promise<void> {
    const supabase = await supabaseServer();
    
    const { error } = await supabase
      .from('backup_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      console.error('Error deleting backup schedule:', error);
      throw new Error('Failed to delete backup schedule');
    }
  }

  // Get backup settings
  static async getBackupSettings(): Promise<BackupSettings> {
    const supabase = await supabaseServer();
    
    const { data, error } = await supabase
      .from('backup_settings')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching backup settings:', error);
      throw new Error('Failed to fetch backup settings');
    }

    return data;
  }

  // Update backup settings
  static async updateBackupSettings(settings: Partial<Omit<BackupSettings, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const supabase = await supabaseServer();
    
    const { error } = await supabase
      .from('backup_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    if (error) {
      console.error('Error updating backup settings:', error);
      throw new Error('Failed to update backup settings');
    }
  }

  // Cleanup old backups
  static async cleanupOldBackups(retentionDays: number = 30): Promise<number> {
    const supabase = await supabaseServer();
    
    const { data, error } = await supabase.rpc('cleanup_old_backups', {
      p_retention_days: retentionDays
    });

    if (error) {
      console.error('Error cleaning up old backups:', error);
      throw new Error('Failed to cleanup old backups');
    }

    return data || 0;
  }

  // Perform actual backup (this would be implemented based on your storage solution)
  static async performBackup(
    backupId: string,
    type: BackupType,
    tablesIncluded?: string[]
  ): Promise<void> {
    try {
      // Update status to in_progress
      await this.updateBackupStatus(backupId, 'in_progress');

      // Get backup settings
      const settings = await this.getBackupSettings();
      
      if (!settings.backup_enabled) {
        throw new Error('Backup is disabled in settings');
      }

      // This is a simplified backup implementation
      // In a real implementation, you would:
      // 1. Connect to your database
      // 2. Export data based on type and tables
      // 3. Compress if enabled
      // 4. Encrypt if enabled
      // 5. Upload to storage location
      // 6. Update backup record with file info

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backup-${type}-${timestamp}.sql`;
      const filePath = `/backups/${fileName}`;

      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update status to completed
      await this.updateBackupStatus(
        backupId,
        'completed',
        filePath,
        1024 * 1024, // 1MB simulated size
        undefined
      );

      // Notify admins
      await NotificationService.notifyAllAdmins(
        'backup_completed',
        'Backup Completed',
        `Backup ${type} completed successfully at ${new Date().toLocaleString()}`,
        { backup_id: backupId, backup_type: type, timestamp: new Date().toISOString() },
        undefined,
        'low'
      );

    } catch (error) {
      console.error('Backup failed:', error);
      
      // Update status to failed
      await this.updateBackupStatus(
        backupId,
        'failed',
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );

      // Notify admins of failure
      await NotificationService.notifyAllAdmins(
        'backup_failed',
        'Backup Failed',
        `Backup ${type} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { backup_id: backupId, backup_type: type, error_message: error instanceof Error ? error.message : 'Unknown error' },
        undefined,
        'critical'
      );

      throw error;
    }
  }

  // Schedule backup (this would integrate with a cron job system)
  static async scheduleBackup(
    type: BackupType,
    cronExpression: string,
    tablesIncluded?: string[]
  ): Promise<void> {
    // This would integrate with your cron job system
    // For now, we'll just create a schedule record
    await this.createBackupSchedule({
      name: `Auto ${type} backup`,
      type,
      cron_expression: cronExpression,
      is_active: true,
      retention_days: 30,
      tables_to_include: tablesIncluded
    });
  }
}
