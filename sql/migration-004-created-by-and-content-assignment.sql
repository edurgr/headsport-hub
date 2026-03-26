-- Migration 004: Add created_by to orders and assigned_to to upload_sessions
-- Run this against your Supabase project via the SQL editor or migration tool.

-- ── Orders: track which manager/admin created the order ─────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS created_by_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT,
  ADD COLUMN IF NOT EXISTS created_by_role TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_created_by_id ON orders(created_by_id);

-- ── Upload sessions: allow managers to assign content to an athlete ──────────
ALTER TABLE upload_sessions
  ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_upload_sessions_assigned_to_id ON upload_sessions(assigned_to_id);

-- Comments
COMMENT ON COLUMN orders.created_by_id   IS 'Profile ID of the manager/admin who created this order on behalf of the athlete';
COMMENT ON COLUMN orders.created_by_name IS 'Display name of the creator at time of order creation';
COMMENT ON COLUMN orders.created_by_role IS 'Role of the creator (manager, admin, superadmin) at time of order creation';
COMMENT ON COLUMN upload_sessions.assigned_to_id IS 'When set by a manager, this session''s content belongs to the specified athlete profile';
