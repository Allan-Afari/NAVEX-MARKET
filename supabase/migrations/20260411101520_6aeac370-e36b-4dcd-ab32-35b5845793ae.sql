-- Remove client-side UPDATE policy on subscriptions
DROP POLICY IF EXISTS "Users update own subscriptions" ON public.subscriptions;

-- Replace broad profile SELECT
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;

CREATE POLICY "Users read own full profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users read public profile fields"
ON public.profiles FOR SELECT
TO authenticated
USING (id != auth.uid());

-- Replace broad deals SELECT
DROP POLICY IF EXISTS "Read published deals" ON public.deals;

CREATE POLICY "Read published deals"
ON public.deals FOR SELECT
TO authenticated
USING (stage = 'published');

CREATE POLICY "Owners read own deals"
ON public.deals FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR investor_id = auth.uid());

CREATE POLICY "Admins read all deals"
ON public.deals FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: notify matching investors when a new deal is created
CREATE OR REPLACE FUNCTION public.notify_matching_investors()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _profile RECORD;
BEGIN
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

CREATE TRIGGER on_deal_created_notify_matches
AFTER INSERT ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.notify_matching_investors();