-- Conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID,
  title TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversation participants
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agreement templates
CREATE TABLE public.agreement_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agreements
CREATE TABLE public.agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID,
  template_id UUID REFERENCES public.agreement_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agreement signatures
CREATE TABLE public.agreement_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_id UUID REFERENCES public.agreements(id) ON DELETE CASCADE NOT NULL,
  signer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signer_name TEXT NOT NULL,
  signer_role TEXT NOT NULL DEFAULT 'party',
  signature_data TEXT,
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agreement versions
CREATE TABLE public.agreement_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_id UUID REFERENCES public.agreements(id) ON DELETE CASCADE NOT NULL,
  version_number INT NOT NULL DEFAULT 1,
  content JSONB NOT NULL DEFAULT '{}',
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users create conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users see own participations" ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users add participants to own convos" ON public.conversation_participants
  FOR INSERT TO authenticated
  WITH CHECK (conversation_id IN (SELECT id FROM public.conversations WHERE created_by = auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Participants read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()));

CREATE POLICY "Participants send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()));

CREATE POLICY "Sender updates own messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Read active templates" ON public.agreement_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Users see own agreements" ON public.agreements
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR id IN (SELECT agreement_id FROM public.agreement_signatures WHERE signer_id = auth.uid()));

CREATE POLICY "Users create agreements" ON public.agreements
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator updates agreements" ON public.agreements
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Signers see own sigs" ON public.agreement_signatures
  FOR SELECT TO authenticated
  USING (signer_id = auth.uid() OR agreement_id IN (SELECT id FROM public.agreements WHERE created_by = auth.uid()));

CREATE POLICY "Signers create sigs" ON public.agreement_signatures
  FOR INSERT TO authenticated
  WITH CHECK (signer_id = auth.uid());

CREATE POLICY "Signers update own sigs" ON public.agreement_signatures
  FOR UPDATE TO authenticated
  USING (signer_id = auth.uid());

CREATE POLICY "Users see own agreement versions" ON public.agreement_versions
  FOR SELECT TO authenticated
  USING (agreement_id IN (SELECT id FROM public.agreements WHERE created_by = auth.uid()) OR agreement_id IN (SELECT agreement_id FROM public.agreement_signatures WHERE signer_id = auth.uid()));

CREATE POLICY "Creator creates versions" ON public.agreement_versions
  FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());