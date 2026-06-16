-- Strengthen confidential deal room document access controls and admin audit access

DROP POLICY IF EXISTS "Deal room participants see documents" ON public.deal_room_documents;
CREATE POLICY "Deal room participants see documents" ON public.deal_room_documents FOR SELECT
  TO authenticated
  USING (
    deal_room_id IN (
      SELECT deal_room_id
      FROM public.deal_room_participants
      WHERE user_id = auth.uid()
        AND (
          NOT deal_room_documents.is_confidential
          OR role = 'editor'
        )
    )
    OR deal_room_id IN (
      SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Deal room participants upload documents" ON public.deal_room_documents;
CREATE POLICY "Deal room participants upload documents" ON public.deal_room_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      deal_room_id IN (
        SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
      )
      OR deal_room_id IN (
        SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid() AND role = 'editor'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS "Uploaded document owner or room owner can delete documents" ON public.deal_room_documents;
CREATE POLICY "Uploaded document owner or room owner can delete documents" ON public.deal_room_documents FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR deal_room_id IN (
      SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Participants log document access" ON public.document_access_log;
CREATE POLICY "Participants log document access" ON public.document_access_log FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      document_id IN (
        SELECT id FROM public.deal_room_documents
        WHERE deal_room_id IN (
          SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
        )
        OR deal_room_id IN (
          SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS "Deal room participants can view document access logs" ON public.document_access_log;
CREATE POLICY "Deal room participants can view document access logs" ON public.document_access_log FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR document_id IN (
      SELECT id FROM public.deal_room_documents
      WHERE deal_room_id IN (
        SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
      )
      OR deal_room_id IN (
        SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
