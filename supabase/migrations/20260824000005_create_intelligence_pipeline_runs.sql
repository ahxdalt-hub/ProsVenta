-- ============================================================================
-- Prosventa Intelligence Orchestration — Stage 6 - Phase 6 (Final Phase)
-- ============================================================================
-- Pipeline run records reuse the EXISTING intelligence_jobs table — no new
-- tables, no parallel execution schema.
--
-- Changes:
--   1. metadata JSONB column: operation-level results, trigger, priority and
--      final pipeline state. Never stores provider credentials.
--   2. job_type CHECK extended with 'intelligence_pipeline' so orchestration
--      runs are identifiable as first-class executions (future metering).
--   3. Partial index for cheap active-run lookups (idempotency/concurrency).
-- RLS policies are unchanged — intelligence_jobs is already org-scoped.
-- ============================================================================

-- 1. Metadata for operation-level pipeline state
ALTER TABLE public.intelligence_jobs
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

-- 2. Allow the orchestration pipeline job type (replaces the inline CHECK)
ALTER TABLE public.intelligence_jobs
  DROP CONSTRAINT IF EXISTS intelligence_jobs_job_type_check;

ALTER TABLE public.intelligence_jobs
  ADD CONSTRAINT intelligence_jobs_job_type_check CHECK (
    job_type IN (
      'company_enrichment',
      'prospect_enrichment',
      'company_research',
      'prospect_research',
      'signals',
      'intelligence_pipeline'
    )
  );

-- 3. Active pipeline run lookup (duplicate prevention + concurrency control)
CREATE INDEX IF NOT EXISTS idx_intel_jobs_pipeline_active
  ON public.intelligence_jobs(prospect_id, status)
  WHERE provider = 'intelligence-pipeline';
