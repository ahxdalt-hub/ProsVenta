-- ============================================================================
-- Prosventa Buying & Intent Signals
-- Stage 4 — Phase 7: Buying & Intent Signals
-- ============================================================================
-- Creates the normalized signal table for detecting and displaying meaningful
-- business/professional events that MAY indicate increased sales relevance.
--
-- IMPORTANT: A signal is an OBSERVED EVENT with evidence — NOT proof that a
-- prospect wants to buy. Interpretation is stored separately and always uses
-- cautious language ("may indicate", "possible buying signal").
--
-- Categories are kept distinct:
--   external_event       → External Intelligence (third-party provider)
--   professional_change  → Professional Change (job/role/company change)
--   company_change       → Company Change (leadership, hiring, expansion)
--   website_intent       → Website Intent (first-party tracking — NOT enabled)
--   prosventa_activity   → Prosventa Activity (product usage, NOT buying intent)
-- ============================================================================

-- ============================================================================
-- 1. SIGNALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (
    signal_type IN (
      -- Company events
      'company_growth',
      'hiring_activity',
      'leadership_change',
      'company_expansion',
      'new_location',
      'product_announcement',
      'funding_event',
      -- Prospect events
      'job_change',
      'role_change',
      'company_change',
      'profile_update',
      -- Prosventa activity (product usage, NOT buying intent)
      'prospect_imported',
      'company_enriched',
      'prospect_researched',
      'score_changed',
      'prospect_saved'
    )
  ),
  category TEXT NOT NULL CHECK (
    category IN (
      'external_event',
      'professional_change',
      'company_change',
      'website_intent',
      'prosventa_activity'
    )
  ),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  -- Observable evidence supporting the signal (never speculation)
  evidence TEXT,
  -- Source/provider (e.g. "company-announcement", "prosventa-activity")
  source TEXT NOT NULL,
  -- Source URL when available (external signals only)
  source_url TEXT,
  -- When the event was detected/observed
  detected_at TIMESTAMPTZ NOT NULL,
  -- When the signal was retrieved/stored by Prosventa
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Evidence quality: high = direct first-party, medium = reliable third-party,
  -- low = weak/indirect evidence
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  -- Potential sales relevance (NOT certainty)
  importance TEXT NOT NULL CHECK (importance IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'archived')),
  -- Stable deduplication key: (prospect, signal_type, source, source_url, event_date)
  dedupe_key TEXT NOT NULL,
  -- Cautious interpretation of the observed event (separate from the fact)
  interpretation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_signal_dedupe UNIQUE (organization_id, dedupe_key)
);

-- ============================================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view signals in their org" ON public.signals;
DROP POLICY IF EXISTS "Members can create signals" ON public.signals;
DROP POLICY IF EXISTS "Members can update signals in their org" ON public.signals;
DROP POLICY IF EXISTS "Members can delete signals in their org" ON public.signals;

CREATE POLICY "Members can view signals in their org"
  ON public.signals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = signals.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create signals"
  ON public.signals FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = signals.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can update signals in their org"
  ON public.signals FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = signals.organization_id
    AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = signals.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete signals in their org"
  ON public.signals FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = signals.organization_id
    AND om.user_id = auth.uid()
  ));

-- ============================================================================
-- 3. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_signals_org_id ON public.signals(organization_id);
CREATE INDEX IF NOT EXISTS idx_signals_prospect_id ON public.signals(prospect_id);
CREATE INDEX IF NOT EXISTS idx_signals_detected_at ON public.signals(detected_at);
CREATE INDEX IF NOT EXISTS idx_signals_signal_type ON public.signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_importance ON public.signals(importance);
CREATE INDEX IF NOT EXISTS idx_signals_confidence ON public.signals(confidence);
CREATE INDEX IF NOT EXISTS idx_signals_status ON public.signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_org_detected ON public.signals(organization_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_prospect_detected ON public.signals(prospect_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_org_importance ON public.signals(organization_id, importance, detected_at DESC);

-- ============================================================================
-- 4. UPDATED_AT CONVENTION
-- ============================================================================
-- Note: updated_at columns are managed by the application layer, matching
-- the existing codebase convention (see intelligence foundation migration).
-- No database triggers are used for updated_at.