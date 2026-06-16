ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS smile_job_id text,
  ADD COLUMN IF NOT EXISTS smile_job_status text,
  ADD COLUMN IF NOT EXISTS smile_verified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL;