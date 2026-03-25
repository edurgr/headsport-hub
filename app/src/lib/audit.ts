import { createClient } from '@supabase/supabase-js';

export interface AuditEvent {
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Inserts an audit event into the audit_logs table.
 * Fails silently — a logging failure should never break the main operation.
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return;

    const admin = createClient(supabaseUrl, serviceKey);
    await admin.from('audit_logs').insert({
      ...event,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never throw — audit logging is best-effort
  }
}
