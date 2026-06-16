-- Add deadline to negotiations for auto-expiration
ALTER TABLE public.deal_room_negotiations
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

-- Notifications table for real-time events
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('participant_join', 'document_upload', 'offer_status', 'mention', 'message', 'custom')),
  title TEXT NOT NULL,
  message TEXT,
  deal_room_id UUID REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_deal_room_idx ON public.notifications(deal_room_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users see only their notifications
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert notifications for participants/owners in the same deal room
CREATE POLICY "Users create room notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (
      deal_room_id IS NOT NULL
      AND (
        user_id IN (
          SELECT user_id FROM public.deal_room_participants WHERE deal_room_id = public.notifications.deal_room_id
        )
        OR user_id IN (
          SELECT created_by FROM public.deal_rooms WHERE id = public.notifications.deal_room_id
        )
      )
    )
  );

-- Users can mark their notifications as read
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Activity feed for deal rooms
CREATE TABLE IF NOT EXISTS public.deal_room_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'participant_joined', 'document_uploaded', 'offer_made', 'offer_accepted', 'offer_rejected', 'message_sent', 'participant_removed')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deal_room_activity_room_idx ON public.deal_room_activity(deal_room_id, created_at DESC);

ALTER TABLE public.deal_room_activity ENABLE ROW LEVEL SECURITY;

-- Participants and owners see activity
CREATE POLICY "Deal room participants see activity" ON public.deal_room_activity FOR SELECT TO authenticated
  USING (
    deal_room_id IN (
      SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
    )
    OR deal_room_id IN (
      SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
    )
  );

-- System can insert activity events
CREATE POLICY "System creates activity events" ON public.deal_room_activity FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      deal_room_id IN (
        SELECT deal_room_id FROM public.deal_room_participants WHERE user_id = auth.uid()
      )
      OR deal_room_id IN (
        SELECT id FROM public.deal_rooms WHERE created_by = auth.uid()
      )
    )
  );
