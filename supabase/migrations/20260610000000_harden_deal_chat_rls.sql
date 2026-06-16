-- Harden deal chat and unlock-related RLS policies

-- 1) Lock down access unlock records
DROP POLICY IF EXISTS "Investors update own unlocks" ON public.access_unlocks;
CREATE POLICY "Investors update own unlocks" ON public.access_unlocks
  FOR UPDATE TO authenticated
  USING (investor_id = auth.uid())
  WITH CHECK (investor_id = auth.uid());

DROP POLICY IF EXISTS "Investors delete own unlocks" ON public.access_unlocks;
CREATE POLICY "Investors delete own unlocks" ON public.access_unlocks
  FOR DELETE TO authenticated
  USING (investor_id = auth.uid());

-- 2) Enforce unlock-based deal conversation creation and read access
DROP POLICY IF EXISTS "Users see own conversations" ON public.conversations;
CREATE POLICY "Users see own conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR id IN (
      SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
    )
    OR deal_room_id IN (
      SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
    )
    OR deal_id IN (
      SELECT opportunity_id FROM public.access_unlocks WHERE investor_id = auth.uid()
    )
    OR deal_id IN (
      SELECT id FROM public.deals WHERE created_by = auth.uid()
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
      OR deal_id IN (
        SELECT opportunity_id FROM public.access_unlocks WHERE investor_id = auth.uid()
      )
      OR deal_id IN (
        SELECT id FROM public.deals WHERE created_by = auth.uid()
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
      OR conversation_id IN (
        SELECT id FROM public.conversations
        WHERE deal_id IN (
          SELECT opportunity_id FROM public.access_unlocks WHERE investor_id = auth.uid()
        )
      )
      OR conversation_id IN (
        SELECT id FROM public.conversations WHERE deal_id IN (
          SELECT id FROM public.deals WHERE created_by = auth.uid()
        )
      )
    )
  );

-- 3) Restrict generic and deal conversations messages to authorized participants and unlocks
DROP POLICY IF EXISTS "Participants read messages" ON public.messages;
CREATE POLICY "Participants read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
    )
    OR conversation_id IN (
      SELECT id FROM public.conversations WHERE created_by = auth.uid()
    )
    OR conversation_id IN (
      SELECT id FROM public.conversations
      WHERE deal_room_id IN (
        SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
      )
    )
    OR conversation_id IN (
      SELECT id FROM public.conversations
      WHERE deal_id IN (
        SELECT opportunity_id FROM public.access_unlocks WHERE investor_id = auth.uid()
      )
    )
    OR conversation_id IN (
      SELECT id FROM public.conversations WHERE deal_id IN (
        SELECT id FROM public.deals WHERE created_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Participants send messages" ON public.messages;
CREATE POLICY "Participants send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      conversation_id IN (
        SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
      )
      OR conversation_id IN (
        SELECT id FROM public.conversations WHERE created_by = auth.uid()
      )
      OR conversation_id IN (
        SELECT id FROM public.conversations
        WHERE deal_room_id IN (
          SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
        )
      )
      OR conversation_id IN (
        SELECT id FROM public.conversations
        WHERE deal_id IN (
          SELECT opportunity_id FROM public.access_unlocks WHERE investor_id = auth.uid()
        )
      )
      OR conversation_id IN (
        SELECT id FROM public.conversations WHERE deal_id IN (
          SELECT id FROM public.deals WHERE created_by = auth.uid()
        )
      )
    )
  );
