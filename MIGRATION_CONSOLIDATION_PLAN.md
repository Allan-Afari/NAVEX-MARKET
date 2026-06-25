# Migration Consolidation Plan (Updated)

## Issue
48 migrations (after duplicate removal) suggest schema churn with several incremental changes that could be consolidated.

## Completed: Phase 1 - Remove Duplicates ✅
- Deleted `20260405163113_1dd2f732-5b74-4192-a708-59a1f8db62a5.sql`
- Kept `20260411101326_72cbc5bf-9eba-45ed-a52b-c7f3937c2247.sql`

## Phase 2: Create Consolidated Migrations

### Deal Room Enhancements (May 2025)
**Existing files:**
- `20250503000001_create_realtime_chat.sql` - deal_room_messages
- `20250503000002_create_deal_room_activity.sql` - deal_room_activity
- `20250504000001_enhance_marketplace_features.sql` - marketplace enhancements
- `20250504000002_add_document_templates_and_search.sql` - document templates
- `20260427000001_add_deal_rooms.sql` - deal_rooms base table (CORRECTED: 2026 not 2025)
- `20250501000000_add_deal_room_negotiations.sql` - negotiations
- `20250502000000_add_conversation_deal_room_relation.sql` - conversation relation
- `20250503000000_add_document_access_policies.sql` - document policies
- `20250504000000_harden_deal_room_rls.sql` - RLS hardening
- `20250505000000_add_notifications_and_deadlines.sql` - notifications
- `20250506000000_enforce_confidential_document_policies.sql` - document policies
- `20260610000000_harden_deal_chat_rls.sql` - chat RLS

**Action**: Consolidate into `202505_consolidated_deal_rooms.sql`

### Security & Compliance (April-June 2026)
**Existing files:**
- `20260427000004_add_negotiation_dispute_compliance.sql`
- `20260427000005_email_notifications.sql`
- `20260427000006_add_onboarding.sql`
- `20260426120000_add_phone_verification_policy.sql`
- `20260621000000_unify_disputes.sql`
- `20260621000001_harden_edge_function_rls.sql`
- `20260622000000_fix_profiles_onboarding.sql`
- `20260616000000_add_profile_privacy_settings.sql`
- `20260616000001_add_signature_image_url.sql`

**Action**: Consolidate into `202606_consolidated_security_compliance.sql`

### Advanced Features (May-June 2026)
**Existing files:**
- `20260427000000_add_ai_matching.sql`
- `20260427000002_add_market_intelligence.sql`
- `20260427000003_add_performance_indexes.sql`
- `20250531000000_add_e_signature.sql`
- `20250531000001_add_portfolio_management.sql`
- `20250531000002_add_enterprise_security.sql`

**Action**: Consolidate into `202505_consolidated_advanced_features.sql`

### UUID Auto-generated Migrations (April 2026)
These appear to be auto-generated and may need individual review:
- `20260405163442_2e2d96b3-1f9e-4770-af51-35b16ab92aeb.sql`
- `20260405164005_3130fc5e-fd30-4460-829e-9b210e1bd881.sql`
- `20260407090415_f3f0a647-fb51-427e-8a7b-9dd80488161a.sql`
- `20260407090633_e265311e-c736-417f-ac28-298e9cd26d7e.sql`
- `20260410183759_de82b708-5cc0-4d9a-832c-4bfe5f5478f3.sql`
- `20260410184244_744412ea-41a5-41e9-9b62-72ef3b362a7c.sql`
- `20260411101357_e5e98de5-3682-43ac-992f-d383d640d45e.sql`
- `20260411101422_0ec65598-4668-494b-b3e9-3365d2fd3436.sql`
- `20260411101443_9a96d5be-daa2-4f82-b73d-a11546dd337b.sql`
- `20260411101459_0df2a520-e040-4831-8763-9dbf4ba51f52.sql`
- `20260411101520_6aeac370-e36b-4dcd-ab32-35b5845793ae.sql`
- `20260418202739_6a9cf8ed-7beb-422a-b361-18780b3a139d.sql`
- `20260418203018_3433c971-2624-4912-a07d-33f5305cb347.sql`
- `20260418203900_06cb3f10-3971-47de-be22-b19910b903c7.sql`
- `20260418204418_ee862b1d-95b2-4135-a5f3-b770a52c7fe2.sql`
- `20260419095008_490383fb-761f-49ac-b023-08d6f765c7dc.sql`
- `20260419095442_9583b37a-8bc6-436d-91dd-901477726c3f.sql`
- `20260420100913_6a30914a-e409-4f41-b54f-436358819070.sql`
- `20260420101548_d4a6ede2-222b-411a-bfb3-888fea1c754d.sql`
- `20260420101558_37950850-b41c-4e2d-a1fa-bd115cf14f4d.sql`
- `20260421092445_1f4d5d87-8cd9-4b55-96a9-d82b216675a3.sql`
- `20260421092912_35bbd09c-5459-45c3-81fb-8aa4c86ba07d.sql`
- `20260422163413_c4840fb3-1f76-4161-825c-d49e239a9d69.sql`

**Action**: Review individually, keep as-is (too risky to consolidate without understanding their purpose)

## Consolidation Strategy

### Phase 1: Remove Duplicates ✅ COMPLETED
1. ✅ Deleted `20260405163113_1dd2f732-5b74-4192-a708-59a1f8db62a5.sql`
2. ✅ Verified no references in codebase

### Phase 2: Create Consolidated Migrations (IN PROGRESS)
1. Create consolidated migration files for deal rooms, security, and advanced features
2. Test on local Supabase instance
3. Verify all RLS policies work correctly
4. Test edge functions that depend on these tables

### Phase 3: Update Migration Order
1. Rename consolidated migrations with proper timestamps
2. Update migration sequence
3. Document breaking changes if any

## Estimated Impact
- **Before**: 52 migrations
- **After Phase 1**: 48 migrations
- **After Phase 2**: ~35 migrations (27% reduction from original, 48 UUID migrations remain)
- **Risk**: Medium - requires thorough testing
- **Benefit**: Easier database management, faster resets, clearer schema evolution

## Notes
- UUID-named migrations (20260405*) appear to be auto-generated and should be reviewed individually
- Corrected file names from 2025 to 2026 based on actual files
- Migration consolidation should be done during a maintenance window
- Keep UUID migrations separate due to unknown purpose
