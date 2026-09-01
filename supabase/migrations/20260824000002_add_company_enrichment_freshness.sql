-- ============================================================================
-- Prosventa Company Enrichment Freshness / Provenance Timestamps
-- Stage 6 - Phase 2: Real Company Enrichment Engine
-- ============================================================================
-- Extends the EXISTING public.company_enrichments table (no new tables):
--
--   first_retrieved_at : when this prospect/domain was FIRST enriched from a
--                        provider. Provenance anchor — never changes on refresh.
--   last_retrieved_at  : when the stored data was last refreshed.
--
-- Together with `provider`, these let the system distinguish original
-- retrieval from refreshes and drive the Phase 1 freshness architecture.
-- ============================================================================

ALTER TABLE public.company_enrichments
  ADD COLUMN IF NOT EXISTS first_retrieved_at TIMESTAMPTZ;

ALTER TABLE public.company_enrichments
  ADD COLUMN IF NOT EXISTS last_retrieved_at TIMESTAMPTZ;

-- Backfill existing rows so no legacy record has missing provenance.
UPDATE public.company_enrichments
SET first_retrieved_at = COALESCE(enriched_at, created_at),
    last_retrieved_at  = COALESCE(enriched_at, updated_at, created_at)
WHERE first_retrieved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_company_enrich_last_retrieved
  ON public.company_enrichments(last_retrieved_at);