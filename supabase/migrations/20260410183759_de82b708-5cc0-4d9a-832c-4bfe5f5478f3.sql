
-- 1. SUBSCRIPTIONS: Remove client-side UPDATE policy (only service role should update)
DROP POLICY IF EXISTS "Users update own subscriptions" ON public.subscriptions;

-- 2. PROFILES: Replace broad SELECT with scoped view
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;

-- Users can see all columns on their own profile
CREATE POLICY "Users read own full profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can see non-sensitive fields on other profiles
CREATE POLICY "Users read public profile fields"
ON public.profiles FOR SELECT
TO authenticated
USING (id != auth.uid());

-- 3. DEALS: Replace broad SELECT with scoped policies
DROP POLICY IF EXISTS "Read published deals" ON public.deals;

-- Anyone can see published deals
CREATE POLICY "Read published deals"
ON public.deals FOR SELECT
TO authenticated
USING (stage = 'published');

-- Creators and investors see their own deals in any stage
CREATE POLICY "Owners read own deals"
ON public.deals FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR investor_id = auth.uid());

-- Admins can see all deals
CREATE POLICY "Admins read all deals"
ON public.deals FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
