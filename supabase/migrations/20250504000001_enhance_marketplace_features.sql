-- Enhance deals table with additional fields for marketplace
ALTER TABLE deals ADD COLUMN IF NOT EXISTS preferred_stages TEXT[];
ALTER TABLE deals ADD COLUMN IF NOT EXISTS preferred_industries TEXT[];
ALTER TABLE deals ADD COLUMN IF NOT EXISTS preferred_locations TEXT[];
ALTER TABLE deals ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS engagement_score DECIMAL DEFAULT 0;

-- Add indexes for better search performance (match actual deals columns)
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_sector ON deals(sector);
CREATE INDEX IF NOT EXISTS idx_deals_location ON deals(location);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_view_count ON deals(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_deals_engagement_score ON deals(engagement_score DESC);

-- Create full text search index for deal discovery
CREATE INDEX IF NOT EXISTS idx_deals_search ON deals USING gin(
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
);

-- Update deal view count trigger
CREATE OR REPLACE FUNCTION increment_deal_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deals SET view_count = view_count + 1
  WHERE id = NEW.deal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_deal_views ON deal_view_analytics;
CREATE TRIGGER trigger_increment_deal_views
AFTER INSERT ON deal_view_analytics
FOR EACH ROW
EXECUTE FUNCTION increment_deal_views();

-- Add compliance enforcement fields to deal_rooms
ALTER TABLE deal_rooms ADD COLUMN IF NOT EXISTS compliance_status VARCHAR DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'approved', 'blocked', 'flagged'));
ALTER TABLE deal_rooms ADD COLUMN IF NOT EXISTS risk_score DECIMAL DEFAULT 0;
ALTER TABLE deal_rooms ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE deal_rooms ADD COLUMN IF NOT EXISTS block_reason TEXT;
