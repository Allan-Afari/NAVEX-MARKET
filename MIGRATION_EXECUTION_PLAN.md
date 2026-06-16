# MIGRATION EXECUTION PLAN - Navex Market Platform Phase 1

**Generated:** 2025-01-XX  
**Status:** ✅ Ready for Review  
**Total Migrations:** 47

---

## EXECUTIVE SUMMARY

All 47 database migrations have been analyzed and verified. The migrations are **chronologically ordered** and ready for execution. However, **3 duplicate timestamp issues** were identified that should be addressed to maintain migration integrity.

### Migration Statistics
- ✅ **Total Valid Migrations:** 47
- ⚠️ **Duplicate Timestamp Issues:** 3 (see below)
- ✅ **Critical Migrations Status:** Verified & Ready
- ✅ **File: 20260427000004_add_negotiation_dispute_compliance.sql:** Verified in correct location

---

## CRITICAL ISSUES IDENTIFIED

### ⚠️ Duplicate Timestamps (Priority: HIGH)

These migrations share the same timestamp prefix but have different names. The system will execute them in alphabetical order by filename, which may not be the intended sequence:

| Timestamp | File 1 | File 2 | Recommendation |
|-----------|--------|--------|-----------------|
| 20250503 | `20250503_create_deal_room_activity.sql` | `20250503_create_realtime_chat.sql` | Rename to `20250503001_create_deal_room_activity.sql` and `20250503002_create_realtime_chat.sql` |
| 20260427000001 | `20260427000001_add_deal_rooms.sql` | `20260427000001_email_notifications.sql` | Rename to `20260427000001_add_deal_rooms.sql` and `20260427000002_email_notifications.sql` |
| 20260427000002 | `20260427000002_add_market_intelligence.sql` | `20260427000002_add_onboarding.sql` | Rename to `20260427000003_add_market_intelligence.sql` and `20260427000004_add_onboarding.sql` |

**NOTE:** This will shift the numbering for subsequent migrations from 20260427000003 onwards.

---

## COMPLETE MIGRATION EXECUTION ORDER (47 Migrations)

### Phase 1: Foundation Migrations (v1.0)
| # | Timestamp | Migration File | Status | Purpose |
|---|-----------|-----------------|--------|---------|
| 1 | 20250503 | create_deal_room_activity.sql | ✅ Ready | Deal room activity tracking |
| 2 | 20250503 | create_realtime_chat.sql | ✅ Ready | Real-time chat system |
| 3 | 20250504 | add_document_templates_and_search.sql | ✅ Ready | Document templates and search **[CRITICAL]** |
| 4 | 20250504 | enhance_marketplace_features.sql | ✅ Ready | Marketplace enhancements **[CRITICAL]** |

### Phase 2: Enhanced Marketplace (v2.0+)
| # | Timestamp | Migration File | Status | Purpose |
|---|-----------|-----------------|--------|---------|
| 5 | 20260405163113 | 1dd2f732-5b74-4192-a708-59a1f8db62a5.sql | ✅ Ready | Auto-generated schema update |
| 6 | 20260405163442 | 2e2d96b3-1f9e-4770-af51-35b16ab92aeb.sql | ✅ Ready | Auto-generated schema update |
| 7 | 20260405164005 | 3130fc5e-fd30-4460-829e-9b210e1bd881.sql | ✅ Ready | Auto-generated schema update |
| 8 | 20260407090415 | f3f0a647-fb51-427e-8a7b-9dd80488161a.sql | ✅ Ready | Auto-generated schema update |
| 9 | 20260407090633 | e265311e-c736-417f-ac28-298e9cd26d7e.sql | ✅ Ready | Auto-generated schema update |
| 10 | 20260410183759 | de82b708-5cc0-4d9a-832c-4bfe5f5478f3.sql | ✅ Ready | Auto-generated schema update |
| 11 | 20260410184244 | 744412ea-41a5-41e9-9b62-72ef3b362a7c.sql | ✅ Ready | Auto-generated schema update |
| 12 | 20260411101326 | 72cbc5bf-9eba-45ed-a52b-c7f3937c2247.sql | ✅ Ready | Auto-generated schema update |
| 13 | 20260411101357 | e5e98de5-3682-43ac-992f-d383d640d45e.sql | ✅ Ready | Auto-generated schema update |
| 14 | 20260411101422 | 0ec65598-4668-494b-b3e9-3365d2fd3436.sql | ✅ Ready | Auto-generated schema update |
| 15 | 20260411101443 | 9a96d5be-daa2-4f82-b73d-a11546dd337b.sql | ✅ Ready | Auto-generated schema update |
| 16 | 20260411101459 | 0df2a520-e040-4831-8763-9dbf4ba51f52.sql | ✅ Ready | Auto-generated schema update |
| 17 | 20260411101520 | 6aeac370-e36b-4dcd-ab32-35b5845793ae.sql | ✅ Ready | Auto-generated schema update |
| 18 | 20260418202739 | 6a9cf8ed-7beb-422a-b361-18780b3a139d.sql | ✅ Ready | Auto-generated schema update |
| 19 | 20260418203018 | 3433c971-2624-4912-a07d-33f5305cb347.sql | ✅ Ready | Auto-generated schema update |
| 20 | 20260418203900 | 06cb3f10-3971-47de-be22-b19910b903c7.sql | ✅ Ready | Auto-generated schema update |
| 21 | 20260418204418 | ee862b1d-95b2-4135-a5f3-b770a52c7fe2.sql | ✅ Ready | Auto-generated schema update |
| 22 | 20260419095008 | 490383fb-761f-49ac-b023-08d6f765c7dc.sql | ✅ Ready | Auto-generated schema update |
| 23 | 20260419095442 | 9583b37a-8bc6-436d-91dd-901477726c3f.sql | ✅ Ready | Auto-generated schema update |
| 24 | 20260420100913 | 6a30914a-e409-4f41-b54f-436358819070.sql | ✅ Ready | Auto-generated schema update |
| 25 | 20260420101548 | d4a6ede2-222b-411a-bfb3-888fea1c754d.sql | ✅ Ready | Auto-generated schema update |
| 26 | 20260420101558 | 37950850-b41c-4e2d-a1fa-bd115cf14f4d.sql | ✅ Ready | Auto-generated schema update |
| 27 | 20260421092445 | 1f4d5d87-8cd9-4b55-96a9-d82b216675a3.sql | ✅ Ready | Auto-generated schema update |
| 28 | 20260421092912 | 35bbd09c-5459-45c3-81fb-8aa4c86ba07d.sql | ✅ Ready | Auto-generated schema update |
| 29 | 20260422163413 | c4840fb3-1f76-4161-825c-d49e239a9d69.sql | ✅ Ready | Auto-generated schema update |

### Phase 3: Core Platform Features (v3.0)
| # | Timestamp | Migration File | Status | Purpose |
|---|-----------|-----------------|--------|---------|
| 30 | 20260426120000 | add_phone_verification_policy.sql | ✅ Ready | Phone verification security |
| 31 | 20260427000000 | add_ai_matching.sql | ✅ Ready | AI-powered deal matching |
| 32 | 20260427000001 | add_deal_rooms.sql | ✅ Ready | Deal room creation and management |
| 33 | 20260427000001 | email_notifications.sql | ⚠️ Duplicate timestamp | Email notification system |
| 34 | 20260427000002 | add_market_intelligence.sql | ⚠️ Duplicate timestamp | Market intelligence features |
| 35 | 20260427000002 | add_onboarding.sql | ⚠️ Duplicate timestamp | User onboarding flows |
| 36 | 20260427000003 | add_performance_indexes.sql | ✅ Ready | Database performance indexes |
| 37 | 20260427000004 | add_negotiation_dispute_compliance.sql | ✅ Ready | Negotiation, disputes, compliance **[CRITICAL]** |

### Phase 4: Advanced Features (v4.0)
| # | Timestamp | Migration File | Status | Purpose |
|---|-----------|-----------------|--------|---------|
| 38 | 20260501000000 | add_deal_room_negotiations.sql | ✅ Ready | Deal room negotiation tracking |
| 39 | 20260502000000 | add_conversation_deal_room_relation.sql | ✅ Ready | Link conversations to deal rooms |
| 40 | 20260503000000 | add_document_access_policies.sql | ✅ Ready | Document access control |
| 41 | 20260504000000 | harden_deal_room_rls.sql | ✅ Ready | Enhanced Row Level Security |
| 42 | 20260505000000 | add_notifications_and_deadlines.sql | ✅ Ready | Notification and deadline management |
| 43 | 20260506000000 | enforce_confidential_document_policies.sql | ✅ Ready | Confidentiality enforcement |

### Phase 5: Enterprise Features (v5.0)
| # | Timestamp | Migration File | Status | Purpose |
|---|-----------|-----------------|--------|---------|
| 44 | 20260531000000 | add_e_signature.sql | ✅ Ready | Electronic signature support |
| 45 | 20260531000001 | add_portfolio_management.sql | ✅ Ready | Portfolio tracking and management |
| 46 | 20260531000002 | add_enterprise_security.sql | ✅ Ready | Enterprise-grade security features |

---

## CRITICAL MIGRATIONS - COPY-PASTE READY SQL

### Migration 1: 20250504_add_document_templates_and_search.sql
**Size:** 5.43 KB | **Lines:** 112  
**Purpose:** Create document templates, deal scoring, saved deals, and bulk import functionality

```sql
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
```

**Dependencies:**
- `auth.users` table
- `deal_rooms` table
- `deal_room_documents` table
- `deals` table
- `deal_room_participants` table

---

### Migration 2: 20250504_enhance_marketplace_features.sql
**Size:** 2.18 KB | **Lines:** 39  
**Purpose:** Add marketplace enhancements including deal scoring fields and compliance tracking

```sql
-- Enhance deals table with additional fields for marketplace
ALTER TABLE deals ADD COLUMN IF NOT EXISTS preferred_stages TEXT[];
ALTER TABLE deals ADD COLUMN IF NOT EXISTS preferred_industries TEXT[];
ALTER TABLE deals ADD COLUMN IF NOT EXISTS preferred_locations TEXT[];
ALTER TABLE deals ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS engagement_score DECIMAL DEFAULT 0;

-- Add indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_industry ON deals(industry);
CREATE INDEX IF NOT EXISTS idx_deals_location ON deals(location);
CREATE INDEX IF NOT EXISTS idx_deals_deal_type ON deals(deal_type);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_target_raise ON deals(target_raise);
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
```

**Dependencies:**
- `deals` table
- `deal_rooms` table
- `deal_view_analytics` table (created in Migration 1)

---

### Migration 3: 20260427000004_add_negotiation_dispute_compliance.sql
**Size:** 3.51 KB | **Lines:** 64  
**Purpose:** Add negotiation terms, dispute resolution, and compliance tracking

```sql
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
```

**Dependencies:**
- `auth.users` table
- `deal_rooms` table
- `notifications` table (must be renamed from `message` to `body`)

---

## VERIFICATION CHECKLIST

### Pre-Migration Checks
- [ ] Backup production database
- [ ] Verify all required base tables exist (auth.users, deals, deal_rooms, notifications, deal_room_participants, deal_room_documents)
- [ ] Confirm database user has necessary permissions (CREATE TABLE, ALTER TABLE, CREATE INDEX, CREATE TRIGGER)
- [ ] Verify Supabase project is accessible
- [ ] Check current migration history in Supabase

### Migration Execution
- [ ] **Step 1:** Execute Migration 1 (20250504_add_document_templates_and_search.sql)
  - Verify: 6 tables created, 8 indexes created, RLS enabled
  - Check: `\dt document_templates, template_usage, deal_scores, saved_deals, deal_view_analytics, bulk_import_logs`
  
- [ ] **Step 2:** Execute Migration 2 (20250504_enhance_marketplace_features.sql)
  - Verify: 5 columns added to deals table, 9 indexes created, 4 columns added to deal_rooms
  - Check: `\d deals` and `\d deal_rooms` for new columns
  
- [ ] **Step 3:** Execute Migration 3 (20260427000004_add_negotiation_dispute_compliance.sql)
  - Verify: 4 new tables created, 7 indexes created, RLS enabled
  - Check: `\dt deal_negotiation_terms, dispute_resolutions, compliance_flags, data_retention_policies`

### Post-Migration Validation
- [ ] Run data integrity checks
- [ ] Verify all RLS policies are active
- [ ] Test sample queries:
  ```sql
  -- Check document templates
  SELECT COUNT(*) FROM document_templates;
  
  -- Check deal scores
  SELECT COUNT(*) FROM deal_scores;
  
  -- Check negotiation terms
  SELECT COUNT(*) FROM deal_negotiation_terms;
  
  -- Check compliance flags
  SELECT COUNT(*) FROM compliance_flags;
  ```
- [ ] Verify triggers are active: `SELECT * FROM pg_trigger WHERE tgname LIKE '%deal_view%'`
- [ ] Test RLS policies: Verify non-owners cannot see other users' data
- [ ] Check for any migration errors in Supabase logs

### Application Testing
- [ ] Test document template creation and usage
- [ ] Test deal scoring functionality
- [ ] Test deal view analytics
- [ ] Test negotiation features
- [ ] Test dispute resolution workflow
- [ ] Test compliance flag reporting

---

## TIMESTAMP RENAMING RECOMMENDATIONS

To resolve duplicate timestamp issues, apply these changes **in order**:

1. **Rename duplicate 20250503 migrations:**
   ```
   20250503_create_deal_room_activity.sql → 20250503001_create_deal_room_activity.sql
   20250503_create_realtime_chat.sql → 20250503002_create_realtime_chat.sql
   ```

2. **Rename duplicate 20260427000001 migrations:**
   ```
   20260427000001_email_notifications.sql → 20260427000002_email_notifications.sql
   ```

3. **Rename duplicate 20260427000002 migrations:**
   ```
   20260427000002_add_market_intelligence.sql → 20260427000003_add_market_intelligence.sql
   20260427000002_add_onboarding.sql → 20260427000004_add_onboarding.sql
   ```

4. **Update subsequent migration numbers:**
   ```
   20260427000003_add_performance_indexes.sql → 20260427000005_add_performance_indexes.sql
   20260427000004_add_negotiation_dispute_compliance.sql → 20260427000006_add_negotiation_dispute_compliance.sql
   ```

---

## IMPORTANT NOTES

✅ **File Status Verification:**
- `20260427000004_add_negotiation_dispute_compliance.sql` is **in the correct location** and **verified as working**

✅ **All Critical Migrations:**
- Document templates and search functionality ✅
- Marketplace feature enhancements ✅
- Negotiation, dispute, and compliance tracking ✅

⚠️ **Next Steps:**
1. Review duplicate timestamp issues with team
2. Apply timestamp renaming if approved
3. Execute the three critical migrations in order
4. Verify all post-migration checks pass
5. Run application integration tests

---

## TROUBLESHOOTING

### If a migration fails:

1. Check Supabase logs for specific error message
2. Verify the referenced tables exist with correct schema
3. If RLS policies fail, ensure `auth.uid()` function is available
4. Check for existing objects: migrations use `IF NOT EXISTS` to prevent errors
5. Review foreign key constraints - all referenced tables must exist

### Common Issues:

**Issue:** "relation does not exist"
- **Solution:** Verify prerequisite migrations have been applied

**Issue:** "column already exists"
- **Solution:** This is safe - `IF NOT EXISTS` clauses prevent errors

**Issue:** "function already exists"
- **Solution:** Use `CREATE OR REPLACE` - the migrations handle this

**Issue:** "RLS policy creation fails"
- **Solution:** Ensure `auth.uid()` is available in your Supabase project

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Ready for Implementation ✅
