import { supabaseServer } from './supabase-server';

export type NotificationType = 
  | 'order_pending' 
  | 'order_approved' 
  | 'order_rejected'
  | 'user_registered'
  | 'content_uploaded'
  | 'system_alert'
  | 'invitation_sent'
  | 'backup_completed'
  | 'backup_failed'
  | 'security_alert';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  data?: Record<string, any>;
  action_url?: string;
  expires_at?: string;
  created_at: string;
  read_at?: string;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title_template: string;
  message_template: string;
  priority: NotificationPriority;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class NotificationService {
  // Create a notification
  static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    actionUrl?: string,
    priority: NotificationPriority = 'medium',
    expiresAt?: Date
  ): Promise<string> {
    const supabase = await supabaseServer();
    
    const { data: result, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_data: data || null,
      p_action_url: actionUrl || null,
      p_priority: priority,
      p_expires_at: expiresAt?.toISOString() || null
    });

    if (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }

    return result;
  }

  // Create notification from template
  static async createFromTemplate(
    userId: string,
    type: NotificationType,
    templateData?: Record<string, any>,
    actionUrl?: string,
    expiresAt?: Date
  ): Promise<string> {
    const supabase = await supabaseServer();
    
    const { data: result, error } = await supabase.rpc('create_notification_from_template', {
      p_user_id: userId,
      p_type: type,
      p_template_data: templateData || null,
      p_action_url: actionUrl || null,
      p_expires_at: expiresAt?.toISOString() || null
    });

    if (error) {
      console.error('Error creating notification from template:', error);
      throw new Error('Failed to create notification from template');
    }

    return result;
  }

  // Notify all admins
  static async notifyAllAdmins(
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    actionUrl?: string,
    priority: NotificationPriority = 'medium'
  ): Promise<number> {
    const supabase = await supabaseServer();
    
    const { data: result, error } = await supabase.rpc('notify_all_admins', {
      p_type: type,
      p_title: title,
      p_message: message,
      p_data: data || null,
      p_action_url: actionUrl || null,
      p_priority: priority
    });

    if (error) {
      console.error('Error notifying admins:', error);
      throw new Error('Failed to notify admins');
    }

    return result;
  }

  // Get user notifications
  static async getUserNotifications(
    userId: string,
    status?: NotificationStatus,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ notifications: Notification[]; total: number }> {
    const supabase = await supabaseServer();
    
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error('Failed to fetch notifications');
    }

    return {
      notifications: data || [],
      total: count || 0
    };
  }

  // Mark notification as read
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    const supabase = await supabaseServer();
    
    const { error } = await supabase
      .from('notifications')
      .update({ 
        status: 'read',
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId: string): Promise<void> {
    const supabase = await supabaseServer();
    
    const { error } = await supabase
      .from('notifications')
      .update({ 
        status: 'read',
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'unread');

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  // Archive notification
  static async archiveNotification(notificationId: string, userId: string): Promise<void> {
    const supabase = await supabaseServer();
    
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'archived' })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error archiving notification:', error);
      throw new Error('Failed to archive notification');
    }
  }

  // Get unread count
  static async getUnreadCount(userId: string): Promise<number> {
    const supabase = await supabaseServer();
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'unread');

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  }

  // Clean up expired notifications
  static async cleanupExpired(): Promise<number> {
    const supabase = await supabaseServer();
    
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Error cleaning up expired notifications:', error);
      return 0;
    }

    return data?.length || 0;
  }

  // Get notification templates
  static async getTemplates(): Promise<NotificationTemplate[]> {
    const supabase = await supabaseServer();
    
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('is_active', true)
      .order('type');

    if (error) {
      console.error('Error fetching templates:', error);
      throw new Error('Failed to fetch templates');
    }

    return data || [];
  }

  // Update notification template
  static async updateTemplate(
    templateId: string,
    updates: Partial<NotificationTemplate>
  ): Promise<void> {
    const supabase = await supabaseServer();
    
    const { error } = await supabase
      .from('notification_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId);

    if (error) {
      console.error('Error updating template:', error);
      throw new Error('Failed to update template');
    }
  }
}

// Convenience methods for common notifications
export class AdminNotifications {
  // Notify when new order is pending
  static async notifyOrderPending(orderId: string, userId: string, userName: string, totalAmount: number): Promise<void> {
    await NotificationService.notifyAllAdmins(
      'order_pending',
      'New Order Pending Approval',
      `Order #${orderId} from ${userName} is pending your approval. Total: $${totalAmount}`,
      { order_id: orderId, user_id: userId, user_name: userName, total_amount: totalAmount },
      `/orders/pending`,
      'high'
    );
  }

  // Notify when user registers
  static async notifyUserRegistered(userId: string, userName: string, userEmail: string, userRole: string): Promise<void> {
    await NotificationService.notifyAllAdmins(
      'user_registered',
      'New User Registration',
      `New user ${userName} (${userEmail}) has registered with role ${userRole}`,
      { user_id: userId, user_name: userName, user_email: userEmail, user_role: userRole },
      `/profile-management`,
      'medium'
    );
  }

  // Notify when content is uploaded
  static async notifyContentUploaded(userId: string, userName: string, contentTitle: string): Promise<void> {
    await NotificationService.notifyAllAdmins(
      'content_uploaded',
      'New Content Uploaded',
      `User ${userName} has uploaded new content: ${contentTitle}`,
      { user_id: userId, user_name: userName, content_title: contentTitle },
      `/content`,
      'low'
    );
  }

  // Notify system alerts
  static async notifySystemAlert(message: string, priority: NotificationPriority = 'high'): Promise<void> {
    await NotificationService.notifyAllAdmins(
      'system_alert',
      'System Alert',
      message,
      { alert_message: message },
      undefined,
      priority
    );
  }

  // Notify security alerts
  static async notifySecurityAlert(details: string): Promise<void> {
    await NotificationService.notifyAllAdmins(
      'security_alert',
      'Security Alert',
      `Security alert: ${details}`,
      { alert_details: details },
      undefined,
      'critical'
    );
  }
}
