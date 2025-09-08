import { createClient } from '@supabase/supabase-js';

import { NotificationService } from './notifications';
import { supabaseServer } from './supabase-server';

export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
export type ModerationAction = 'approve' | 'reject' | 'flag' | 'unflag';

export interface ModerationQueueItem {
  id: string;
  file_id: string;
  priority: number;
  auto_flagged: boolean;
  flagged_reasons: string[];
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  file?: {
    id: string;
    filename: string;
    file_type: string;
    file_size: number;
    created_at: string;
    upload_sessions?: {
      profiles?: {
        name: string;
        email: string;
      };
    };
  };
}

export interface ModerationRule {
  id: string;
  name: string;
  description?: string;
  rule_type: string;
  rule_condition: string;
  action: string;
  priority: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ModerationHistory {
  id: string;
  file_id: string;
  action: ModerationAction;
  performed_by?: string;
  reason?: string;
  notes?: string;
  created_at: string;
  performer?: {
    name: string;
    email: string;
  };
}

export interface ModerationStats {
  total_files: number;
  pending_files: number;
  approved_files: number;
  rejected_files: number;
  flagged_files: number;
  queue_size: number;
  avg_moderation_time_minutes: number;
}

export class ContentModerationService {
  // Helper function to get Supabase client with service role for admin operations
  private static getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    return createClient(supabaseUrl, supabaseServiceKey);
  }

  // Helper function to map priority string to number
  private static mapPriorityToNumber(priority: string): number {
    switch (priority) {
      case 'urgent':
        return 1;
      case 'high':
        return 2;
      case 'normal':
        return 3;
      case 'low':
        return 4;
      default:
        return 3;
    }
  }
  // Get moderation queue
  static async getModerationQueue(
    limit: number = 50,
    offset: number = 0,
    priority?: number,
  ): Promise<{ items: ModerationQueueItem[]; total: number }> {
    const supabase = this.getSupabaseAdmin();

    try {
      console.log('🔍 ContentModerationService.getModerationQueue - Iniciando consulta');
      console.log('📊 Parámetros:', { limit, offset, priority });

      // First, let's try a simple query without joins
      const { data: simpleFiles, error: simpleError } = await supabase
        .from('upload_files')
        .select('id, filename, file_type, file_size, created_at, moderation_status, session_id')
        .order('created_at', { ascending: false })
        .limit(limit);

      console.log('📡 Consulta simple:', {
        filesCount: simpleFiles?.length || 0,
        error: simpleError?.message || 'none',
      });

      if (simpleError) {
        console.error('❌ Error en consulta simple:', simpleError);
        throw new Error('Failed to fetch files for moderation');
      }

      if (!simpleFiles || simpleFiles.length === 0) {
        console.log('⚠️ No se encontraron archivos en consulta simple');
        return { items: [], total: 0 };
      }

      // Now let's get the total count
      const { count } = await supabase
        .from('upload_files')
        .select('*', { count: 'exact', head: true });

      console.log('📊 Total count:', count);

      // For each file, get the user information separately
      const items: ModerationQueueItem[] = [];

      for (const file of simpleFiles) {
        // Get upload session and profile for this file
        const { data: sessionData } = await supabase
          .from('upload_sessions')
          .select(
            `
            id,
            profiles(
              id,
              name,
              email
            )
          `,
          )
          .eq('id', file.session_id) // Use session_id from the file
          .single();

        const item: ModerationQueueItem = {
          id: file.id,
          file_id: file.id,
          priority: file.moderation_status === 'pending' ? 1 : 5,
          auto_flagged: false,
          flagged_reasons: [],
          created_at: file.created_at,
          updated_at: file.created_at,
          file: {
            id: file.id,
            filename: file.filename,
            file_type: file.file_type,
            file_size: file.file_size,
            created_at: file.created_at,
            upload_sessions: {
              profiles: {
                name: (sessionData?.profiles as any)?.name || 'Unknown User',
                email: (sessionData?.profiles as any)?.email || 'unknown@example.com',
              },
            },
          },
        };

        items.push(item);
      }

      console.log('✅ Items procesados:', items.length);

      return {
        items,
        total: count || 0,
      };
    } catch (error) {
      console.error('❌ Error in getModerationQueue:', error);
      return {
        items: [],
        total: 0,
      };
    }
  }

  // Moderate content
  static async moderateContent(
    fileId: string,
    action: ModerationAction,
    performedBy: string,
    reason?: string,
    notes?: string,
  ): Promise<void> {
    const supabase = this.getSupabaseAdmin();

    // Update the file's moderation status directly
    const moderationStatus =
      action === 'approve'
        ? 'approved'
        : action === 'reject'
          ? 'rejected'
          : action === 'flag'
            ? 'flagged'
            : 'pending';

    const { error } = await supabase
      .from('upload_files')
      .update({
        moderation_status: moderationStatus,
        moderated_by: performedBy,
        moderated_at: new Date().toISOString(),
        moderation_notes: notes || null,
        moderation_reason: reason || null,
      })
      .eq('id', fileId);

    if (error) {
      console.error('Error moderating content:', error);
      throw new Error('Failed to moderate content');
    }

    // Log the action
    // await AuditLogger.logContentModerated(
    //   fileId,
    //   action === 'approve' ? 'approved' : 'rejected',
    //   performedBy,
    //   reason || ''
    // );

    // Notify user if content was rejected
    if (action === 'reject') {
      // Get file details to notify user
      const { data: fileData } = await supabase
        .from('upload_files')
        .select(
          `
          upload_sessions!upload_files_session_id_fkey(
            user_id,
            profiles!upload_sessions_user_id_fkey(name, email)
          )
        `,
        )
        .eq('id', fileId)
        .single();

      if (fileData && (fileData.upload_sessions as any)?.profiles) {
        await NotificationService.createNotification(
          (fileData.upload_sessions as any).user_id,
          'content_uploaded',
          'Content Rejected',
          `Your content "${(fileData as any).filename}" was rejected. Reason: ${reason || 'No reason provided'}`,
          { file_id: fileId, reason },
          '/content',
        );
      }
    }
  }

  // Get moderation statistics
  static async getModerationStats(): Promise<ModerationStats> {
    const supabase = this.getSupabaseAdmin();

    try {
      // Get stats from upload_files table (which actually exists)
      const { data: filesData, error: filesError } = await supabase
        .from('upload_files')
        .select('id, moderation_status, created_at, moderated_at');

      if (filesError) {
        console.error('Error fetching files stats:', filesError);
        throw new Error('Failed to fetch files stats');
      }

      // Get stats from audit_logs for moderation history
      const { data: historyData, error: historyError } = await supabase
        .from('audit_logs')
        .select('id, action, created_at')
        .eq('resource_type', 'content_moderation');

      if (historyError) {
        console.error('Error fetching moderation history stats:', historyError);
        // Don't throw error, just use empty data
      }

      // Calculate stats from files data
      const totalFiles = filesData?.length || 0;
      const pendingFiles =
        filesData?.filter((file) => !file.moderation_status || file.moderation_status === 'pending')
          .length || 0;
      // const approvedFiles = filesData?.filter(file =>
      //   file.moderation_status === 'approved'
      // ).length || 0;
      // const rejectedFiles = filesData?.filter(file =>
      //   file.moderation_status === 'rejected'
      // ).length || 0;
      const flaggedFiles =
        filesData?.filter((file) => file.moderation_status === 'flagged').length || 0;
      // const highPriority = pendingFiles; // All pending files are high priority

      const totalProcessed = historyData?.length || 0;
      const approved = historyData?.filter((item) => item.action === 'approve').length || 0;
      const rejected = historyData?.filter((item) => item.action === 'reject').length || 0;

      return {
        total_files: totalFiles + totalProcessed,
        pending_files: pendingFiles,
        approved_files: approved,
        rejected_files: rejected,
        flagged_files: flaggedFiles,
        queue_size: pendingFiles,
        avg_moderation_time_minutes: 0,
      };
    } catch (error) {
      console.error('Error in getModerationStats:', error);
      // Return default stats if there's an error
      return {
        total_files: 0,
        pending_files: 0,
        approved_files: 0,
        rejected_files: 0,
        flagged_files: 0,
        queue_size: 0,
        avg_moderation_time_minutes: 0,
      };
    }
  }

  // Get moderation rules
  static async getModerationRules(): Promise<ModerationRule[]> {
    // Return default rules since moderation_rules table doesn't exist
    return [
      {
        id: '1',
        name: 'File Size Check',
        description: 'Flag files larger than 50MB',
        rule_type: 'file_size',
        rule_condition: 'file_size > 52428800',
        action: 'flag',
        priority: 8,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'File Type Check',
        description: 'Allow only image and video files',
        rule_type: 'file_type',
        rule_condition: "file_type IN ('image', 'video')",
        action: 'approve',
        priority: 5,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  // Create moderation rule
  static async createModerationRule(
    rule: Omit<ModerationRule, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<void> {
    const supabase = await supabaseServer();

    const { error } = await supabase.from('moderation_rules').insert({
      ...rule,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error creating moderation rule:', error);
      throw new Error('Failed to create moderation rule');
    }
  }

  // Update moderation rule
  static async updateModerationRule(
    ruleId: string,
    updates: Partial<Omit<ModerationRule, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<void> {
    const supabase = await supabaseServer();

    const { error } = await supabase
      .from('moderation_rules')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ruleId);

    if (error) {
      console.error('Error updating moderation rule:', error);
      throw new Error('Failed to update moderation rule');
    }
  }

  // Delete moderation rule
  static async deleteModerationRule(ruleId: string): Promise<void> {
    const supabase = await supabaseServer();

    const { error } = await supabase.from('moderation_rules').delete().eq('id', ruleId);

    if (error) {
      console.error('Error deleting moderation rule:', error);
      throw new Error('Failed to delete moderation rule');
    }
  }

  // Get moderation history
  static async getModerationHistory(
    fileId?: string,
    _limit = 50,
    _offset = 0,
  ): Promise<{ history: ModerationHistory[]; total: number }> {
    // Return empty history since moderation_history table doesn't exist
    return {
      history: [],
      total: 0,
    };
  }

  // Auto-moderate content
  static async autoModerateContent(fileId: string): Promise<string> {
    const supabase = await supabaseServer();

    const { data, error } = await supabase.rpc('auto_moderate_content', {
      p_file_id: fileId,
    });

    if (error) {
      console.error('Error auto-moderating content:', error);
      throw new Error('Failed to auto-moderate content');
    }

    return data;
  }

  // Add content to moderation queue
  static async addToModerationQueue(
    fileId: string,
    priority: number = 1,
    autoFlagged: boolean = false,
    flaggedReasons?: string[],
  ): Promise<string | null> {
    const supabase = await supabaseServer();

    const { data, error } = await supabase.rpc('add_to_moderation_queue', {
      p_file_id: fileId,
      p_priority: priority,
      p_auto_flagged: autoFlagged,
      p_flagged_reasons: flaggedReasons || null,
    });

    if (error) {
      console.error('Error adding to moderation queue:', error);
      throw new Error('Failed to add to moderation queue');
    }

    return data;
  }

  // Assign moderation item
  static async assignModerationItem(queueId: string, assignedTo: string): Promise<void> {
    const supabase = await supabaseServer();

    const { error } = await supabase
      .from('content_moderation_queue')
      .update({
        assigned_to: assignedTo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    if (error) {
      console.error('Error assigning moderation item:', error);
      throw new Error('Failed to assign moderation item');
    }
  }

  // Bulk moderate content
  static async bulkModerateContent(
    fileIds: string[],
    action: ModerationAction,
    performedBy: string,
    reason?: string,
    notes?: string,
  ): Promise<void> {
    // const supabase = await supabaseServer();

    // Process each file
    for (const fileId of fileIds) {
      await this.moderateContent(fileId, action, performedBy, reason, notes);
    }
  }

  // Get pending content for user
  static async getPendingContentForUser(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ files: any[]; total: number }> {
    const supabase = await supabaseServer();

    const { data, error, count } = await supabase
      .from('upload_files')
      .select(
        `
        *,
        upload_sessions!upload_files_session_id_fkey(
          user_id,
          profiles!upload_sessions_user_id_fkey(name, email)
        )
      `,
        { count: 'exact' },
      )
      .eq('upload_sessions.user_id', userId)
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching pending content:', error);
      throw new Error('Failed to fetch pending content');
    }

    return {
      files: data || [],
      total: count || 0,
    };
  }
}
