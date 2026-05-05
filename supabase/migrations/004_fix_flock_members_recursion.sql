-- ============================================
-- FIX: Infinite recursion in flock_members RLS
-- ============================================
-- The "Owners can manage flock members" policy in 002_flock_sharing.sql
-- queries flock_members recursively, causing infinite recursion when
-- Supabase evaluates RLS for SELECT on that table.
--
-- Fix: Replace the self-referential subquery with a query against flocks.owner_id.

DROP POLICY IF EXISTS "Owners can manage flock members" ON flock_members;

CREATE POLICY "Owners can manage flock members"
  ON flock_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flocks
      WHERE flocks.id = flock_members.flock_id
      AND flocks.owner_id = auth.uid()
    )
  );
