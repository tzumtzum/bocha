-- Fix infinite recursion in flock_members RLS policies
-- Run this in Supabase SQL Editor

-- ============================================
-- SECURITY DEFINER helper functions (bypass RLS)
-- ============================================

-- Check if a user is a member of a given flock
CREATE OR REPLACE FUNCTION user_belongs_to_flock(p_flock_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM flock_members
    WHERE flock_id = p_flock_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if a user is an owner or admin of a given flock
CREATE OR REPLACE FUNCTION user_is_flock_admin(p_flock_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM flock_members
    WHERE flock_id = p_flock_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Fix flocks SELECT policy
-- ============================================
DROP POLICY IF EXISTS "Users can view flocks they belong to" ON flocks;
CREATE POLICY "Users can view flocks they belong to"
  ON flocks FOR SELECT
  USING (user_belongs_to_flock(id, auth.uid()));

-- ============================================
-- Fix flock_members SELECT policy (was causing recursion)
-- ============================================
DROP POLICY IF EXISTS "Users can view members of their flocks" ON flock_members;
CREATE POLICY "Users can view members of their flocks"
  ON flock_members FOR SELECT
  USING (user_belongs_to_flock(flock_id, auth.uid()));

-- ============================================
-- Fix flock_members INSERT policy (was causing recursion)
-- ============================================
DROP POLICY IF EXISTS "Owners and admins can add members" ON flock_members;
CREATE POLICY "Owners and admins can add members"
  ON flock_members FOR INSERT
  TO authenticated
  WITH CHECK (user_is_flock_admin(flock_id, auth.uid()));

-- ============================================
-- Fix flock_invites policies (same pattern)
-- ============================================
DROP POLICY IF EXISTS "Users can view invites for their flocks" ON flock_invites;
CREATE POLICY "Users can view invites for their flocks"
  ON flock_invites FOR SELECT
  USING (user_belongs_to_flock(flock_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can create invites" ON flock_invites;
CREATE POLICY "Owners and admins can create invites"
  ON flock_invites FOR INSERT
  TO authenticated
  WITH CHECK (user_is_flock_admin(flock_id, auth.uid()));
