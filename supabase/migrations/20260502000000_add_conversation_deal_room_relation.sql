-- Add deal room relation for conversation-based deal room chat
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS deal_room_id UUID REFERENCES public.deal_rooms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS conversations_deal_room_id_idx ON public.conversations(deal_room_id);

DROP POLICY IF EXISTS "Users see own conversations" ON public.conversations;
CREATE POLICY "Users see own conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
    )
    OR deal_room_id IN (
      SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users create conversations" ON public.conversations;
CREATE POLICY "Users create conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      deal_room_id IS NULL
      OR deal_room_id IN (
        SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users add participants to own convos" ON public.conversation_participants;
CREATE POLICY "Users add participants to own convos" ON public.conversation_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      conversation_id IN (
        SELECT id FROM public.conversations WHERE created_by = auth.uid()
      )
      OR conversation_id IN (
        SELECT id FROM public.conversations
        WHERE deal_room_id IN (
          SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
        )
      )
    )
  );
