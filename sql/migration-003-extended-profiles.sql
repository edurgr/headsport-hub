-- Migration 003: Extended profile fields for athlete data, financials, and hierarchy
-- Run this in your Supabase SQL editor

-- Extended profile data fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS payment_amount        DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS contract_duration_months INTEGER,
  ADD COLUMN IF NOT EXISTS instagram_followers   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_followers      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS youtube_followers     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accomplishments       JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_id              UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Index for admin_id lookups (manager → admin assignment)
CREATE INDEX IF NOT EXISTS idx_profiles_admin_id ON profiles(admin_id);

-- Comment for documentation
COMMENT ON COLUMN profiles.payment_amount IS 'Annual/monthly payment in base currency';
COMMENT ON COLUMN profiles.contract_duration_months IS 'Contract length in months';
COMMENT ON COLUMN profiles.instagram_followers IS 'Instagram follower count';
COMMENT ON COLUMN profiles.tiktok_followers IS 'TikTok follower count';
COMMENT ON COLUMN profiles.youtube_followers IS 'YouTube subscriber count';
COMMENT ON COLUMN profiles.accomplishments IS 'Array of {title, date, description} objects';
COMMENT ON COLUMN profiles.admin_id IS 'Admin this manager is assigned to (manager → admin hierarchy)';
