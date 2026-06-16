
-- 1. Profiles: add suspension fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- 2. Deals: add admin takedown fields
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS is_removed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS removal_reason text,
  ADD COLUMN IF NOT EXISTS removed_at timestamptz;

-- 3. Update "Read published deals" policy to exclude removed deals
DROP POLICY IF EXISTS "Read published deals" ON public.deals;
CREATE POLICY "Read published deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (stage = 'published' AND is_removed = false);

-- 4. Allow admins to update any profile (suspension + verification overrides)
CREATE POLICY "Admins update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Allow admins to read all profiles (needed for admin panel)
CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Allow admins to update any deal (takedowns)
CREATE POLICY "Admins update any deal"
  ON public.deals FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Verification requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_type text NOT NULL,
  document_url text NOT NULL,
  business_registration_number text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own verification requests"
  ON public.verification_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins see all verification requests"
  ON public.verification_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own verification requests"
  ON public.verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update verification requests"
  ON public.verification_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. Trigger: when a verification request is approved, mark profile verified;
--    when rejected, mark profile rejected. Also set profile to pending on submission.
CREATE OR REPLACE FUNCTION public.sync_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
       SET verification_status = 'pending', updated_at = now()
     WHERE id = NEW.user_id
       AND verification_status NOT IN ('verified');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.profiles
         SET verification_status = 'verified', updated_at = now()
       WHERE id = NEW.user_id;
    ELSIF NEW.status = 'rejected' THEN
      UPDATE public.profiles
         SET verification_status = 'rejected', updated_at = now()
       WHERE id = NEW.user_id;
    END IF;
    NEW.reviewed_at := now();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_verification_status_ins ON public.verification_requests;
CREATE TRIGGER trg_sync_verification_status_ins
  AFTER INSERT ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_verification_status();

DROP TRIGGER IF EXISTS trg_sync_verification_status_upd ON public.verification_requests;
CREATE TRIGGER trg_sync_verification_status_upd
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_verification_status();

-- 9. Storage bucket for verification docs (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users upload to their own folder, admins can read all
CREATE POLICY "Users upload own verification docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users read own verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins read all verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND public.has_role(auth.uid(), 'admin')
  );
