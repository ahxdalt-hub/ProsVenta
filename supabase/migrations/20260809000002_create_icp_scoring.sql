-- ============================================================================
-- Prosventa Smart Lead & ICP Scoring
-- Stage 4 — Phase 6: Smart Lead & ICP Scoring
-- ============================================================================
-- Creates the ICP configuration and prospect score storage.
-- RLS scopes rows to the user's organization (never disabled).
-- ============================================================================

-- ============================================================================
-- 1. ICP CONFIGURATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.icp_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default ICP',
  description TEXT,
  -- Company criteria (JSONB, validated strongly in TypeScript)
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_org_icp UNIQUE (organization_id, name)
);

ALTER TABLE public.icp_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view ICP configs in their org" ON public.icp_configurations;
DROP POLICY IF EXISTS "Members can create ICP configs" ON public.icp_configurations;
DROP POLICY IF EXISTS "Members can update ICP configs" ON public.icp_configurations;
DROP POLICY IF EXISTS "Members can delete ICP configs" ON public.icp_configurations;

CREATE POLICY "Members can view ICP configs in their org"
  ON public.icp_configurations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = icp_configurations.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create ICP configs"
  ON public.icp_configurations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = icp_configurations.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can update ICP configs"
  ON public.icp_configurations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = icp_configurations.organization_id
    AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = icp_configurations.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete ICP configs"
  ON public.icp_configurations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = icp_configurations.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_icp_configs_org_id ON public.icp_configurations(organization_id);

-- ============================================================================
-- 2. PROSPECT SCORES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.prospect_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  icp_configuration_id UUID REFERENCES public.icp_configurations(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  category TEXT NOT NULL CHECK (category IN ('excellent','strong','moderate','weak','poor')),
  company_score INTEGER CHECK (company_score >= 0 AND company_score <= 100),
  prospect_score INTEGER CHECK (prospect_score >= 0 AND prospect_score <= 100),
  factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  scoring_version TEXT NOT NULL,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_prospect_score UNIQUE (prospect_id)
);

ALTER TABLE public.prospect_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view prospect scores in their org" ON public.prospect_scores;
DROP POLICY IF EXISTS "Members can create prospect scores" ON public.prospect_scores;
DROP POLICY IF EXISTS "Members can update prospect scores" ON public.prospect_scores;
DROP POLICY IF EXISTS "Members can delete prospect scores" ON public.prospect_scores;

CREATE POLICY "Members can view prospect scores in their org"
  ON public.prospect_scores FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = prospect_scores.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create prospect scores"
  ON public.prospect_scores FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = prospect_scores.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can update prospect scores"
  ON public.prospect_scores FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = prospect_scores.organization_id
    AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = prospect_scores.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete prospect scores"
  ON public.prospect_scores FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = prospect_scores.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_prospect_scores_org_id ON public.prospect_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_prospect_scores_prospect_id ON public.prospect_scores(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_scores_icp_id ON public.prospect_scores(icp_configuration_id);
CREATE INDEX IF NOT EXISTS idx_prospect_scores_score ON public.prospect_scores(score);
CREATE INDEX IF NOT EXISTS idx_prospect_scores_category ON public.prospect_scores(category);
CREATE INDEX IF NOT EXISTS idx_prospect_scores_confidence ON public.prospect_scores(confidence);

-- ============================================================================
-- UPDATED_AT CONVENTION
-- ============================================================================
-- updated_at is managed by the application layer, matching the existing
-- codebase convention. No database triggers are used for updated_at.