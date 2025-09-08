-- Fix RLS policies for invitations table to allow managers to view athlete invitations
-- This script adds a policy that allows managers to see athlete invitations

-- Add policy for managers to view athlete invitations
CREATE POLICY "Managers can view athlete invitations" ON invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'manager'
    )
    AND role = 'athlete'
  );

-- Add policy for managers to create athlete invitations
CREATE POLICY "Managers can create athlete invitations" ON invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'manager'
    )
    AND role = 'athlete'
  );

-- Note: Managers cannot update or delete invitations (only admins can)
-- This maintains security while allowing managers to manage athlete invitations
