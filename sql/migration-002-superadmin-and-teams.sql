-- Migration 002: Add superadmin role + team structure (manager_id)
-- Run this in Supabase SQL Editor
-- Adjusted to the exact tables that exist in this project.

-- ============================================================
-- 1. Add 'superadmin' to user_role enum
-- ============================================================
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';
EXCEPTION WHEN others THEN null;
END $$;

-- ============================================================
-- 2. Update helper functions to include superadmin
--    All RLS policies that call these functions are updated automatically.
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT role::text FROM public.profiles WHERE id = user_id) IN ('admin', 'superadmin');
END;
$$;

CREATE OR REPLACE FUNCTION is_manager_or_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT role::text FROM public.profiles WHERE id = user_id) IN ('manager', 'admin', 'superadmin');
END;
$$;

-- ============================================================
-- 3. Add manager_id to profiles (manager → athlete team link)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);

-- ============================================================
-- 4. Profiles: explicit superadmin policies
-- ============================================================
DROP POLICY IF EXISTS "Superadmin can view all profiles" ON public.profiles;
CREATE POLICY "Superadmin can view all profiles"
  ON public.profiles FOR SELECT
  USING ((SELECT role::text FROM public.profiles WHERE id = auth.uid()) = 'superadmin');

DROP POLICY IF EXISTS "Superadmin can update all profiles" ON public.profiles;
CREATE POLICY "Superadmin can update all profiles"
  ON public.profiles FOR UPDATE
  USING ((SELECT role::text FROM public.profiles WHERE id = auth.uid()) = 'superadmin');

DROP POLICY IF EXISTS "Superadmin can delete profiles" ON public.profiles;
CREATE POLICY "Superadmin can delete profiles"
  ON public.profiles FOR DELETE
  USING ((SELECT role::text FROM public.profiles WHERE id = auth.uid()) = 'superadmin');

-- ============================================================
-- 5. Orders: add INSERT/DELETE for managers/admins/superadmin
-- ============================================================
DROP POLICY IF EXISTS "Managers and admins can insert orders" ON public.orders;
CREATE POLICY "Managers and admins can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (is_manager_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Managers and admins can delete orders" ON public.orders;
CREATE POLICY "Managers and admins can delete orders"
  ON public.orders FOR DELETE
  USING (is_manager_or_admin(auth.uid()));

-- ============================================================
-- 6. Order items: full management for managers/admins/superadmin
-- ============================================================
DROP POLICY IF EXISTS "Managers and admins can manage all order items" ON public.order_items;
CREATE POLICY "Managers and admins can manage all order items"
  ON public.order_items FOR ALL
  USING (is_manager_or_admin(auth.uid()));

-- ============================================================
-- 7. Upload sessions: full management for managers/admins/superadmin
-- ============================================================
DROP POLICY IF EXISTS "Managers and admins can manage all upload sessions" ON public.upload_sessions;
CREATE POLICY "Managers and admins can manage all upload sessions"
  ON public.upload_sessions FOR ALL
  USING (is_manager_or_admin(auth.uid()));

-- ============================================================
-- 8. Upload files: full management for managers/admins/superadmin
-- ============================================================
DROP POLICY IF EXISTS "Managers and admins can manage all upload files" ON public.upload_files;
CREATE POLICY "Managers and admins can manage all upload files"
  ON public.upload_files FOR ALL
  USING (is_manager_or_admin(auth.uid()));

-- ============================================================
-- 9. Invitations: managers/admins/superadmin can manage
-- ============================================================
DROP POLICY IF EXISTS "Managers and admins can manage invitations" ON public.invitations;
CREATE POLICY "Managers and admins can manage invitations"
  ON public.invitations FOR ALL
  USING (is_manager_or_admin(auth.uid()));

-- ============================================================
-- 10. Product tables: admins/superadmin full management
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage accessories" ON public.accessories;
CREATE POLICY "Admins can manage accessories" ON public.accessories
  FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage bindings" ON public.bindings;
CREATE POLICY "Admins can manage bindings" ON public.bindings
  FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage boots" ON public.boots;
CREATE POLICY "Admins can manage boots" ON public.boots
  FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage goggles" ON public.goggles;
CREATE POLICY "Admins can manage goggles" ON public.goggles
  FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage helmet" ON public.helmet;
CREATE POLICY "Admins can manage helmet" ON public.helmet
  FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage ski" ON public.ski;
CREATE POLICY "Admins can manage ski" ON public.ski
  FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage snowboards_boards" ON public.snowboards_boards;
CREATE POLICY "Admins can manage snowboards_boards" ON public.snowboards_boards
  FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage snowboards_bindings" ON public.snowboards_bindings;
CREATE POLICY "Admins can manage snowboards_bindings" ON public.snowboards_bindings
  FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage snowboards_boots" ON public.snowboards_boots;
CREATE POLICY "Admins can manage snowboards_boots" ON public.snowboards_boots
  FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage snowboards_accessories" ON public.snowboards_accessories;
CREATE POLICY "Admins can manage snowboards_accessories" ON public.snowboards_accessories
  FOR ALL USING (is_admin(auth.uid()));

-- ============================================================
-- 11. Audit logs: admins/superadmin can insert and read
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage audit logs" ON public.audit_logs;
CREATE POLICY "Admins can manage audit logs" ON public.audit_logs
  FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- ============================================================
-- 12. Update signup trigger to preserve existing elevated roles
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.profiles
  WHERE email = new.email AND id <> new.id;

  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'athlete')
  ON CONFLICT (id) DO UPDATE
    SET email = excluded.email,
        updated_at = now();
  -- NOTE: role is NOT updated on conflict — preserves any elevated role

  RETURN new;
END;
$$;

ALTER FUNCTION public.create_profile_for_user() OWNER TO postgres;

-- ============================================================
-- Done.
-- ============================================================
