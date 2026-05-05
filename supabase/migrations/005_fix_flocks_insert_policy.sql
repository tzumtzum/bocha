-- ============================================
-- FIX: Missing INSERT policy on flocks table
-- ============================================
-- The flocks table had SELECT and UPDATE policies but no INSERT policy.
-- This blocked onboarding from creating a default flock for new users.
-- Also fixes handle_new_user trigger to include both Telegram metadata
-- AND flock creation (was split across two migrations that overwrote each other).

-- 1. Add INSERT policy for flocks
DROP POLICY IF EXISTS "Users can create their own flocks" ON flocks;

CREATE POLICY "Users can create their own flocks"
  ON flocks FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- 2. Fix handle_new_user trigger to create profile + flock + flock_members
-- The original 001 migration only created profiles.
-- 002_telegram_auth added telegram fields but removed flock creation.
-- 002_flock_sharing added flock creation but removed telegram fields.
-- This combines both properly.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_flock_id UUID;
BEGIN
  INSERT INTO public.profiles (id, full_name, telegram_id, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->>'telegram_id')::BIGINT,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.flocks (name, owner_id)
  VALUES ('My Flock', NEW.id)
  RETURNING id INTO new_flock_id;
  
  INSERT INTO public.flock_members (flock_id, user_id, role)
  VALUES (new_flock_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
