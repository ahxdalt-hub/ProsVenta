-- ============================================================================
-- Prosventa Enrichment Foundation
-- Feature 2: Enrichment - Phase 1 of 4
-- ============================================================================
-- Purely additive preparation of the EXISTING enrichment architecture. No new
-- tables, no destructive changes:
--
--   1. Enrichment record statuses (prospect_enrichments / company_enrichments)
--      gain 'queued' and 'partial' so the UI can represent every state of the
--      controlled enrichment state model:
--        not_enriched('none') -> queued -> processing -> completed | partial | failed
--
--   2. intelligence_jobs gains traceability + idempotency metadata:
--        idempotency_key   : dedupes repeated enrichment requests (unique)
--        error_category    : structured failure classification
--        fields_requested  : what the caller asked to enrich
--        fields_returned   : what the provider actually returned
--        duration_ms       : observed execution time
--
--   3. provider_usage_log.operation widens beyond 'lead_search' so enrichment
--      usage becomes measurable for the future credit engine (no charging yet).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enrichment record status models (additive only)
-- ----------------------------------------------------------------------------
ALTER TABLE public.prospect_enrichments
  DROP CONSTRAINT IF EXISTS prospect_enrichments_status_check;

ALTER TABLE public.prospect_enrichments
  ADD CONSTRAINT prospect_enrichments_status_check
  CHECK (status IN ('none', 'queued', 'processing', 'completed', 'partial', 'failed'));

ALTER TABLE public.company_enrichments
  DROP CONSTRAINT IF EXISTS company_enrichments_status_check;

ALTER TABLE public.company_enrichments
  ADD CONSTRAINT company_enrichments_status_check
  CHECK (status IN ('none', 'queued', 'processing', 'completed', 'partial', 'failed'));

-- ----------------------------------------------------------------------------
-- 2. Intelligence job traceability + idempotency
-- ----------------------------------------------------------------------------
ALTER TABLE public.intelligence_jobs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- One in-flight logical operation per key. Partial so legacy rows stay valid.
CREATE UNIQUE INDEX IF NOT EXISTS idx_intel_jobs_idempotency_key
  ON public.intelligence_jobs(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.intelligence_jobs
  ADD COLUMN IF NOT EXISTS error_category TEXT;

ALTER TABLE public.intelligence_jobs
  ADD COLUMN IF NOT EXISTS fields_requested JSONB;

ALTER TABLE public.intelligence_jobs
  ADD COLUMN IF NOT EXISTS fields_returned JSONB;

ALTER TABLE public.intelligence_jobs
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER
  CHECK (duration_ms IS NULL OR duration_ms >= 0);

-- ----------------------------------------------------------------------------
-- 3. Provider usage log: measurable enrichment operations (credits prep)
-- ----------------------------------------------------------------------------
ALTER TABLE public.provider_usage_log
  DROP CONSTRAINT IF EXISTS provider_usage_log_operation_check;

ALTER TABLE public.provider_usage_log
  ADD CONSTRAINT provider_usage_log_operation_check
  CHECK (operation IN (
    'lead_search',
    'company_enrichment',
    'prospect_enrichment',
    'company_research',
    'prospect_research',
    'ai_scoring'
  ));

CREATE INDEX IF NOT EXISTS idx_provider_usage_log_operation
  ON public.provider_usage_log(operation);