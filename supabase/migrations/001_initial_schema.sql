-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  username TEXT,
  telegram_id BIGINT UNIQUE,
  weight_unit TEXT DEFAULT 'g' CHECK (weight_unit IN ('g', 'oz')),
  timezone TEXT DEFAULT 'UTC',
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  reminders_enabled BOOLEAN DEFAULT false,
  reminder_time TIME,
  is_pro BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- SPECIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS species (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  common_names TEXT[],
  avg_weight_g DECIMAL(6,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE species ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Species are viewable by all authenticated users"
  ON species FOR SELECT
  TO authenticated
  USING (true);

-- Seed species data
INSERT INTO species (name) VALUES
  ('Budgerigar'),
  ('Cockatiel'),
  ('African Grey'),
  ('Macaw'),
  ('Conure'),
  ('Lovebird'),
  ('Eclectus'),
  ('Cockatoo'),
  ('Canary'),
  ('Finch'),
  ('Parrotlet'),
  ('Quaker Parrot'),
  ('Caique'),
  ('Pionus'),
  ('Rosella'),
  ('Kakariki'),
  ('Lorikeet'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

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

CREATE POLICY "Users can view flocks they belong to"
  ON flocks FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can create flocks"
  ON flocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their flocks"
  ON flocks FOR UPDATE
  USING (auth.uid() = owner_id);

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

CREATE POLICY "Users can view members of their flocks"
  ON flock_members FOR SELECT
  USING (auth.uid() = user_id);

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

CREATE INDEX idx_flock_members_flock_id ON flock_members(flock_id);
CREATE INDEX idx_flock_members_user_id ON flock_members(user_id);

-- ============================================
-- BIRDS TABLE
-- ============================================
CREATE TYPE bird_status AS ENUM ('active', 'monitoring', 'deceased');
CREATE TYPE date_type AS ENUM ('hatched', 'adopted');

CREATE TABLE IF NOT EXISTS birds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flock_id UUID REFERENCES flocks(id),
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  date_of_birth DATE,
  date_type date_type DEFAULT 'hatched',
  target_weight DECIMAL(6,2),
  current_weight DECIMAL(6,2),
  status bird_status DEFAULT 'active',
  avatar_url TEXT,
  avatar_color JSONB DEFAULT '{"bg": "#e0f2fe", "fg": "#0ea5e9"}',
  timezone TEXT DEFAULT 'UTC',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE birds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own birds"
  ON birds FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_birds_user_id ON birds(user_id);
CREATE INDEX idx_birds_status ON birds(status);
CREATE INDEX idx_birds_flock_id ON birds(flock_id);

-- ============================================
-- DAILY LOGS TABLE
-- ============================================
CREATE TYPE log_type AS ENUM ('quick', 'full');
CREATE TYPE overall_status AS ENUM ('normal', 'off', 'concerning');
CREATE TYPE activity_level AS ENUM ('normal', 'low', 'lethargic');
CREATE TYPE appetite_type AS ENUM ('normal', 'reduced', 'increased');
CREATE TYPE poop_feces_color AS ENUM ('green', 'brown', 'black', 'yellow', 'red', 'orange');
CREATE TYPE poop_feces_consistency AS ENUM ('formed', 'loose', 'watery', 'dry');
CREATE TYPE poop_urates_color AS ENUM ('white', 'yellow', 'green', 'brown', 'red');
CREATE TYPE poop_urine_amount AS ENUM ('normal', 'increased', 'decreased');

CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bird_id UUID NOT NULL REFERENCES birds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  log_type log_type DEFAULT 'quick',
  weight DECIMAL(6,2),
  weight_unit TEXT DEFAULT 'g' CHECK (weight_unit IN ('g', 'oz')),
  overall_status overall_status DEFAULT 'normal',
  activity_level activity_level DEFAULT 'normal',
  appetite appetite_type DEFAULT 'normal',
  poop_feces_color poop_feces_color,
  poop_feces_consistency poop_feces_consistency,
  poop_urates_color poop_urates_color,
  poop_urine_amount poop_urine_amount,
  poop_photo_url TEXT,
  observations TEXT,
  custom_fields JSONB DEFAULT '[]',
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own daily logs"
  ON daily_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_daily_logs_bird_id ON daily_logs(bird_id);
CREATE INDEX idx_daily_logs_user_id ON daily_logs(user_id);
CREATE INDEX idx_daily_logs_log_date ON daily_logs(log_date);
CREATE INDEX idx_daily_logs_bird_date ON daily_logs(bird_id, log_date);

-- ============================================
-- MEDICATIONS TABLE
-- ============================================
CREATE TYPE medication_route AS ENUM ('oral', 'injected', 'in_water', 'topical');

CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bird_id UUID NOT NULL REFERENCES birds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  route medication_route DEFAULT 'oral',
  schedule TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own medications"
  ON medications FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_medications_bird_id ON medications(bird_id);

-- ============================================
-- MEDICATION LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  bird_id UUID NOT NULL REFERENCES birds(id) ON DELETE CASCADE,
  given_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own medication logs"
  ON medication_logs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM medications m 
    WHERE m.id = medication_logs.medication_id 
    AND m.user_id = auth.uid()
  ));

CREATE INDEX idx_medication_logs_medication_id ON medication_logs(medication_id);

-- ============================================
-- EGG LOGS TABLE
-- ============================================
CREATE TYPE shell_appearance AS ENUM ('normal', 'thin', 'soft', 'irregular', 'discolored');
CREATE TYPE fertile_status AS ENUM ('yes', 'no', 'unknown', 'not_candled');

CREATE TABLE IF NOT EXISTS egg_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bird_id UUID NOT NULL REFERENCES birds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  laid_at DATE NOT NULL,
  egg_number INTEGER,
  clutch_id UUID,
  location TEXT,
  shell_appearance shell_appearance DEFAULT 'normal',
  fertile fertile_status DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE egg_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own egg logs"
  ON egg_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_egg_logs_bird_id ON egg_logs(bird_id);

-- ============================================
-- REMINDERS TABLE
-- ============================================
CREATE TYPE reminder_type AS ENUM ('weigh', 'observe', 'medication', 'custom');

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bird_id UUID REFERENCES birds(id) ON DELETE CASCADE,
  type reminder_type DEFAULT 'custom',
  reminder_time TIME,
  days_of_week INTEGER[],
  active BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own reminders"
  ON reminders FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_bird_id ON reminders(bird_id);

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

CREATE POLICY "Users can view invites for their flocks"
  ON flock_invites FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Owners and admins can create invites"
  ON flock_invites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE INDEX idx_flock_invites_token ON flock_invites(token);
CREATE INDEX idx_flock_invites_flock_id ON flock_invites(flock_id);

-- ============================================
-- STORAGE: Bird Photos Bucket
-- ============================================
-- Create the bucket (run this in Supabase Dashboard SQL Editor or via CLI)
-- Note: Storage buckets are typically created via the Supabase Dashboard or API,
-- but here are the SQL commands for reference:

-- INSERT INTO storage.buckets (id, name, public) VALUES ('bird-photos', 'bird-photos', true);

-- RLS policy for storage
-- CREATE POLICY "Users can upload own bird photos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'bird-photos' AND auth.uid() = owner);

-- CREATE POLICY "Users can view own bird photos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'bird-photos' AND auth.uid() = owner);

-- CREATE POLICY "Users can delete own bird photos"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'bird-photos' AND auth.uid() = owner);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Trigger to create profile + default flock on signup
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- DEMO DATA: Bobo the Tutorial Cockatiel
-- This bird is created as a template that onboarding can reference
-- ============================================

-- Function to create demo bird for a user (called during onboarding)
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

  -- Add some demo daily logs for Bobo
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
