-- ============================================================================
-- Prosventa Intelligence — Feature 4: Phase 1
-- Intelligence Foundation, Evidence Graph & Reasoning Architecture
-- ============================================================================
-- Creates the reasoning-layer foundation for evidence-grounded Intelligence:
--
--   intelligence_insights      → the normalized Intelligence entity.
--                                One row = one generated Intelligence result
--                                for a subject (prospect OR company) under a
--                                specific ICP context. References existing
--                                records — NEVER duplicates prospect/company/
--                                enrichment/signal data.
--   intelligence_evidence_refs → evidence graph foundation. Each row points at
--                                an existing record that supported a conclusion
--                                (ICP config, prospect row, enrichment record,
--                                signal, score, activity event).
--
-- Also extends intelligence_usage additively so AI reasoning cost becomes
-- measurable (model, sizes, duration, provider-reported metadata). No billing,
-- no credit deduction — measurement only in Phase 1.
--
-- Additive. Does not weaken any existing RLS policy.
-- ============================================================================

-- ============================================================================
-- 1. INTELLIGENCE INSIGHTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.intelligence_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Subject: exactly one of prospect / company scope (company_key is the same
  -- normalized domain used across signals + enrichments; there is no separate
  -- companies table to duplicate).
  scope TEXT NOT NULL CHECK (scope IN ('prospect', 'company')),
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  company_key TEXT,

  -- Lifecycle (centralized in features/intelligence/reasoning/types.ts):
  -- pending → processing → ready | failed ; ready → stale on invalidation.
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'ready', 'stale', 'failed')
  ),

  -- Versioning foundation: regeneration creates a new version and links back.
  version INTEGER NOT NULL DEFAULT 1,
  previous_version_id UUID REFERENCES public.intelligence_insights(id) ON DELETE SET NULL,

  -- ICP context snapshot: which criteria produced this interpretation.
  icp_configuration_id UUID REFERENCES public.icp_configurations(id) ON DELETE SET NULL,
  icp_snapshot JSONB NOT NULL DEFAULT '{}',

  -- Structured, explainable scores (0–100 or null when unknown), each with
  -- positive/negative/unknown factors. Never a single mysterious "AI score".
  scores JSONB NOT NULL DEFAULT '{}',
  confidence JSONB NOT NULL DEFAULT '{}',
  freshness JSONB NOT NULL DEFAULT '{}',

  -- Interpretation layer (clearly distinct from stored FACT data).
  explanation TEXT,
  key_factors JSONB NOT NULL DEFAULT '[]',
  concerns JSONB NOT NULL DEFAULT '[]',

  -- Engine/model provenance: provider id, model id, task type. No secrets.
  engine JSONB NOT NULL DEFAULT '{}',

  -- Caching/regeneration: digest of the normalized reasoning input. When the
  -- digest is unchanged, existing intelligence can be reused.
  input_digest TEXT,
  error_code TEXT,
  error_message TEXT,

  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT intelligence_insights_subject_check CHECK (
    (scope = 'prospect' AND prospect_id IS NOT NULL)
    OR (scope = 'company' AND company_key IS NOT NULL)
  )
);

ALTER TABLE public.intelligence_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view intelligence insights in their org" ON public.intelligence_insights;
DROP POLICY IF EXISTS "Members can create intelligence insights" ON public.intelligence_insights;
DROP POLICY IF EXISTS "Members can update intelligence insights" ON public.intelligence_insights;
DROP POLICY IF EXISTS "Members can delete intelligence insights" ON public.intelligence_insights;


CREATE POLICY "Members can view intelligence insights in their org"
  ON public.intelligence_insights FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_insights.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create intelligence insights"
  ON public.intelligence_insights FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_insights.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can update intelligence insights"
  ON public.intelligence_insights FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_insights.organization_id
    AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_insights.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete intelligence insights"
  ON public.intelligence_insights FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_insights.organization_id
    AND om.user_id = auth.uid()
  ));

-- Targeted access-pattern indexes (latest-per-subject reads, history scans).
CREATE INDEX IF NOT EXISTS idx_intel_insights_org_status
  ON public.intelligence_insights(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_intel_insights_org_prospect_version
  ON public.intelligence_insights(organization_id, prospect_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_intel_insights_org_company_version
  ON public.intelligence_insights(organization_id, company_key, version DESC);
CREATE INDEX IF NOT EXISTS idx_intel_insights_generated_at
  ON public.intelligence_insights(generated_at);
CREATE INDEX IF NOT EXISTS idx_intel_insights_updated_at
  ON public.intelligence_insights(updated_at);
CREATE INDEX IF NOT EXISTS idx_intel_insights_previous_version
  ON public.intelligence_insights(previous_version_id);

-- Duplicate-generation guard: at most ONE in-flight (pending/processing)
-- generation per subject per organization. Concurrent requests collapse —
-- the second insert fails with a unique violation instead of creating an
-- uncontrolled duplicate. Completed/stale/failed rows are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_intel_insights_active_prospect
  ON public.intelligence_insights(organization_id, prospect_id)
  WHERE status IN ('pending', 'processing');
CREATE UNIQUE INDEX IF NOT EXISTS uniq_intel_insights_active_company
  ON public.intelligence_insights(organization_id, company_key)
  WHERE status IN ('pending', 'processing');

-- ============================================================================
-- 2. INTELLIGENCE EVIDENCE REFS (evidence graph foundation)
-- ============================================================================
-- Points at EXISTING records only. No copies of enrichment/provider payloads.
-- Answers: what fact was used, where from, when observed, how fresh.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.intelligence_evidence_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  insight_id UUID NOT NULL REFERENCES public.intelligence_insights(id) ON DELETE CASCADE,

  ref_type TEXT NOT NULL CHECK (
    ref_type IN ('icp', 'prospect', 'company', 'enrichment', 'signal', 'score', 'activity')
  ),
  -- Existing table the fact lives in (e.g. 'signals', 'company_enrichments').
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  source TEXT,
  occurred_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  freshness TEXT CHECK (freshness IN ('recent', 'aging', 'historical')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.intelligence_evidence_refs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view intelligence evidence refs in their org" ON public.intelligence_evidence_refs;
DROP POLICY IF EXISTS "Members can create intelligence evidence refs" ON public.intelligence_evidence_refs;
DROP POLICY IF EXISTS "Members can delete intelligence evidence refs" ON public.intelligence_evidence_refs;

CREATE POLICY "Members can view intelligence evidence refs in their org"
  ON public.intelligence_evidence_refs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_evidence_refs.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create intelligence evidence refs"
  ON public.intelligence_evidence_refs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_evidence_refs.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete intelligence evidence refs"
  ON public.intelligence_evidence_refs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_evidence_refs.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_intel_evidence_insight
  ON public.intelligence_evidence_refs(insight_id);
CREATE INDEX IF NOT EXISTS idx_intel_evidence_org
  ON public.intelligence_evidence_refs(organization_id);
CREATE INDEX IF NOT EXISTS idx_intel_evidence_ref
  ON public.intelligence_evidence_refs(table_name, record_id);

-- ============================================================================
-- 3. INTELLIGENCE USAGE � cost-measurement extension (additive)
-- ============================================================================
-- New operation kind for the reasoning engine + measurable dimensions so
-- Intelligence API/AI cost is attributable per organization. Phase 1 does NOT
-- deduct credits or bill anyone.
-- ============================================================================
ALTER TABLE public.intelligence_usage DROP CONSTRAINT IF EXISTS intelligence_usage_operation_check;
ALTER TABLE public.intelligence_usage
  ADD CONSTRAINT intelligence_usage_operation_check
  CHECK (operation IN (
    'company_enrichment',
    'prospect_enrichment',
    'company_research',
    'prospect_research',
    'signals',
    'intelligence_generation'
  ));

ALTER TABLE public.intelligence_usage
  ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.intelligence_usage
  ADD COLUMN IF NOT EXISTS input_size INTEGER;
ALTER TABLE public.intelligence_usage
  ADD COLUMN IF NOT EXISTS output_size INTEGER;
ALTER TABLE public.intelligence_usage
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE public.intelligence_usage
  ADD COLUMN IF NOT EXISTS usage_metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_intel_usage_model
  ON public.intelligence_usage(model);
