-- Migration 002: Add superadmin role + team structure (manager_id)
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (idempotent where possible)

-- ============================================================
-- 1. Add 'superadmin' to user_role enum
-- ============================================================
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';
EXCEPTION WHEN others THEN null;
END $$;

-- ============================================================
-- 2. Update helper functions to include superadmin
-- ============================================================

-- is_admin: returns TRUE for admin AND superadmin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT role::text FROM public.profiles WHERE id = user_id) IN ('admin', 'superadmin');
END;
$$;

-- is_manager_or_admin: returns TRUE for manager, admin AND superadmin
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
-- 3. Add manager_id to profiles (team structure)
--    Nullable: managers and admins don't have a manager
--    Athletes can be assigned to a manager
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);

-- ============================================================
-- 4. Ensure RLS policies explicitly handle superadmin
--    (The helper functions above handle this automatically, but
--     we add explicit superadmin policies for clarity and safety)
-- ============================================================

-- Profiles: superadmin can see ALL profiles
DROP POLICY IF EXISTS "Superadmin can view all profiles" ON public.profiles;
CREATE POLICY "Superadmin can view all profiles"
  ON public.profiles FOR SELECT
  USING ((SELECT role::text FROM public.profiles WHERE id = auth.uid()) = 'superadmin');

-- Profiles: superadmin can update ALL profiles
DROP POLICY IF EXISTS "Superadmin can update all profiles" ON public.profiles;
CREATE POLICY "Superadmin can update all profiles"
  ON public.profiles FOR UPDATE
  USING ((SELECT role::text FROM public.profiles WHERE id = auth.uid()) = 'superadmin');

-- Profiles: superadmin can delete profiles
DROP POLICY IF EXISTS "Superadmin can delete profiles" ON public.profiles;
CREATE POLICY "Superadmin can delete profiles"
  ON public.profiles FOR DELETE
  USING ((SELECT role::text FROM public.profiles WHERE id = auth.uid()) = 'superadmin');

-- Orders: the is_manager_or_admin() fix above already covers superadmin,
-- but we also need superadmin to be able to INSERT/DELETE orders
DROP POLICY IF EXISTS "Managers and admins can insert orders" ON public.orders;
CREATE POLICY "Managers and admins can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (is_manager_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Managers and admins can delete orders" ON public.orders;
CREATE POLICY "Managers and admins can delete orders"
  ON public.orders FOR DELETE
  USING (is_manager_or_admin(auth.uid()));

-- Order items: managers/admins can manage all
DROP POLICY IF EXISTS "Managers and admins can manage all order items" ON public.order_items;
CREATE POLICY "Managers and admins can manage all order items"
  ON public.order_items FOR ALL
  USING (is_manager_or_admin(auth.uid()));

-- Upload sessions: managers/admins can manage all
DROP POLICY IF EXISTS "Managers and admins can manage all upload sessions" ON public.upload_sessions;
CREATE POLICY "Managers and admins can manage all upload sessions"
  ON public.upload_sessions FOR ALL
  USING (is_manager_or_admin(auth.uid()));

-- Upload files: managers/admins can manage all
DROP POLICY IF EXISTS "Managers and admins can manage all upload files" ON public.upload_files;
CREATE POLICY "Managers and admins can manage all upload files"
  ON public.upload_files FOR ALL
  USING (is_manager_or_admin(auth.uid()));

-- Equipment: managers/admins can manage all
DROP POLICY IF EXISTS "Managers and admins can manage all equipment" ON public.equipment;
CREATE POLICY "Managers and admins can manage all equipment"
  ON public.equipment FOR ALL
  USING (is_manager_or_admin(auth.uid()));

-- Products: is_admin() now includes superadmin, so existing policies work.
-- Add explicit delete for admins/superadmins on product tables.
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

DROP POLICY IF EXISTS "Admins can manage snowboard" ON public.snowboard;
CREATE POLICY "Admins can manage snowboard" ON public.snowboard
  FOR ALL USING (is_admin(auth.uid()));

-- ============================================================
-- 5. Also update the signup trigger so new users default to
--    'athlete' (this is already the case, no change needed).
--    But update the create_profile_for_user function to NOT
--    override an existing role when profile already exists.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Avoid UNIQUE(email) conflicts
  DELETE FROM public.profiles
  WHERE email = new.email AND id <> new.id;

  -- Create profile, but preserve existing role if profile already exists
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'athlete')
  ON CONFLICT (id) DO UPDATE
    SET email = excluded.email,
        updated_at = now();
  -- NOTE: role is NOT updated on conflict, preserving any elevated role

  RETURN new;
END;
$$;

ALTER FUNCTION public.create_profile_for_user() OWNER TO postgres;

-- ============================================================
-- Done.
-- After running this migration:
-- 1. superadmin users can be stored in the profiles table
-- 2. superadmin passes all is_admin() and is_manager_or_admin() checks
-- 3. Athletes can be assigned to a manager via profiles.manager_id
-- ============================================================
