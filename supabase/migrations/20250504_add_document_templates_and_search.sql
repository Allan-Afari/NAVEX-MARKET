-- Create document_templates table
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR NOT NULL CHECK (category IN ('legal', 'financial', 'technical', 'operational', 'other')),
  content TEXT NOT NULL,
  file_type VARCHAR NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_public BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create template_usage table
CREATE TABLE IF NOT EXISTS template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES deal_room_documents(id) ON DELETE CASCADE,
  used_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create deal_scores table (for caching quality scores)
CREATE TABLE IF NOT EXISTS deal_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL UNIQUE REFERENCES deals(id) ON DELETE CASCADE,
  total_score INTEGER CHECK (total_score >= 0 AND total_score <= 100),
  completeness_score INTEGER,
  documentation_score INTEGER,
  participation_score INTEGER,
  compliance_score INTEGER,
  factors JSONB DEFAULT '{}'::JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create saved_deals table (favorites)
CREATE TABLE IF NOT EXISTS saved_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, deal_id)
);

-- Create deal_view_analytics table
CREATE TABLE IF NOT EXISTS deal_view_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create bulk_import_logs table
CREATE TABLE IF NOT EXISTS bulk_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name VARCHAR NOT NULL,
  total_count INTEGER NOT NULL,
  processed_count INTEGER DEFAULT 0,
  status VARCHAR DEFAULT 'in_progress' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_template_usage_deal_room ON template_usage(deal_room_id);
CREATE INDEX IF NOT EXISTS idx_deal_scores_total_score ON deal_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_saved_deals_user ON saved_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_view_analytics_deal ON deal_view_analytics(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_view_analytics_created ON deal_view_analytics(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_import_logs_user ON bulk_import_logs(user_id);

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_view_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_import_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_templates
CREATE POLICY "Public templates visible to all" ON document_templates
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can view their own templates" ON document_templates
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create templates" ON document_templates
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- RLS Policies for template_usage
CREATE POLICY "Users can view template usage for their deal rooms" ON template_usage
  FOR SELECT USING (
    deal_room_id IN (
      SELECT id FROM deal_rooms WHERE created_by = auth.uid()
      UNION
      SELECT deal_room_id FROM deal_room_participants WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for deal_scores
CREATE POLICY "Scores visible for public deals" ON deal_scores
  FOR SELECT USING (
    deal_id IN (SELECT id FROM deals WHERE status = 'published')
  );

-- RLS Policies for saved_deals
CREATE POLICY "Users can manage own saved deals" ON saved_deals
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for deal_view_analytics
CREATE POLICY "Analytics visible to deal creators" ON deal_view_analytics
  FOR SELECT USING (
    deal_id IN (SELECT id FROM deals WHERE created_by = auth.uid())
  );

-- RLS Policies for bulk_import_logs
CREATE POLICY "Users can view own import logs" ON bulk_import_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create import logs" ON bulk_import_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());
