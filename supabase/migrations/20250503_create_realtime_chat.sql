-- Create deal_room_messages table for real-time chat
CREATE TABLE IF NOT EXISTS deal_room_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_deal_room_messages_deal_room_id ON deal_room_messages(deal_room_id);
CREATE INDEX idx_deal_room_messages_sender_id ON deal_room_messages(sender_id);
CREATE INDEX idx_deal_room_messages_created_at ON deal_room_messages(created_at);

ALTER TABLE deal_room_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view messages for deal rooms they're part of
CREATE POLICY deal_room_messages_select ON deal_room_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_room_participants
      WHERE deal_room_participants.deal_room_id = deal_room_messages.deal_room_id
        AND deal_room_participants.user_id = auth.uid()
    )
  );

-- RLS: Users can insert messages for deal rooms they're part of
CREATE POLICY deal_room_messages_insert ON deal_room_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM deal_room_participants
      WHERE deal_room_participants.deal_room_id = deal_room_messages.deal_room_id
        AND deal_room_participants.user_id = auth.uid()
    )
  );

-- RLS: Users can only update/delete their own messages
CREATE POLICY deal_room_messages_update ON deal_room_messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

-- Realtime configuration
ALTER TABLE deal_room_messages REPLICA IDENTITY FULL;
