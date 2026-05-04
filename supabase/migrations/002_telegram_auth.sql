-- ============================================
-- TELEGRAM AUTH SECRETS TABLE
-- Stores random passwords for Telegram-authenticated users.
-- Service-role only — no RLS policies. Never expose to client.
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_auth (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- UPDATE PROFILES TRIGGER
-- Copies telegram_id from user metadata on signup if present.
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, telegram_id, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->>'telegram_id')::BIGINT,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
