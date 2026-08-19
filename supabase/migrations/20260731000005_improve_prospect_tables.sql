-- ============================================================================
-- Prosventa Prospect Data Processing & Enrichment Foundation
-- Stage 2 — Phase 8: Prospect Data Processing & Enrichment Foundation
-- ============================================================================
-- This migration improves the prospects table with enrichment-ready fields,
-- updated status values, and new indexes for query performance.
-- ============================================================================

-- ============================================================================
-- 1. PROSPECTS TABLE IMPROVEMENTS
-- ============================================================================

-- 1a. Drop the old status check constraint so we can migrate status values
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_status_check;

-- 1b. Migrate existing status values to the new lifecycle
--     pending   -> new
--     verified  -> reviewed
--     invalid   -> archived
--     saved     -> saved
UPDATE public.prospects
SET status = CASE
  WHEN status = 'pending' THEN 'new'
  WHEN status = 'verified' THEN 'reviewed'
  WHEN status = 'invalid' THEN 'archived'
  ELSE 'saved'
END;

-- 1c. Add new columns for enriched prospect data
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS domain TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS employee_count INTEGER,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (enrichment_status IN ('pending', 'processing', 'completed', 'failed'));

-- 1d. Add the new status check constraint
ALTER TABLE public.prospects
  ADD CONSTRAINT prospects_status_check
  CHECK (status IN ('new', 'reviewed', 'saved', 'archived'));

-- 1e. Normalize existing company_name values into the new name column
--     (name becomes the primary display field; company_name is retained
--      for backwards compatibility with Phase 6/7 code.)
UPDATE public.prospects
SET name = COALESCE(name, company_name)
WHERE name IS NULL;

-- ============================================================================
-- 2. INDEXES
-- ============================================================================
-- Indexes for efficient prospect lookups and filtering.
CREATE INDEX IF NOT EXISTS idx_prospects_organization_id ON public.prospects(organization_id);
CREATE INDEX IF NOT EXISTS idx_prospects_industry ON public.prospects(industry);
CREATE INDEX IF NOT EXISTS idx_prospects_country ON public.prospects(country);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON public.prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_enrichment_status ON public.prospects(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_prospects_source ON public.prospects(source);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON public.prospects(created_at);

-- ============================================================================
-- 3. PROSPECT SEARCHES INDEX
-- ============================================================================
-- Ensure the composite index from Phase 7 exists for search lookups.
CREATE INDEX IF NOT EXISTS idx_prospect_searches_org_created
  ON public.prospect_searches(organization_id, created_at DESC);