-- Enhance notifications table to support deal room events
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deal_room_id UUID REFERENCES deal_rooms(id) ON DELETE CASCADE;
ALTER TABLE notifications RENAME COLUMN message TO body;

-- Create deal_negotiation_terms table for tracking negotiation versions
CREATE TABLE IF NOT EXISTS deal_negotiation_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  version INT DEFAULT 1,
  title VARCHAR(255),
  terms JSONB NOT NULL DEFAULT '{}',
  proposed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'proposed', -- proposed, accepted, rejected, counter-offered
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_negotiation_terms_deal_room_id ON deal_negotiation_terms(deal_room_id);
CREATE INDEX idx_negotiation_terms_version ON deal_negotiation_terms(deal_room_id, version);

ALTER TABLE deal_negotiation_terms ENABLE ROW LEVEL SECURITY;

-- Create dispute_resolution table
CREATE TABLE IF NOT EXISTS dispute_resolutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  defendant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reason VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open', -- open, under-review, escalated, resolved, dismissed
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_disputes_deal_room_id ON dispute_resolutions(deal_room_id);
CREATE INDEX idx_disputes_status ON dispute_resolutions(status);
CREATE INDEX idx_disputes_initiator_id ON dispute_resolutions(initiator_id);

ALTER TABLE dispute_resolutions ENABLE ROW LEVEL SECURITY;

-- Create compliance_flags table for tracking potential issues
CREATE TABLE IF NOT EXISTS compliance_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_room_id UUID REFERENCES deal_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_type VARCHAR(100) NOT NULL, -- aml, kyc, sanctions, high_value, geographic_risk
  severity VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, cleared, escalated
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_compliance_flags_user_id ON compliance_flags(user_id);
CREATE INDEX idx_compliance_flags_deal_room_id ON compliance_flags(deal_room_id);
CREATE INDEX idx_compliance_flags_status ON compliance_flags(status);

ALTER TABLE compliance_flags ENABLE ROW LEVEL SECURITY;

-- Create data_retention_policy table
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_room_id UUID REFERENCES deal_rooms(id) ON DELETE CASCADE,
  retention_days INT DEFAULT 90,
  auto_delete BOOLEAN DEFAULT false,
  encryption_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

