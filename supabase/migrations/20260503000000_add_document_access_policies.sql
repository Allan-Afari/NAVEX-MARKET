-- Secure document access tracking for deal room documents

CREATE POLICY "Deal room participants see documents"
  ON public.deal_room_documents FOR SELECT
  TO authenticated
  USING (
    deal_room_id IN (
      SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
    )
    OR deal_room_id IN (
      SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Deal room participants upload documents"
  ON public.deal_room_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      deal_room_id IN (
        SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
      )
      OR deal_room_id IN (
        SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Uploaded document owner or room owner can delete documents"
  ON public.deal_room_documents FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR deal_room_id IN (
      SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Participants log document access"
  ON public.document_access_log FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND document_id IN (
      SELECT id FROM public.deal_room_documents
      WHERE deal_room_id IN (
        SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
      )
      OR deal_room_id IN (
        SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Deal room participants can view document access logs"
  ON public.document_access_log FOR SELECT
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
  );
