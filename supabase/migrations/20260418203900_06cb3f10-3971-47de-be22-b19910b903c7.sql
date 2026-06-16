-- 1. Add preferred_sectors array to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_sectors text[] NOT NULL DEFAULT '{}'::text[];

-- 2. Replace the matching trigger function with multi-sector + weighted reasons
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
  _sector_lower text;
  _matched_sector text;
BEGIN
  _loc_lower := LOWER(COALESCE(NEW.location, ''));
  _sector_lower := LOWER(COALESCE(NEW.sector, ''));

  FOR _profile IN
    SELECT DISTINCT p.id, p.sector, p.location, p.preferred_regions, p.preferred_sectors
    FROM public.profiles p
    WHERE p.role IN ('investor', 'business')
      AND p.id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        -- primary sector match
        (NEW.sector IS NOT NULL AND p.sector IS NOT NULL AND p.sector <> ''
         AND LOWER(p.sector) = _sector_lower)
        OR
        -- preferred_sectors array match (case-insensitive)
        (NEW.sector IS NOT NULL AND EXISTS (
          SELECT 1 FROM unnest(p.preferred_sectors) AS ps
          WHERE ps <> '' AND LOWER(ps) = _sector_lower
        ))
        OR
        -- profile location substring match
        (NEW.location IS NOT NULL AND NEW.location <> '' AND p.location IS NOT NULL AND p.location <> ''
         AND (LOWER(p.location) LIKE '%' || _loc_lower || '%'
              OR _loc_lower LIKE '%' || LOWER(p.location) || '%'))
        OR
        -- preferred_regions substring match
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

    -- Sector reasons (primary or preferred)
    IF NEW.sector IS NOT NULL AND _profile.sector IS NOT NULL
       AND LOWER(_profile.sector) = _sector_lower THEN
      _match_reasons := array_append(_match_reasons, 'your sector (' || NEW.sector || ')');
    ELSIF NEW.sector IS NOT NULL THEN
      SELECT ps INTO _matched_sector
      FROM unnest(_profile.preferred_sectors) AS ps
      WHERE ps <> '' AND LOWER(ps) = _sector_lower
      LIMIT 1;
      IF _matched_sector IS NOT NULL THEN
        _match_reasons := array_append(_match_reasons, 'a sector you follow (' || _matched_sector || ')');
      END IF;
    END IF;

    -- Location reasons
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

-- 3. Ensure trigger exists on deals
DROP TRIGGER IF EXISTS trg_notify_matching_investors ON public.deals;
CREATE TRIGGER trg_notify_matching_investors
AFTER INSERT ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.notify_matching_investors();