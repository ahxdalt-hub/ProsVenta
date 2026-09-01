-- ============================================================================
-- Prosventa Signals — Feature 3: Phase 1 Evidence Model
-- ============================================================================
-- Normalized evidence model that answers "Why did Prosventa show me this
-- signal?" without storing enormous raw provider payloads. Evidence is
-- org-scoped so users can never access another organization's evidence.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.signal_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  evidence_type TEXT NOT NULL DEFAULT 'provider_record' CHECK (
    evidence_type IN ('provider_record', 'article', 'event', 'identity', 'metadata', 'other')
  ),
  source_name TEXT,
  source_url TEXT,
  source_record_id TEXT,
  occurred_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Normalized, non-secret provenance subset of the provider payload.
  normalized_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dedupe_key TEXT NOT NULL,
  CONSTRAINT uq_signal_evidence_signal_dedupe UNIQUE (signal_id, dedupe_key)
);

-- ----------------------------------------------------------------------------
-- Row level security — org isolation for evidence
-- ----------------------------------------------------------------------------
ALTER TABLE public.signal_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view evidence in their org" ON public.signal_evidence;
DROP POLICY IF EXISTS "Members can create evidence" ON public.signal_evidence;
DROP POLICY IF EXISTS "Members can update evidence in their org" ON public.signal_evidence;
DROP POLICY IF EXISTS "Members can delete evidence in their org" ON public.signal_evidence;

CREATE POLICY "Members can view evidence in their org"
  ON public.signal_evidence FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = signal_evidence.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create evidence"
  ON public.signal_evidence FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = signal_evidence.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can update evidence in their org"
  ON public.signal_evidence FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = signal_evidence.organization_id
    AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = signal_evidence.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete evidence in their org"
  ON public.signal_evidence FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = signal_evidence.organization_id
    AND om.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- Indexes justified by actual query patterns
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_signal_evidence_signal_id ON public.signal_evidence(signal_id);
CREATE INDEX IF NOT EXISTS idx_signal_evidence_org ON public.signal_evidence(organization_id);
CREATE INDEX IF NOT EXISTS idx_signal_evidence_source_record_id
  ON public.signal_evidence(source_record_id);
CREATE INDEX IF NOT EXISTS idx_signal_evidence_occurred_at ON public.signal_evidence(occurred_at);