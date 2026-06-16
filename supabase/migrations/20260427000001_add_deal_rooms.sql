-- Advanced Deal Rooms with Virtual Due Diligence
CREATE TABLE IF NOT EXISTS public.deal_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  expires_at TIMESTAMPTZ,
  access_code TEXT UNIQUE, -- For secure sharing
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deal room participants (controlled access)
CREATE TABLE IF NOT EXISTS public.deal_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID REFERENCES deal_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(deal_room_id, user_id)
);

-- Virtual data room documents
CREATE TABLE IF NOT EXISTS public.deal_room_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id UUID REFERENCES deal_rooms(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  category TEXT DEFAULT 'general',
  is_confidential BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document access logging (audit trail)
CREATE TABLE IF NOT EXISTS public.document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES deal_room_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'download', 'share')),
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_room_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;

-- Policies for deal room access
CREATE POLICY "Deal room participants access"
  ON public.deal_rooms FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM deal_room_participants
      WHERE deal_room_id = deal_rooms.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Deal owners manage rooms"
  ON public.deal_rooms FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());