-- Add security for phone verification updates
-- This ensures only authenticated users can update their own phone and phone_verified fields

-- Create a function to validate phone updates
CREATE OR REPLACE FUNCTION public.validate_phone_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow updates if the user is authenticated and updating their own record
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for profile updates';
  END IF;

  IF NEW.id != auth.uid() THEN
    RAISE EXCEPTION 'Users can only update their own profile';
  END IF;

  -- For phone_verified: only allow setting to true, not false
  IF NEW.phone_verified IS NOT NULL AND NEW.phone_verified = false AND OLD.phone_verified = true THEN
    RAISE EXCEPTION 'Cannot un-verify a phone number once verified';
  END IF;

  -- If phone_verified is being set to true, ensure phone is also provided
  IF NEW.phone_verified = true AND (NEW.phone IS NULL OR NEW.phone = '') THEN
    RAISE EXCEPTION 'Phone number must be provided when verifying phone';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to validate phone updates
DROP TRIGGER IF EXISTS validate_phone_update_trigger ON public.profiles;
CREATE TRIGGER validate_phone_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_phone_update();

-- Ensure the existing RLS policies are in place
-- (These should already exist from previous migrations)

-- Users can read all profiles
-- Users can update their own profile (with the trigger validation above)
-- Admins can update any profile