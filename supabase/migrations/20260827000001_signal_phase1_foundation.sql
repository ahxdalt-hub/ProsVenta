-- ============================================================================
-- Prosventa Signals — Feature 3: Phase 1 Foundation (columns + lifecycle)
-- ============================================================================
-- Builds on the existing signals table (Stage 4 — Phase 7 + Stage 6 — Phase 5).
-- Adds the normative Phase-1 fields of the Signal data model. This migration
-- is additive and does NOT weaken existing RLS.
--
--   * summary            → short human summary (distinct from title/desc)
--   * occurred_at        → when the event ACTUALLY happened (never invented;
--                          distinct from detected_at and created_at)
--   * expires_at         → optional expiry ceiling for time-sensitive signals
--   * source_record_id   → the source's own stable record id (provenance+dedup)
--
-- Lifecycle is extended with 'verifying': detected → verifying → verified.
-- A detected event may require validation before it is treated as strong
-- evidence.
--
-- Company association remains signals.company_key (normalized domain). A stable
-- company_id is deferred to Phase 2 when providers return stable company
-- identities.
-- ============================================================================

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS summary TEXT;

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS source_record_id TEXT;

-- Lifecycle: add 'verifying' (detected → verifying → verified)
ALTER TABLE public.signals DROP CONSTRAINT IF EXISTS signals_status_check;

ALTER TABLE public.signals
  ADD CONSTRAINT signals_status_check
  CHECK (status IN (
    'active',
    'detected',
    'unverified',
    'verifying',
    'verified',
    'expired',
    'dismissed',
    'archived'
  ));

-- Indexes justified by actual query patterns from the signal query service
CREATE INDEX IF NOT EXISTS idx_signals_occurred_at ON public.signals(occurred_at);
CREATE INDEX IF NOT EXISTS idx_signals_source_record_id ON public.signals(source_record_id);
CREATE INDEX IF NOT EXISTS idx_signals_org_status_occurred
  ON public.signals(organization_id, status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_org_type_status
  ON public.signals(organization_id, signal_type, status);
CREATE INDEX IF NOT EXISTS idx_signals_org_prospect_status
  ON public.signals(organization_id, prospect_id, status);