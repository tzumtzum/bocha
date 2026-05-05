-- ============================================
-- FIX FLOCK RLS POLICIES
-- ============================================
-- The self-referential policies on flock_members caused rows to be
-- hidden in some Supabase/PostgreSQL configurations. This migration
-- replaces them with simpler, non-recursive policies.

-- 1. flock_members: allow any authenticated user to view memberships
--    (membership info is low-sensitivity; insert/update/delete still restricted)
DROP POLICY IF EXISTS "Users can view members of their flocks" ON flock_members;
CREATE POLICY "Authenticated users can view flock_members"
  ON flock_members FOR SELECT
  TO authenticated
  USING (true);

-- 2. flocks: visible if user is a member (via flock_members subquery)
DROP POLICY IF EXISTS "Users can view flocks they belong to" ON flocks;
CREATE POLICY "Users can view flocks they belong to"
  ON flocks FOR SELECT
  USING (
    id IN (
      SELECT flock_id FROM flock_members WHERE user_id = auth.uid()
    )
  );

-- 3. flock_invites: keep restrictive but non-recursive
DROP POLICY IF EXISTS "Users can view invites for their flocks" ON flock_invites;
CREATE POLICY "Users can view invites for flocks they belong to"
  ON flock_invites FOR SELECT
  USING (
    flock_id IN (
      SELECT flock_id FROM flock_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners and admins can create invites" ON flock_invites;
CREATE POLICY "Owners and admins can create invites"
  ON flock_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM flock_members fm
      WHERE fm.flock_id = flock_invites.flock_id
      AND fm.user_id = auth.uid()
      AND fm.role IN ('owner', 'admin')
    )
  );
