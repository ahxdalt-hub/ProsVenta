-- ============================================================================
-- Prosventa External Business Signals
-- Stage 6 — Phase 5: External Business Signal Engine
-- ============================================================================
-- EXTENDS the existing signals table (Stage 4 — Phase 7). This does NOT
-- create a second signal system. It adds what is needed to distinguish and
-- ground EXTERNAL business signals:
--
--   signal_origin      → 'internal' (Prosventa activity) vs 'external'
--                        (real-world event reported by a provider)
--   provider           → which signal-capable provider produced the signal
--   provider_signal_id → the provider's own event id (provenance + dedup)
--   company_key        → normalized company domain so ONE company-level
--                        signal can be associated with MANY prospects
--                        without duplicating the underlying signal
--   published_at       → when the source published/reported the event
--                        (may differ from when Prosventa retrieved it)
--
-- Status values are extended so signals are never marked "verified" unless
-- verification actually happened:
--   detected / unverified / verified / active / dismissed / archived / expired
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. New columns
-- ----------------------------------------------------------------------------
ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS signal_origin TEXT NOT NULL DEFAULT 'internal';

ALTER TABLE public.signals
  ADD CONSTRAINT signals_signal_origin_check
  CHECK (signal_origin IN ('internal', 'external'));

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS provider TEXT;

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS provider_signal_id TEXT;

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS company_key TEXT;

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- ----------------------------------------------------------------------------
-- 2. Extended status values
-- ----------------------------------------------------------------------------
ALTER TABLE public.signals DROP CONSTRAINT IF EXISTS signals_status_check;

ALTER TABLE public.signals
  ADD CONSTRAINT signals_status_check
  CHECK (status IN (
    'active',
    'detected',
    'unverified',
    'verified',
    'expired',
    'dismissed',
    'archived'
  ));

-- ----------------------------------------------------------------------------
-- 3. Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_signals_signal_origin ON public.signals(signal_origin);
CREATE INDEX IF NOT EXISTS idx_signals_provider ON public.signals(provider);
CREATE INDEX IF NOT EXISTS idx_signals_company_key ON public.signals(organization_id, company_key);
CREATE INDEX IF NOT EXISTS idx_signals_org_published ON public.signals(organization_id, published_at DESC);

-- Provenance uniqueness: the same provider event must never be stored twice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_signals_provider_event
  ON public.signals(organization_id, provider, provider_signal_id)
  WHERE provider IS NOT NULL AND provider_signal_id IS NOT NULL;