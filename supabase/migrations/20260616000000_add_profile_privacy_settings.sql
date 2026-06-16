-- Add privacy settings storage to user profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS privacy_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
