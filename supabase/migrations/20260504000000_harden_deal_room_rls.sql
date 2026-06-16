-- Harden deal room security policies for participants, documents, and negotiations

-- Deal room participant access and management
CREATE POLICY "Deal room participants select" ON public.deal_room_participants FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR deal_room_id IN (
      SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
    )
    OR deal_room_id IN (
      SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Deal room participants manage" ON public.deal_room_participants FOR INSERT TO authenticated
  WITH CHECK (
    deal_room_id IN (
      SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Deal room participants update or delete" ON public.deal_room_participants FOR UPDATE, DELETE TO authenticated
  USING (
    deal_room_id IN (
      SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    deal_room_id IN (
      SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
    )
  );

-- Document security for data room files
CREATE POLICY "Deal room documents update" ON public.deal_room_documents FOR UPDATE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR deal_room_id IN (
      SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR deal_room_id IN (
      SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
    )
  );

-- Owner or participant can update negotiation status
DROP POLICY IF EXISTS "Deal room negotiation update" ON public.deal_room_negotiations;
CREATE POLICY "Deal room negotiation update" ON public.deal_room_negotiations FOR UPDATE TO authenticated
  USING (
    proposed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.deal_rooms
      WHERE deal_rooms.id = deal_room_negotiations.deal_room_id
        AND deal_rooms.created_by = auth.uid()
    )
  )
  WITH CHECK (
    (
      proposed_by = auth.uid()
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.deal_rooms
        WHERE deal_rooms.id = deal_room_negotiations.deal_room_id
          AND deal_rooms.created_by = auth.uid()
      )
      AND status IN ('accepted', 'rejected')
    )
  );
