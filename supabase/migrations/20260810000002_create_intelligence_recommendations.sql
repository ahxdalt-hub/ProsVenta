-- ============================================================================
-- Prosventa Intelligence Recommendations
-- Stage 4 — Phase 8: Intelligence Recommendations
-- ============================================================================
-- Creates the recommendation table for producing useful, explainable
-- recommendations for the salesperson based on existing intelligence.
--
-- IMPORTANT:
--  - Recommendations are NOT autonomous sales automation.
--  - They only recommend actions for the salesperson to consider.
--  - Every recommendation must have a reason (evidence-based).
--  - The user controls recommendation status (New/Reviewed/Dismissed/Completed).
--  - Deduplication prevents identical recommendations from accumulating.
-- ============================================================================

-- ============================================================================
-- 1. RECOMMENDATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  -- Recommendation type (research, review, sales_prep, data_quality, follow_up)
  recommendation_type TEXT NOT NULL CHECK (
    recommendation_type IN (
      'research_company',
      'research_prospect',
      'refresh_intelligence',
      'review_high_fit',
      'review_company_signal',
      'review_leadership_change',
      'review_company_context',
      'review_prospect_role',
      'investigate_business_need',
      'verify_company_info',
      'verify_prospect_info',
      'complete_icp_data',
      'review_recent_signal',
      'follow_up_company_event'
    )
  ),
  -- Human-readable title (e.g. "Review Acme's recent leadership change")
  title TEXT NOT NULL,
  -- Concise summary of what the salesperson may consider doing
  summary TEXT NOT NULL,
  -- Why Prosventa recommends this (evidence-based reasoning)
  reasoning TEXT NOT NULL,
  -- Structured evidence (JSONB array of evidence items)
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Priority: High/Medium/Low (attention priority, NOT purchase certainty)
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  -- Confidence: 0-100 (evidence strength, not scientific precision)
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  -- Status: New/Reviewed/Dismissed/Completed (user-controlled)
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'dismissed', 'completed')),
  -- Source signal IDs (JSONB array of signal UUIDs)
  source_signal_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Source research IDs (JSONB array of research record UUIDs)
  source_research_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Source score ID (UUID of the prospect_score used as evidence)
  source_score_id UUID REFERENCES public.prospect_scores(id) ON DELETE SET NULL,
  -- Stable deduplication key: (prospect, type, source intelligence)
  dedupe_key TEXT NOT NULL,
  -- When the underlying intelligence was last refreshed (for freshness)
  intelligence_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_recommendation_dedupe UNIQUE (organization_id, dedupe_key)
);

-- ============================================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view recommendations in their org" ON public.recommendations;
DROP POLICY IF EXISTS "Members can create recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Members can update recommendations in their org" ON public.recommendations;
DROP POLICY IF EXISTS "Members can delete recommendations in their org" ON public.recommendations;

CREATE POLICY "Members can view recommendations in their org"
  ON public.recommendations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = recommendations.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create recommendations"
  ON public.recommendations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = recommendations.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can update recommendations in their org"
  ON public.recommendations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = recommendations.organization_id
    AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = recommendations.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete recommendations in their org"
  ON public.recommendations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = recommendations.organization_id
    AND om.user_id = auth.uid()
  ));

-- ============================================================================
-- 3. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_recommendations_org_id ON public.recommendations(organization_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_prospect_id ON public.recommendations(prospect_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON public.recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON public.recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON public.recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON public.recommendations(created_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_org_created ON public.recommendations(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_prospect_created ON public.recommendations(prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_org_priority ON public.recommendations(organization_id, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_org_status ON public.recommendations(organization_id, status, created_at DESC);

-- ============================================================================
-- 4. UPDATED_AT CONVENTION
-- ============================================================================
-- updated_at is managed by the application layer, matching the existing
-- codebase convention. No database triggers are used for updated_at.