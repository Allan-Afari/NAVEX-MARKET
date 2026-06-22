-- Unify deal-room disputes into the single public.disputes table.
-- Safe on databases where disputes was never created (e.g. Lovable partial setup).

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID,
  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  against_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS deal_room_id UUID REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_disputes_deal_room_id ON public.disputes(deal_room_id);

-- Copy legacy deal-room disputes when the old table still exists.
DO $$
BEGIN
  IF to_regclass('public.dispute_resolutions') IS NOT NULL THEN
    INSERT INTO public.disputes (
      deal_room_id,
      initiated_by,
      against_user,
      reason,
      description,
      status,
      resolution,
      resolved_at,
      created_at,
      updated_at
    )
    SELECT
      dr.deal_room_id,
      dr.initiator_id,
      dr.defendant_id,
      dr.reason,
      dr.description,
      dr.status,
      dr.resolution,
      dr.resolved_at,
      dr.created_at,
      dr.updated_at
    FROM public.dispute_resolutions dr
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.disputes d
      WHERE d.deal_room_id = dr.deal_room_id
        AND d.initiated_by = dr.initiator_id
        AND d.against_user = dr.defendant_id
        AND d.created_at = dr.created_at
    );

    DROP TABLE public.dispute_resolutions CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users see own disputes" ON public.disputes;
CREATE POLICY "Users see own disputes" ON public.disputes
  FOR SELECT TO authenticated
  USING (
    initiated_by = auth.uid()
    OR against_user = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (
      deal_room_id IS NOT NULL
      AND deal_room_id IN (
        SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users create disputes" ON public.disputes;
CREATE POLICY "Users create disputes" ON public.disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    initiated_by = auth.uid()
    AND (
      deal_room_id IS NULL
      OR deal_room_id IN (
        SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admins update disputes" ON public.disputes;
CREATE POLICY "Admins update disputes" ON public.disputes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Parties update deal room disputes" ON public.disputes;
CREATE POLICY "Parties update deal room disputes" ON public.disputes
  FOR UPDATE TO authenticated
  USING (
    (initiated_by = auth.uid() OR against_user = auth.uid())
    AND deal_room_id IS NOT NULL
  );
