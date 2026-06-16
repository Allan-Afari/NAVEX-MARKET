
-- Trigger function: notify matching investors when a new deal is created
CREATE OR REPLACE FUNCTION public.notify_matching_investors()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _profile RECORD;
BEGIN
  -- Find investors whose sector matches the new deal's sector
  FOR _profile IN
    SELECT id FROM public.profiles
    WHERE role = 'investor'
      AND sector IS NOT NULL
      AND sector != ''
      AND NEW.sector IS NOT NULL
      AND LOWER(sector) = LOWER(NEW.sector)
      AND id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      _profile.id,
      '🔔 New Opportunity in Your Sector!',
      'A new ' || COALESCE(NEW.funding_type, 'funding') || ' opportunity "' || NEW.title || '" was just posted in ' || NEW.sector || '.',
      'opportunity_alert',
      '/deals/' || NEW.id
    );
  END LOOP;

  -- Also notify business users in the same sector
  FOR _profile IN
    SELECT id FROM public.profiles
    WHERE role = 'business'
      AND sector IS NOT NULL
      AND sector != ''
      AND NEW.sector IS NOT NULL
      AND LOWER(sector) = LOWER(NEW.sector)
      AND id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      _profile.id,
      '🔔 New Opportunity in Your Sector!',
      'A new ' || COALESCE(NEW.funding_type, 'funding') || ' opportunity "' || NEW.title || '" was just posted in ' || NEW.sector || '.',
      'opportunity_alert',
      '/deals/' || NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create the trigger on deals table
CREATE TRIGGER on_deal_created_notify_matches
AFTER INSERT ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.notify_matching_investors();
