
-- Allow system/triggers to insert notifications (trigger runs as SECURITY DEFINER)
-- Also enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create trigger function for deal interest notifications
CREATE OR REPLACE FUNCTION public.notify_deal_interest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deal_title TEXT;
  _deal_owner UUID;
  _user_name TEXT;
BEGIN
  SELECT title, created_by INTO _deal_title, _deal_owner FROM public.deals WHERE id = NEW.deal_id;
  SELECT COALESCE(full_name, email, 'Someone') INTO _user_name FROM public.profiles WHERE id = NEW.user_id;
  
  IF _deal_owner IS NOT NULL AND _deal_owner != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      _deal_owner,
      'New Interest in Your Deal',
      _user_name || ' expressed interest in "' || _deal_title || '"',
      'deal_interest',
      '/deals/' || NEW.deal_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_deal_interest_insert
  AFTER INSERT ON public.deal_interests
  FOR EACH ROW EXECUTE FUNCTION public.notify_deal_interest();

-- Create trigger function for new message notifications
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sender_name TEXT;
  _participant RECORD;
BEGIN
  SELECT COALESCE(full_name, email, 'Someone') INTO _sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  FOR _participant IN
    SELECT user_id FROM public.conversation_participants WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      _participant.user_id,
      'New Message',
      _sender_name || ': ' || LEFT(NEW.content, 100),
      'message',
      '/messages'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();
