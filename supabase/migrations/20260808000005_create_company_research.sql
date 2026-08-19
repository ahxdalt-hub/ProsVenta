-- ============================================================================
-- Prosventa AI Company Research Storage
-- Stage 4 — Phase 4: AI Company Research
-- ============================================================================
-- Stores the structured, grounded AI research brief for a company.
-- The `result` JSONB column holds the validated CompanyResearchResult payload.
-- `sources` holds the traceable source metadata (Prosventa data, enrichment,
-- or future external web research).
-- Unique (prospect_id, domain) prevents duplicate research per company.
-- RLS scopes rows to the user's organization (never disabled).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.company_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none','processing','completed','failed')),
  error_code TEXT,
  error_message TEXT,
  -- Full validated CompanyResearchResult payload
  result JSONB,
  -- AI provider used (e.g. "grounded-v1", future "openai", "anthropic")
  provider TEXT NOT NULL,
  -- Model identifier where appropriate (null for deterministic engine)
  model TEXT,
  -- Traceable source metadata (ResearchSource[])
  sources JSONB,
  -- Overall research confidence 0-100 (null when unknown)
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  researched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_prospect_domain_research UNIQUE (prospect_id, domain)
);

ALTER TABLE public.company_research ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company research in their org" ON public.company_research;
DROP POLICY IF EXISTS "Members can create company research" ON public.company_research;
DROP POLICY IF EXISTS "Members can update company research" ON public.company_research;
DROP POLICY IF EXISTS "Members can delete company research" ON public.company_research;

CREATE POLICY "Members can view company research in their org"
  ON public.company_research FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = company_research.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create company research"
  ON public.company_research FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = company_research.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can update company research"
  ON public.company_research FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = company_research.organization_id
    AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = company_research.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete company research"
  ON public.company_research FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = company_research.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_company_research_org_id ON public.company_research(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_research_prospect_id ON public.company_research(prospect_id);
CREATE INDEX IF NOT EXISTS idx_company_research_domain ON public.company_research(domain);
CREATE INDEX IF NOT EXISTS idx_company_research_status ON public.company_research(status);
CREATE INDEX IF NOT EXISTS idx_company_research_researched_at ON public.company_research(researched_at);
CREATE INDEX IF NOT EXISTS idx_company_research_prospect_domain ON public.company_research(prospect_id, domain);

-- ============================================================================
-- UPDATED_AT CONVENTION
-- ============================================================================
-- updated_at is managed by the application layer, matching the existing
-- codebase convention (see intelligence foundation migration).
-- No database triggers are used for updated_at.