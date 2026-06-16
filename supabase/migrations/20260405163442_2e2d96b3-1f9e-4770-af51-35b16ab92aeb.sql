
-- App role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'business',
  avatar_url TEXT,
  bio TEXT,
  company_name TEXT,
  sector TEXT,
  location TEXT,
  trust_score NUMERIC(3,1) DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  total_deals INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Disputes table
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID,
  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  against_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Dispute evidence
CREATE TABLE public.dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES public.disputes(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User roles: only admins can see, users get assigned by system
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Profiles: all authenticated can read, owner can update
CREATE POLICY "Anyone can read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Reviews: authenticated can read all, create own
CREATE POLICY "Read all reviews" ON public.reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Create own reviews" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());

-- Disputes: involved parties and admins
CREATE POLICY "Users see own disputes" ON public.disputes
  FOR SELECT TO authenticated
  USING (initiated_by = auth.uid() OR against_user = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create disputes" ON public.disputes
  FOR INSERT TO authenticated WITH CHECK (initiated_by = auth.uid());

CREATE POLICY "Admins update disputes" ON public.disputes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Dispute evidence: dispute participants and admins
CREATE POLICY "Users see dispute evidence" ON public.dispute_evidence
  FOR SELECT TO authenticated
  USING (dispute_id IN (SELECT id FROM public.disputes WHERE initiated_by = auth.uid() OR against_user = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users upload evidence" ON public.dispute_evidence
  FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'business')
  );
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
