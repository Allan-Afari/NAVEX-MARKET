-- Add onboarding tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_onboarded ON public.profiles(onboarded_at);