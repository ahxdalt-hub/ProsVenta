-- ============================================================================
-- Prosventa Person Enrichment Freshness / Provenance
-- Stage 6 - Phase 3: People & Decision-Maker Intelligence
-- ============================================================================
-- Extends the EXISTING public.prospect_enrichments table (no new tables):
--
--   first_retrieved_at : when this person was FIRST enriched from a provider.
--                        Provenance anchor — never changes on refresh.
--   last_retrieved_at  : when the stored data was last refreshed.
--   provider_person_id : the provider's own stable person identifier, when it
--                        legitimately returns one. Used for idempotent refresh
--                        and future cross-vendor identity resolution.
--   source             : distinguishes data origins:
--                          'provider'      — enriched from an external vendor
--                          'user'          — customer-entered (prospects table)
--                          'derived'       — Prosventa-derived intelligence
-- ============================================================================

ALTER TABLE public.prospect_enrichments
  ADD COLUMN IF NOT EXISTS first_retrieved_at TIMESTAMPTZ;

ALTER TABLE public.prospect_enrichments
  ADD COLUMN IF NOT EXISTS last_retrieved_at TIMESTAMPTZ;

ALTER TABLE public.prospect_enrichments
  ADD COLUMN IF NOT EXISTS provider_person_id TEXT;

ALTER TABLE public.prospect_enrichments
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'provider'
  CHECK (source IN ('provider', 'user', 'derived'));

-- Backfill existing rows so no legacy record has missing provenance.
UPDATE public.prospect_enrichments
SET first_retrieved_at = COALESCE(enriched_at, created_at),
    last_retrieved_at  = COALESCE(enriched_at, updated_at, created_at)
WHERE first_retrieved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_prospect_enrich_last_retrieved
  ON public.prospect_enrichments(last_retrieved_at);