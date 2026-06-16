
-- Deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  sector TEXT,
  location TEXT,
  funding_amount NUMERIC(15,2),
  funding_type TEXT NOT NULL DEFAULT 'equity',
  stage TEXT NOT NULL DEFAULT 'published',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  investor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Deal interests
CREATE TABLE public.deal_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id, user_id)
);
ALTER TABLE public.deal_interests ENABLE ROW LEVEL SECURITY;

-- Deal milestones
CREATE TABLE public.deal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_milestones ENABLE ROW LEVEL SECURITY;

-- Deal updates
CREATE TABLE public.deal_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_updates ENABLE ROW LEVEL SECURITY;

-- Deal activity log
CREATE TABLE public.deal_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Deals: all authenticated can see published, creator can manage
CREATE POLICY "Read published deals" ON public.deals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Creator inserts deals" ON public.deals
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator updates deals" ON public.deals
  FOR UPDATE TO authenticated USING (created_by = auth.uid() OR investor_id = auth.uid());

-- Deal interests: creator and interested user can see
CREATE POLICY "Read own interests" ON public.deal_interests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR deal_id IN (SELECT id FROM public.deals WHERE created_by = auth.uid()));

CREATE POLICY "Users express interest" ON public.deal_interests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own interest" ON public.deal_interests
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Milestones: deal participants
CREATE POLICY "Read deal milestones" ON public.deal_milestones
  FOR SELECT TO authenticated
  USING (deal_id IN (SELECT id FROM public.deals WHERE created_by = auth.uid() OR investor_id = auth.uid()));

CREATE POLICY "Creator manages milestones" ON public.deal_milestones
  FOR INSERT TO authenticated
  WITH CHECK (deal_id IN (SELECT id FROM public.deals WHERE created_by = auth.uid()));

CREATE POLICY "Creator updates milestones" ON public.deal_milestones
  FOR UPDATE TO authenticated
  USING (deal_id IN (SELECT id FROM public.deals WHERE created_by = auth.uid() OR investor_id = auth.uid()));

-- Deal updates: participants
CREATE POLICY "Read deal updates" ON public.deal_updates
  FOR SELECT TO authenticated
  USING (deal_id IN (SELECT id FROM public.deals WHERE created_by = auth.uid() OR investor_id = auth.uid()));

CREATE POLICY "Participants post updates" ON public.deal_updates
  FOR INSERT TO authenticated
  WITH CHECK (posted_by = auth.uid() AND deal_id IN (SELECT id FROM public.deals WHERE created_by = auth.uid() OR investor_id = auth.uid()));

-- Activity log: participants
CREATE POLICY "Read deal activity" ON public.deal_activity_log
  FOR SELECT TO authenticated
  USING (deal_id IN (SELECT id FROM public.deals WHERE created_by = auth.uid() OR investor_id = auth.uid()));

CREATE POLICY "System logs activity" ON public.deal_activity_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
