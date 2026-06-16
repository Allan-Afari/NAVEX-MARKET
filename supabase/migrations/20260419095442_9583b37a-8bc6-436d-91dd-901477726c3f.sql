-- Helper function: is this user suspended?
CREATE OR REPLACE FUNCTION public.is_suspended(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_suspended FROM public.profiles WHERE id = _user_id), false)
$$;

-- Tighten INSERT policies to block suspended users
DROP POLICY IF EXISTS "Creator inserts deals" ON public.deals;
CREATE POLICY "Creator inserts deals"
ON public.deals FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND NOT public.is_suspended(auth.uid()));

DROP POLICY IF EXISTS "Participants send messages" ON public.messages;
CREATE POLICY "Participants send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND NOT public.is_suspended(auth.uid())
  AND conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users express interest" ON public.deal_interests;
CREATE POLICY "Users express interest"
ON public.deal_interests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND NOT public.is_suspended(auth.uid()));

DROP POLICY IF EXISTS "Users create disputes" ON public.disputes;
CREATE POLICY "Users create disputes"
ON public.disputes FOR INSERT TO authenticated
WITH CHECK (initiated_by = auth.uid() AND NOT public.is_suspended(auth.uid()));