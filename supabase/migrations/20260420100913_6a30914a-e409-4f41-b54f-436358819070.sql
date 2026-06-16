-- Notify user when their suspension status changes
CREATE OR REPLACE FUNCTION public.notify_suspension_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
    IF NEW.is_suspended = true THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (
        NEW.id,
        '⛔ Account Suspended',
        COALESCE('Your account has been suspended. Reason: ' || NEW.suspension_reason, 'Your account has been suspended by an admin.'),
        'admin_action',
        '/'
      );
    ELSE
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (
        NEW.id,
        '✅ Account Reinstated',
        'Good news — your account has been reinstated. You can now use Navex Market again.',
        'admin_action',
        '/dashboard'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_suspension_change ON public.profiles;
CREATE TRIGGER trg_notify_suspension_change
AFTER UPDATE OF is_suspended ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_suspension_change();

-- Notify deal owner when their deal is removed or restored
CREATE OR REPLACE FUNCTION public.notify_deal_removal_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_removed IS DISTINCT FROM OLD.is_removed AND NEW.created_by IS NOT NULL THEN
    IF NEW.is_removed = true THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (
        NEW.created_by,
        '🚫 Opportunity Removed',
        'Your opportunity "' || NEW.title || '" was removed by an admin.' ||
          COALESCE(' Reason: ' || NEW.removal_reason, ''),
        'admin_action',
        '/dashboard'
      );
    ELSE
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (
        NEW.created_by,
        '✅ Opportunity Restored',
        'Your opportunity "' || NEW.title || '" has been restored and is live again.',
        'admin_action',
        '/deals/' || NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_deal_removal_change ON public.deals;
CREATE TRIGGER trg_notify_deal_removal_change
AFTER UPDATE OF is_removed ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.notify_deal_removal_change();

-- Notify user when their verification request decision is made
CREATE OR REPLACE FUNCTION public.notify_verification_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (
        NEW.user_id,
        '✅ You are Verified!',
        'Your verification has been approved. The verified badge is now on your profile.' ||
          COALESCE(' Note: ' || NEW.admin_notes, ''),
        'admin_action',
        '/profile'
      );
    ELSE
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (
        NEW.user_id,
        '❌ Verification Rejected',
        'Your verification request was not approved.' ||
          COALESCE(' Reason: ' || NEW.admin_notes, '') ||
          ' You can submit again from your profile.',
        'admin_action',
        '/profile'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_verification_decision ON public.verification_requests;
CREATE TRIGGER trg_notify_verification_decision
AFTER UPDATE OF status ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_verification_decision();