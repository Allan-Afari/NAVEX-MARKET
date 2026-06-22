-- Ensure email_queue is service-role only (edge function audit trail).
DO $$
BEGIN
  IF to_regclass('public.email_queue') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Service role manages email queue" ON public.email_queue;
    CREATE POLICY "Service role manages email queue" ON public.email_queue
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    DROP POLICY IF EXISTS "Admins manage email queue" ON public.email_queue;
  END IF;
END $$;
