-- 1. New columns on deals (used as "investment opportunities")
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS expected_return text;

-- Backfill industry from sector so existing rows look clean
UPDATE public.deals SET industry = sector WHERE industry IS NULL AND sector IS NOT NULL;

-- 2. access_unlocks table — investor unlocks contact for an opportunity
CREATE TABLE IF NOT EXISTS public.access_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL,
  opportunity_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investor_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_access_unlocks_investor ON public.access_unlocks(investor_id);
CREATE INDEX IF NOT EXISTS idx_access_unlocks_opportunity ON public.access_unlocks(opportunity_id);

ALTER TABLE public.access_unlocks ENABLE ROW LEVEL SECURITY;

-- Investor inserts their own unlock
CREATE POLICY "Investors create own unlocks"
ON public.access_unlocks
FOR INSERT
TO authenticated
WITH CHECK (investor_id = auth.uid() AND NOT public.is_suspended(auth.uid()));

-- Investor sees their own unlocks; business owner sees unlocks for their opportunities
CREATE POLICY "Read relevant unlocks"
ON public.access_unlocks
FOR SELECT
TO authenticated
USING (
  investor_id = auth.uid()
  OR opportunity_id IN (SELECT id FROM public.deals WHERE created_by = auth.uid())
);