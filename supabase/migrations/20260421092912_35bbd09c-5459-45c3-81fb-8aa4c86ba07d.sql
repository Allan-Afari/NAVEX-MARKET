CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  opportunity_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  UNIQUE (reporter_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_opportunity ON public.reports(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own reports"
ON public.reports FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid() AND NOT public.is_suspended(auth.uid()));

CREATE POLICY "Users see own reports"
ON public.reports FOR SELECT TO authenticated
USING (reporter_id = auth.uid());

CREATE POLICY "Admins see all reports"
ON public.reports FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update reports"
ON public.reports FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));