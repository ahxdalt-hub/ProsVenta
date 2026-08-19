-- ============================================================================
-- Prosventa Prospect Discovery Engine Foundation
-- Stage 2 — Phase 7: Prospect Discovery Engine Foundation
-- ============================================================================
-- This migration creates the prospect_searches table for tracking discovery
-- requests made by organization members. This is the foundation for future
-- prospect discovery sources (Google Places, Apollo, Clearbit, etc.).
-- ============================================================================

-- ============================================================================
-- 1. PROSPECT SEARCHES TABLE
-- ============================================================================
-- Stores discovery search requests made by organization members.
-- Each search represents a request to find prospects matching specific criteria.
CREATE TABLE IF NOT EXISTS public.prospect_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  industry TEXT,
  location TEXT,
  company_size TEXT,
  keywords TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.prospect_searches ENABLE ROW LEVEL SECURITY;

-- Organization members can view searches belonging to their organization
CREATE POLICY "Organization members can view prospect searches"
  ON public.prospect_searches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = prospect_searches.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Organization members can create searches for their organization
CREATE POLICY "Organization members can insert prospect searches"
  ON public.prospect_searches
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = prospect_searches.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Organization members can update searches for their organization
CREATE POLICY "Organization members can update prospect searches"
  ON public.prospect_searches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = prospect_searches.organization_id
      AND organization_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = prospect_searches.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Organization members can delete searches for their organization
CREATE POLICY "Organization members can delete prospect searches"
  ON public.prospect_searches
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = prospect_searches.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Indexes for efficient prospect search lookups
CREATE INDEX IF NOT EXISTS idx_prospect_searches_organization_id ON public.prospect_searches(organization_id);
CREATE INDEX IF NOT EXISTS idx_prospect_searches_created_by ON public.prospect_searches(created_by);
CREATE INDEX IF NOT EXISTS idx_prospect_searches_status ON public.prospect_searches(status);
CREATE INDEX IF NOT EXISTS idx_prospect_searches_created_at ON public.prospect_searches(created_at);
-- Composite index for common query pattern: show searches for an org ordered by recency
CREATE INDEX IF NOT EXISTS idx_prospect_searches_org_created ON public.prospect_searches(organization_id, created_at DESC);