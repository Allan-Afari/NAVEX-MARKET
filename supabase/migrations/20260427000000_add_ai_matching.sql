-- AI-Powered Deal Matching Algorithm
-- Uses machine learning to match businesses with investors based on:
-- Industry alignment, funding needs, investment preferences, past success rates

CREATE TABLE IF NOT EXISTS public.deal_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  match_score DECIMAL(3,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  match_reasons JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(investor_id, deal_id)
);

-- Enable RLS
ALTER TABLE public.deal_recommendations ENABLE ROW LEVEL SECURITY;

-- Investors can see their own recommendations
CREATE POLICY "Investors see own recommendations"
  ON public.deal_recommendations FOR SELECT
  TO authenticated
  USING (investor_id = auth.uid());

-- Function to calculate match scores (would be enhanced with ML model)
CREATE OR REPLACE FUNCTION calculate_deal_match(investor_uuid UUID, deal_uuid UUID)
RETURNS TABLE(match_score DECIMAL(3,2), reasons JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  investor_profile RECORD;
  deal_record RECORD;
  score DECIMAL(3,2) := 0.0;
  reasons JSONB := '[]'::jsonb;
BEGIN
  -- Get investor preferences
  SELECT * INTO investor_profile
  FROM profiles
  WHERE id = investor_uuid;

  -- Get deal details
  SELECT * INTO deal_record
  FROM deals
  WHERE id = deal_uuid;

  -- Industry/sector match (40% weight)
  IF investor_profile.preferred_sectors IS NOT NULL AND
     deal_record.sector IS NOT NULL AND
     investor_profile.preferred_sectors ? deal_record.sector THEN
    score := score + 0.4;
    reasons := reasons || jsonb_build_object('reason', 'Industry alignment', 'weight', 0.4);
  END IF;

  -- Location match (20% weight)
  IF investor_profile.preferred_regions IS NOT NULL AND
     deal_record.location IS NOT NULL AND
     investor_profile.preferred_regions ? deal_record.location THEN
    score := score + 0.2;
    reasons := reasons || jsonb_build_object('reason', 'Geographic preference', 'weight', 0.2);
  END IF;

  -- Funding range match (30% weight)
  IF deal_record.funding_amount IS NOT NULL THEN
    -- Check if funding amount fits typical investor ranges
    IF deal_record.funding_amount BETWEEN 10000 AND 1000000 THEN
      score := score + 0.3;
      reasons := reasons || jsonb_build_object('reason', 'Funding amount match', 'weight', 0.3);
    END IF;
  END IF;

  -- Trust score bonus (10% weight)
  IF investor_profile.trust_score IS NOT NULL AND investor_profile.trust_score > 4.0 THEN
    score := score + 0.1;
    reasons := reasons || jsonb_build_object('reason', 'High trust score', 'weight', 0.1);
  END IF;

  -- Business verification bonus (additional 10%)
  IF investor_profile.verification_status = 'verified' THEN
    score := LEAST(score + 0.1, 1.0); -- Cap at 1.0
    reasons := reasons || jsonb_build_object('reason', 'Verified investor', 'weight', 0.1);
  END IF;

  RETURN QUERY SELECT score, reasons;
END;
$$;

-- Function to generate recommendations for an investor
CREATE OR REPLACE FUNCTION generate_investor_recommendations(investor_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(deal_id UUID, match_score DECIMAL(3,2), match_reasons JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS deal_id,
    match_result.match_score,
    match_result.reasons
  FROM deals d
  CROSS JOIN LATERAL calculate_deal_match(investor_uuid, d.id) AS match_result(match_score, reasons)
  WHERE d.is_removed = false
    AND d.stage = 'published'
    AND match_result.match_score > 0.3 -- Minimum threshold
  ORDER BY match_result.match_score DESC
  LIMIT limit_count;
END;
$$;

-- Function to update recommendations (call periodically or on demand)
CREATE OR REPLACE FUNCTION refresh_deal_recommendations(investor_uuid UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  investor_record RECORD;
  deal_record RECORD;
  match_result RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- If specific investor provided, update only for them
  IF investor_uuid IS NOT NULL THEN
    -- Delete existing recommendations for this investor
    DELETE FROM deal_recommendations WHERE investor_id = investor_uuid;

    -- Generate new recommendations
    FOR match_result IN SELECT * FROM generate_investor_recommendations(investor_uuid, 20) LOOP
      INSERT INTO deal_recommendations (investor_id, deal_id, match_score, match_reasons)
      VALUES (investor_uuid, match_result.deal_id, match_result.match_score, match_result.match_reasons);
      updated_count := updated_count + 1;
    END LOOP;

    RETURN updated_count;
  END IF;

  -- Otherwise, update for all investors (expensive operation)
  FOR investor_record IN SELECT id FROM profiles WHERE role = 'investor' LOOP
    -- Call recursively for each investor
    PERFORM refresh_deal_recommendations(investor_record.id);
  END LOOP;

  RETURN updated_count;
END;
$$;