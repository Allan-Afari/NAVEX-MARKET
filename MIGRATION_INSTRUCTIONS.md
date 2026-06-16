# Database Migration Instructions

## Overview
This document provides instructions for applying the two critical database migrations required for the Navex Market launch.

## Migration Files
1. `supabase/migrations/20250504_add_document_templates_and_search.sql`
2. `supabase/migrations/20250504_enhance_marketplace_features.sql`

## Prerequisites
- Access to the Supabase dashboard for project: `wumsrocqqovdjtmvjknj` (from .env)
- Admin privileges to run SQL migrations

## Method 1: Apply via Supabase Dashboard (Recommended for Production)

### Step 1: Access SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project (ID: `wumsrocqqovdjtmvjknj`)
3. Navigate to SQL Editor in the left sidebar

### Step 2: Apply First Migration
1. Click "New Query"
2. Copy the contents of `supabase/migrations/20250504_add_document_templates_and_search.sql`
3. Paste into the SQL editor
4. Review the SQL to ensure it's correct
5. Click "Run" to execute
6. Verify no errors occurred

### Step 3: Apply Second Migration
1. Click "New Query"
2. Copy the contents of `supabase/migrations/20250504_enhance_marketplace_features.sql`
3. Paste into the SQL editor
4. Review the SQL to ensure it's correct
5. Click "Run" to execute
6. Verify no errors occurred

## Method 2: Apply via Supabase CLI

### Step 1: Link to Correct Project
The config.toml has a different project ID than .env. Update config.toml:

```bash
# Update supabase/config.toml
project_id = "wumsrocqqovdjtmvjknj"
```

### Step 2: Push Migrations
```bash
cd "c:\Users\HP\Downloads\Navex market\trusty-digger-finder-main"
.\supabase.exe db push
```

## What These Migrations Do

### Migration 1: 20250504_add_document_templates_and_search.sql
- Creates `document_templates` table for reusable document templates
- Creates `template_usage` table to track template usage
- Creates `deal_scores` table for quality scoring
- Creates `saved_deals` table for user-saved deals
- Creates `deal_view_analytics` table for tracking deal views
- Creates `bulk_import_logs` table for tracking bulk imports
- Adds indexes for performance
- Sets up Row Level Security (RLS) policies

### Migration 2: 20250504_enhance_marketplace_features.sql
- Adds `preferred_stages` column to deals table
- Adds `preferred_industries` column to deals table
- Adds `preferred_locations` column to deals table
- Adds `view_count` column to deals table
- Adds `engagement_score` column to deals table
- Creates indexes for improved search performance
- Creates full-text search index
- Adds trigger to increment view_count
- Adds compliance enforcement fields to deal_rooms table

## Verification
After applying migrations, verify:

1. Check that new tables exist in the Table Editor
2. Verify that new columns appear in the deals table
3. Test that the integrated components work correctly
4. Check for any console errors when using the application

## Rollback (If Needed)
If issues occur, you can rollback by:

1. Go to SQL Editor
2. Run DROP TABLE statements in reverse order of creation
3. Remove added columns using ALTER TABLE statements

## Notes
- These migrations are required for the new features to work
- Document templates, quality scoring, and enhanced search depend on these changes
- Apply migrations during a maintenance window if possible
- Backup your database before applying migrations (recommended)
