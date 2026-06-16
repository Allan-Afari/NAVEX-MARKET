-- Create deal_room_activity table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS deal_room_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indices for efficient querying
CREATE INDEX idx_deal_room_activity_deal_room_id ON deal_room_activity(deal_room_id);
CREATE INDEX idx_deal_room_activity_user_id ON deal_room_activity(user_id);
CREATE INDEX idx_deal_room_activity_created_at ON deal_room_activity(created_at);
CREATE INDEX idx_deal_room_activity_action ON deal_room_activity(action);

-- Enable RLS
ALTER TABLE deal_room_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view activity for deal rooms they're part of
CREATE POLICY deal_room_activity_view ON deal_room_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_room_participants
      WHERE deal_room_participants.deal_room_id = deal_room_activity.deal_room_id
        AND deal_room_participants.user_id = auth.uid()
    )
  );

-- RLS Policy: Only admins and deal room creators can insert
CREATE POLICY deal_room_activity_insert ON deal_room_activity
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create audit function to log all deal room activities
CREATE OR REPLACE FUNCTION log_deal_room_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO deal_room_activity (
    deal_room_id,
    user_id,
    action,
    description,
    metadata
  ) VALUES (
    NEW.deal_room_id,
    auth.uid(),
    TG_ARGV[0],
    TG_ARGV[1],
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
