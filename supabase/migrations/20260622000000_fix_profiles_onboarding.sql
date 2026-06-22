-- Profile columns required by onboarding, dashboard, and profile pages.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS preferred_sectors TEXT[],
  ADD COLUMN IF NOT EXISTS trust_score NUMERIC(3, 1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_onboarded_at ON public.profiles(onboarded_at);

-- Allow business/investor values used by the app alongside legacy roles.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_role_check
  CHECK (
    user_role = ANY (
      ARRAY[
        'investor'::text,
        'business_owner'::text,
        'business'::text,
        'artisan'::text,
        'general'::text
      ]
    )
  );
