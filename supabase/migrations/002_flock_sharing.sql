-- ============================================
-- FLOCK SHARING MIGRATION
-- ============================================

-- 1. Create flocks table
CREATE TABLE IF NOT EXISTS flocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'My Flock',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create flock_members table
CREATE TABLE IF NOT EXISTS flock_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(flock_id, user_id)
);

-- 3. Create flock_invites table
CREATE TABLE IF NOT EXISTS flock_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ
);

-- 4. Add flock_id to birds
ALTER TABLE birds ADD COLUMN flock_id UUID REFERENCES flocks(id);

-- 5. Create default flocks for existing users and assign their birds
DO $$
DECLARE
  user_record RECORD;
  new_flock_id UUID;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id FROM birds
  LOOP
    INSERT INTO flocks (name, owner_id)
    VALUES ('My Flock', user_record.user_id)
    RETURNING id INTO new_flock_id;
    
    INSERT INTO flock_members (flock_id, user_id, role)
    VALUES (new_flock_id, user_record.user_id, 'owner');
    
    UPDATE birds SET flock_id = new_flock_id WHERE user_id = user_record.user_id;
  END LOOP;
END $$;

-- 6. Make flock_id NOT NULL
ALTER TABLE birds ALTER COLUMN flock_id SET NOT NULL;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Flocks RLS
ALTER TABLE flocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view flocks they belong to"
  ON flocks FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM flock_members fm
      WHERE fm.flock_id = flocks.id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their flock"
  ON flocks FOR UPDATE
  USING (owner_id = auth.uid());

-- Flock members RLS
ALTER TABLE flock_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their flocks"
  ON flock_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM flock_members fm
      WHERE fm.flock_id = flock_members.flock_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage flock members"
  ON flock_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flock_members fm
      WHERE fm.flock_id = flock_members.flock_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'owner'
    )
  );

-- Flock invites RLS
ALTER TABLE flock_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invites for their flocks"
  ON flock_invites FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM flock_members fm
      WHERE fm.flock_id = flock_invites.flock_id
      AND fm.user_id = auth.uid()
      AND fm.role IN ('owner', 'admin')
    )
  );

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

-- Birds RLS (updated for flock access)
DROP POLICY IF EXISTS "Users can CRUD own birds" ON birds;

CREATE POLICY "Users can access birds in their flocks"
  ON birds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flock_members fm
      WHERE fm.flock_id = birds.flock_id
      AND fm.user_id = auth.uid()
    )
  );

-- Daily logs RLS (updated for flock access via bird)
DROP POLICY IF EXISTS "Users can CRUD own daily logs" ON daily_logs;

CREATE POLICY "Users can access logs for birds in their flocks"
  ON daily_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flock_members fm
      JOIN birds b ON b.flock_id = fm.flock_id
      WHERE b.id = daily_logs.bird_id
      AND fm.user_id = auth.uid()
    )
  );

-- Medications RLS (updated for flock access via bird)
DROP POLICY IF EXISTS "Users can CRUD own medications" ON medications;

CREATE POLICY "Users can access medications for birds in their flocks"
  ON medications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flock_members fm
      JOIN birds b ON b.flock_id = fm.flock_id
      WHERE b.id = medications.bird_id
      AND fm.user_id = auth.uid()
    )
  );

-- Medication logs RLS (updated for flock access via medication → bird)
DROP POLICY IF EXISTS "Users can CRUD own medication logs" ON medication_logs;

CREATE POLICY "Users can access medication logs for birds in their flocks"
  ON medication_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flock_members fm
      JOIN birds b ON b.flock_id = fm.flock_id
      JOIN medications m ON m.bird_id = b.id
      WHERE m.id = medication_logs.medication_id
      AND fm.user_id = auth.uid()
    )
  );

-- Egg logs RLS (updated for flock access via bird)
DROP POLICY IF EXISTS "Users can CRUD own egg logs" ON egg_logs;

CREATE POLICY "Users can access egg logs for birds in their flocks"
  ON egg_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flock_members fm
      JOIN birds b ON b.flock_id = fm.flock_id
      WHERE b.id = egg_logs.bird_id
      AND fm.user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Update handle_new_user to create default flock
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_flock_id UUID;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.flocks (name, owner_id)
  VALUES ('My Flock', NEW.id)
  RETURNING id INTO new_flock_id;
  
  INSERT INTO public.flock_members (flock_id, user_id, role)
  VALUES (new_flock_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update create_demo_bird to use flock_id
CREATE OR REPLACE FUNCTION create_demo_bird(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_bird_id UUID;
  v_flock_id UUID;
BEGIN
  SELECT id INTO v_flock_id FROM flocks WHERE owner_id = p_user_id LIMIT 1;
  
  INSERT INTO birds (
    user_id, flock_id, name, species, date_of_birth, date_type,
    target_weight, current_weight, status, avatar_color, timezone, sort_order
  ) VALUES (
    p_user_id, v_flock_id, 'Bobo', 'Cockatiel', '2023-01-15', 'hatched',
    95.0, 96.5, 'active', '{"bg": "#fef3c7", "fg": "#f59e0b"}', 'UTC', 0
  )
  RETURNING id INTO v_bird_id;

  INSERT INTO daily_logs (bird_id, user_id, log_date, log_type, weight, weight_unit, overall_status, activity_level, appetite, observations, logged_at)
  SELECT 
    v_bird_id,
    p_user_id,
    d::DATE,
    'full',
    95.0 + (random() * 6 - 3),
    'g',
    CASE WHEN random() > 0.8 THEN 'off' ELSE 'normal' END,
    'normal',
    'normal',
    CASE WHEN d = CURRENT_DATE - 1 THEN 'Ate well today, very playful!' ELSE NULL END,
    d::TIMESTAMPTZ
  FROM generate_series(CURRENT_DATE - 14, CURRENT_DATE - 1, '1 day'::INTERVAL) d;

  RETURN v_bird_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_flocks_owner_id ON flocks(owner_id);
CREATE INDEX idx_flock_members_flock_id ON flock_members(flock_id);
CREATE INDEX idx_flock_members_user_id ON flock_members(user_id);
CREATE INDEX idx_flock_invites_token ON flock_invites(token);
CREATE INDEX idx_flock_invites_flock_id ON flock_invites(flock_id);
CREATE INDEX idx_birds_flock_id ON birds(flock_id);
