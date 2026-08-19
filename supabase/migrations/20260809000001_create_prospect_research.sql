-- ============================================================================
-- Prosventa AI Prospect Research Storage
-- Stage 4 — Phase 5: AI Prospect Research
-- ============================================================================
-- Stores the structured, grounded AI research brief for a prospect/contact.
-- The `result` JSONB column holds the validated ProspectResearchResult payload.
-- `sources` holds the traceable source metadata (Prosventa data, enrichment,
-- company research brief, or future external web research).
-- Unique prospect_id prevents duplicate research per prospect.
-- RLS scopes rows to the user's organization (never disabled).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prospect_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none','processing','completed','failed')),
  error_code TEXT,
  error_message TEXT,
  -- Full validated ProspectResearchResult payload
  result JSONB,
  -- AI provider used (e.g. "grounded-prospect-v1", future "openai", "anthropic")
  provider TEXT NOT NULL,
  -- Model identifier where appropriate (null for deterministic engine)
  model TEXT,
  -- Traceable source metadata (ProspectResearchSource[])
  sources JSONB,
  -- Overall research confidence 0-100 (null when unknown)
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  researched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_prospect_research UNIQUE (prospect_id)
);

ALTER TABLE public.prospect_research ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view prospect research in their org" ON public.prospect_research;
DROP POLICY IF EXISTS "Members can create prospect research" ON public.prospect_research;
DROP POLICY IF EXISTS "Members can update prospect research" ON public.prospect_research;
DROP POLICY IF EXISTS "Members can delete prospect research" ON public.prospect_research;

CREATE POLICY "Members can view prospect research in their org"
  ON public.prospect_research FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = prospect_research.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create prospect research"
  ON public.prospect_research FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = prospect_research.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can update prospect research"
  ON public.prospect_research FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = prospect_research.organization_id
    AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = prospect_research.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete prospect research"
  ON public.prospect_research FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = prospect_research.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_prospect_research_org_id ON public.prospect_research(organization_id);
CREATE INDEX IF NOT EXISTS idx_prospect_research_prospect_id ON public.prospect_research(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_research_status ON public.prospect_research(status);
CREATE INDEX IF NOT EXISTS idx_prospect_research_researched_at ON public.prospect_research(researched_at);

-- ============================================================================
-- UPDATED_AT CONVENTION
-- ============================================================================
-- updated_at is managed by the application layer, matching the existing
-- codebase convention (see intelligence foundation migration).
-- No database triggers are used for updated_at.