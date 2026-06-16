CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  paystack_reference text,
  paystack_subscription_code text,
  amount numeric DEFAULT 0,
  currency text DEFAULT 'NGN',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "System inserts subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own subscriptions" ON public.subscriptions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.featured_listing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'NGN',
  paystack_reference text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_listing_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own featured payments" ON public.featured_listing_payments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users create featured payments" ON public.featured_listing_payments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own featured payments" ON public.featured_listing_payments
  FOR UPDATE TO authenticated USING (user_id = auth.uid());