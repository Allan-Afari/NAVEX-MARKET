-- 1. Add preferred_regions array to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_regions text[] NOT NULL DEFAULT '{}';

-- 2. Rewrite matching function: sector OR location OR preferred_regions, deduped per user
CREATE OR REPLACE FUNCTION public.notify_matching_investors()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _profile RECORD;
  _match_reasons text[];
  _reason_text text;
  _loc_lower text;
BEGIN
  _loc_lower := LOWER(COALESCE(NEW.location, ''));

  FOR _profile IN
    SELECT DISTINCT p.id, p.sector, p.location, p.preferred_regions
    FROM public.profiles p
    WHERE p.role IN ('investor', 'business')
      AND p.id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        -- sector match
        (NEW.sector IS NOT NULL AND p.sector IS NOT NULL AND p.sector <> ''
         AND LOWER(p.sector) = LOWER(NEW.sector))
        OR
        -- profile location substring match (either contains the other)
        (NEW.location IS NOT NULL AND NEW.location <> '' AND p.location IS NOT NULL AND p.location <> ''
         AND (LOWER(p.location) LIKE '%' || _loc_lower || '%'
              OR _loc_lower LIKE '%' || LOWER(p.location) || '%'))
        OR
        -- any preferred_region substring match
        (NEW.location IS NOT NULL AND NEW.location <> ''
         AND EXISTS (
           SELECT 1 FROM unnest(p.preferred_regions) AS pr
           WHERE pr <> '' AND (
             LOWER(pr) LIKE '%' || _loc_lower || '%'
             OR _loc_lower LIKE '%' || LOWER(pr) || '%'
           )
         ))
      )
  LOOP
    _match_reasons := ARRAY[]::text[];

    IF NEW.sector IS NOT NULL AND _profile.sector IS NOT NULL
       AND LOWER(_profile.sector) = LOWER(NEW.sector) THEN
      _match_reasons := array_append(_match_reasons, 'sector ' || NEW.sector);
    END IF;

    IF NEW.location IS NOT NULL AND NEW.location <> '' THEN
      IF _profile.location IS NOT NULL AND _profile.location <> ''
         AND (LOWER(_profile.location) LIKE '%' || _loc_lower || '%'
              OR _loc_lower LIKE '%' || LOWER(_profile.location) || '%') THEN
        _match_reasons := array_append(_match_reasons, 'your area (' || NEW.location || ')');
      ELSIF EXISTS (
        SELECT 1 FROM unnest(_profile.preferred_regions) AS pr
        WHERE pr <> '' AND (
          LOWER(pr) LIKE '%' || _loc_lower || '%'
          OR _loc_lower LIKE '%' || LOWER(pr) || '%'
        )
      ) THEN
        _match_reasons := array_append(_match_reasons, 'a region you follow (' || NEW.location || ')');
      END IF;
    END IF;

    IF array_length(_match_reasons, 1) IS NULL THEN
      CONTINUE;
    END IF;

    _reason_text := array_to_string(_match_reasons, ' and ');

    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      _profile.id,
      '🔔 New Opportunity Matching You!',
      'A new ' || COALESCE(NEW.funding_type, 'funding') || ' opportunity "' || NEW.title
        || '" matches ' || _reason_text || '.',
      'opportunity_alert',
      '/deals/' || NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$function$;