-- Fix missing flock tables and RLS policies
-- Run this in Supabase SQL Editor if you get RLS errors on flock creation

-- ============================================
-- SECURITY DEFINER helpers (must be created BEFORE policies)
-- ============================================
CREATE OR REPLACE FUNCTION user_belongs_to_flock(p_flock_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM flock_members WHERE flock_id = p_flock_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_is_flock_admin(p_flock_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM flock_members
    WHERE flock_id = p_flock_id AND user_id = p_user_id AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FLOCKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS flocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE flocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view flocks they belong to" ON flocks;
CREATE POLICY "Users can view flocks they belong to"
  ON flocks FOR SELECT
  USING (user_belongs_to_flock(id, auth.uid()));

DROP POLICY IF EXISTS "Owners can create flocks" ON flocks;
CREATE POLICY "Owners can create flocks"
  ON flocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their flocks" ON flocks;
CREATE POLICY "Owners can update their flocks"
  ON flocks FOR UPDATE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete their flocks" ON flocks;
CREATE POLICY "Owners can delete their flocks"
  ON flocks FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================
-- FLOCK MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS flock_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(flock_id, user_id)
);

ALTER TABLE flock_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members of their flocks" ON flock_members;
CREATE POLICY "Users can view members of their flocks"
  ON flock_members FOR SELECT
  USING (user_belongs_to_flock(flock_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can add members" ON flock_members;
CREATE POLICY "Owners and admins can add members"
  ON flock_members FOR INSERT
  TO authenticated
  WITH CHECK (user_is_flock_admin(flock_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_flock_members_flock_id ON flock_members(flock_id);
CREATE INDEX IF NOT EXISTS idx_flock_members_user_id ON flock_members(user_id);

-- ============================================
-- FLOCK INVITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS flock_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE flock_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invites for their flocks" ON flock_invites;
CREATE POLICY "Users can view invites for their flocks"
  ON flock_invites FOR SELECT
  USING (user_belongs_to_flock(flock_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can create invites" ON flock_invites;
CREATE POLICY "Owners and admins can create invites"
  ON flock_invites FOR INSERT
  TO authenticated
  WITH CHECK (user_is_flock_admin(flock_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_flock_invites_token ON flock_invites(token);
CREATE INDEX IF NOT EXISTS idx_flock_invites_flock_id ON flock_invites(flock_id);
