-- Email notification queue table
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_plain TEXT NOT NULL,
  body_html TEXT,
  notification_type TEXT NOT NULL,
  related_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  send_attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  UNIQUE(to_email, notification_type, related_id)
);

-- Index for queue processing
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created ON public.email_queue(created_at);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage email queue
CREATE POLICY "Admins manage email queue"
  ON public.email_queue FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- Trigger to log deal interest as email notification
CREATE OR REPLACE FUNCTION public.on_deal_interest_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deal_record RECORD;
  business_profile RECORD;
  investor_profile RECORD;
BEGIN
  -- Get deal and creator info
  SELECT * INTO deal_record FROM public.deals WHERE id = NEW.deal_id;
  SELECT * INTO business_profile FROM public.profiles WHERE id = deal_record.created_by;
  SELECT * INTO investor_profile FROM public.profiles WHERE id = NEW.user_id;

  -- Queue email notification to business owner
  INSERT INTO public.email_queue (
    to_email, subject, body_plain, notification_type, related_id
  ) VALUES (
    business_profile.email,
    'New Interest in ' || deal_record.title,
    'Investor ' || COALESCE(investor_profile.full_name, investor_profile.email) || ' has expressed interest in your deal: ' || deal_record.title,
    'deal_interest',
    NEW.id
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_deal_interest_created ON public.deal_interests;
CREATE TRIGGER on_deal_interest_created
  AFTER INSERT ON public.deal_interests
  FOR EACH ROW EXECUTE FUNCTION public.on_deal_interest_created();

-- Trigger for new messages
CREATE OR REPLACE FUNCTION public.on_message_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  other_participant RECORD;
  sender_profile RECORD;
BEGIN
  -- Get other participant in conversation
  SELECT DISTINCT user_id INTO other_participant
  FROM public.conversation_participants
  WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LIMIT 1;

  -- Get sender profile
  SELECT * INTO sender_profile FROM public.profiles WHERE id = NEW.sender_id;

  -- Queue notification to other participant
  IF other_participant.user_id IS NOT NULL AND other_participant.user_id != NEW.sender_id THEN
    INSERT INTO public.email_queue (
      to_email, subject, body_plain, notification_type, related_id
    ) VALUES (
      (SELECT email FROM public.profiles WHERE id = other_participant.user_id),
      'New message from ' || COALESCE(sender_profile.full_name, sender_profile.email),
      SUBSTRING(NEW.content, 1, 100) || '...',
      'message',
      NEW.id
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.on_message_created();
