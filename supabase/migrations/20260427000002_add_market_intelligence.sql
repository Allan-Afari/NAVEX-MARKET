-- Market Intelligence & Analytics Platform
CREATE TABLE IF NOT EXISTS public.market_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector TEXT NOT NULL,
  region TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('funding_volume', 'deal_count', 'average_ticket', 'success_rate')),
  value DECIMAL(15,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data_source TEXT DEFAULT 'internal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Industry reports and trend analysis
CREATE TABLE IF NOT EXISTS public.industry_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  sector TEXT NOT NULL,
  summary TEXT NOT NULL,
  content JSONB NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'quarterly' CHECK (report_type IN ('weekly', 'monthly', 'quarterly', 'annual')),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_premium BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0
);

-- Predictive analytics for deal success
CREATE TABLE IF NOT EXISTS public.deal_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  success_probability DECIMAL(3,2) NOT NULL CHECK (success_probability >= 0 AND success_probability <= 1),
  predicted_timeline_days INTEGER,
  risk_factors JSONB DEFAULT '[]',
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Competitive intelligence
CREATE TABLE IF NOT EXISTS public.competitor_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  funding_stage TEXT,
  last_funding_amount DECIMAL(15,2),
  last_funding_date DATE,
  key_metrics JSONB DEFAULT '{}',
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  analyst_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.market_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_analysis ENABLE ROW LEVEL SECURITY;

-- Premium users get access to insights
CREATE POLICY "Premium users access market insights"
  ON public.market_insights FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND tier IN ('pro', 'premium')
    )
  );

CREATE POLICY "Premium users access industry reports"
  ON public.industry_reports FOR SELECT
  TO authenticated
  USING (
    is_premium = false OR
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND tier = 'premium'
    )
  );