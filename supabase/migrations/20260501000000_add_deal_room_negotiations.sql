-- Deal room negotiations and offer tracking
CREATE TABLE IF NOT EXISTS public.deal_room_negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID REFERENCES deal_rooms(id) ON DELETE CASCADE,
  proposed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_offer_id UUID REFERENCES deal_room_negotiations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered')),
  amount BIGINT NOT NULL,
  terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_room_negotiations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal room negotiation select" ON public.deal_room_negotiations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deal_room_participants
      WHERE deal_room_participants.deal_room_id = deal_room_negotiations.deal_room_id
        AND deal_room_participants.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM deal_rooms
      WHERE deal_rooms.id = deal_room_negotiations.deal_room_id
        AND deal_rooms.created_by = auth.uid()
    )
  );

CREATE POLICY "Deal room negotiation insert" ON public.deal_room_negotiations FOR INSERT TO authenticated
  WITH CHECK (
    proposed_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM deal_room_participants
        WHERE deal_room_participants.deal_room_id = deal_room_negotiations.deal_room_id
          AND deal_room_participants.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM deal_rooms
        WHERE deal_rooms.id = deal_room_negotiations.deal_room_id
          AND deal_rooms.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Deal room negotiation update" ON public.deal_room_negotiations FOR UPDATE TO authenticated
  USING (proposed_by = auth.uid())
  WITH CHECK (proposed_by = auth.uid());
