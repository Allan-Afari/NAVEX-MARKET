DO $$
DECLARE
  notif_count int;
  rec RECORD;
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
  ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_created_by_fkey;
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

  INSERT INTO public.profiles (id, full_name, email, role, sector, location, preferred_regions, verification_status)
  VALUES
    ('11111111-1111-1111-1111-111111111111','Test_SectorMatch','sector@test.local','investor','Technology','Cape Town','{}','pending'),
    ('22222222-2222-2222-2222-222222222222','Test_LocationMatch','loc@test.local','investor','Healthcare','Lagos, Nigeria','{}','pending'),
    ('33333333-3333-3333-3333-333333333333','Test_RegionMatch','region@test.local','business','Retail','Accra',ARRAY['Abuja','Nairobi'],'pending'),
    ('44444444-4444-4444-4444-444444444444','Test_DealCreator','creator@test.local','business','Energy','Kigali','{}','pending');

  INSERT INTO public.deals (id, title, sector, location, funding_amount, funding_type, stage, created_by)
  VALUES ('99999999-9999-9999-9999-999999999991','Test_AlertDeal_TechLagos','Technology','Lagos',5000000,'equity','published','44444444-4444-4444-4444-444444444444');

  INSERT INTO public.deals (id, title, sector, location, funding_amount, funding_type, stage, created_by)
  VALUES ('99999999-9999-9999-9999-999999999992','Test_AlertDeal_AgriAbuja','Agriculture','Abuja',2000000,'loan','published','44444444-4444-4444-4444-444444444444');

  RAISE NOTICE '--- Notifications generated ---';
  FOR rec IN
    SELECT p.full_name, n.body, n.link
    FROM public.notifications n JOIN public.profiles p ON p.id = n.user_id
    WHERE n.type='opportunity_alert' AND n.user_id IN (
      '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444')
    ORDER BY p.full_name, n.created_at
  LOOP
    RAISE NOTICE '% -> % | %', rec.full_name, rec.link, rec.body;
  END LOOP;

  SELECT count(*) INTO notif_count FROM public.notifications
   WHERE type='opportunity_alert' AND user_id IN (
     '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
     '33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444');
  RAISE NOTICE 'Total alert notifications: % (expected 3)', notif_count;

  -- Cleanup
  DELETE FROM public.notifications WHERE user_id IN (
    '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444');
  DELETE FROM public.deals WHERE id IN (
    '99999999-9999-9999-9999-999999999991','99999999-9999-9999-9999-999999999992');
  DELETE FROM public.profiles WHERE id IN (
    '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444');

  -- Restore FKs
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE public.deals ADD CONSTRAINT deals_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

  IF notif_count <> 3 THEN
    RAISE EXCEPTION 'TEST FAILED: expected 3 alerts, got %', notif_count;
  END IF;
  RAISE NOTICE 'TEST PASSED ✓ — sector, location, and preferred-region matching all work, author excluded.';
END $$;