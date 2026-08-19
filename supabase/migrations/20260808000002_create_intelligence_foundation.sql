-- ============================================================================
-- Prosventa Sales Intelligence Foundation
-- Stage 4 — Phase 1: Intelligence Foundation
-- ============================================================================
-- Creates the technical foundation for the Sales Intelligence system:
--   - intelligence_records: traceable enrichment/research data per prospect
--   - intelligence_jobs: enrichment job state machine
--   - intelligence_usage: usage tracking foundation for future plan limits
-- No external providers are connected yet. This is the schema foundation only.
-- ============================================================================

-- ============================================================================
-- 1. INTELLIGENCE RECORDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.intelligence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (
    record_type IN ('company_enrichment', 'prospect_enrichment', 'company_research', 'prospect_research', 'signals')
  ),
  provider TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  data JSONB NOT NULL DEFAULT '{}',
  raw JSONB,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_prospect_record UNIQUE (prospect_id, record_type, provider, source)
);

ALTER TABLE public.intelligence_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view intelligence records in their org" ON public.intelligence_records;
DROP POLICY IF EXISTS "Members can create intelligence records" ON public.intelligence_records;
DROP POLICY IF EXISTS "Members can update intelligence records" ON public.intelligence_records;
DROP POLICY IF EXISTS "Members can delete intelligence records" ON public.intelligence_records;

CREATE POLICY "Members can view intelligence records in their org"
  ON public.intelligence_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_records.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create intelligence records"
  ON public.intelligence_records FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_records.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can update intelligence records"
  ON public.intelligence_records FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_records.organization_id
    AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_records.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete intelligence records"
  ON public.intelligence_records FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_records.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_intel_records_org_id ON public.intelligence_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_intel_records_prospect_id ON public.intelligence_records(prospect_id);
CREATE INDEX IF NOT EXISTS idx_intel_records_type ON public.intelligence_records(record_type);
CREATE INDEX IF NOT EXISTS idx_intel_records_provider ON public.intelligence_records(provider);
CREATE INDEX IF NOT EXISTS idx_intel_records_retrieved_at ON public.intelligence_records(retrieved_at);
CREATE INDEX IF NOT EXISTS idx_intel_records_prospect_type ON public.intelligence_records(prospect_id, record_type);

-- ============================================================================
-- 2. INTELLIGENCE JOBS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.intelligence_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (
    job_type IN ('company_enrichment', 'prospect_enrichment', 'company_research', 'prospect_research', 'signals')
  ),
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  ),
  error_code TEXT,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.intelligence_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view intelligence jobs in their org" ON public.intelligence_jobs;
DROP POLICY IF EXISTS "Members can create intelligence jobs" ON public.intelligence_jobs;
DROP POLICY IF EXISTS "Members can update intelligence jobs" ON public.intelligence_jobs;
DROP POLICY IF EXISTS "Members can delete intelligence jobs" ON public.intelligence_jobs;

CREATE POLICY "Members can view intelligence jobs in their org"
  ON public.intelligence_jobs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_jobs.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create intelligence jobs"
  ON public.intelligence_jobs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_jobs.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can update intelligence jobs"
  ON public.intelligence_jobs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_jobs.organization_id
    AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_jobs.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete intelligence jobs"
  ON public.intelligence_jobs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_jobs.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_intel_jobs_org_id ON public.intelligence_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_intel_jobs_prospect_id ON public.intelligence_jobs(prospect_id);
CREATE INDEX IF NOT EXISTS idx_intel_jobs_status ON public.intelligence_jobs(status);
CREATE INDEX IF NOT EXISTS idx_intel_jobs_type ON public.intelligence_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_intel_jobs_provider ON public.intelligence_jobs(provider);
CREATE INDEX IF NOT EXISTS idx_intel_jobs_created_at ON public.intelligence_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_intel_jobs_status_created ON public.intelligence_jobs(status, created_at);

-- ============================================================================
-- 3. INTELLIGENCE USAGE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.intelligence_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (
    operation IN ('company_enrichment', 'prospect_enrichment', 'company_research', 'prospect_research', 'signals')
  ),
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (
    status IN ('pending', 'completed', 'failed')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.intelligence_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view intelligence usage in their org" ON public.intelligence_usage;
DROP POLICY IF EXISTS "Members can create intelligence usage" ON public.intelligence_usage;

CREATE POLICY "Members can view intelligence usage in their org"
  ON public.intelligence_usage FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_usage.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create intelligence usage"
  ON public.intelligence_usage FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = intelligence_usage.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_intel_usage_org_id ON public.intelligence_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_intel_usage_user_id ON public.intelligence_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_intel_usage_operation ON public.intelligence_usage(operation);
CREATE INDEX IF NOT EXISTS idx_intel_usage_provider ON public.intelligence_usage(provider);
CREATE INDEX IF NOT EXISTS idx_intel_usage_created_at ON public.intelligence_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_intel_usage_org_created ON public.intelligence_usage(organization_id, created_at);

-- ============================================================================
-- 4. UPDATED_AT CONVENTION
-- ============================================================================
-- Note: updated_at columns are managed by the application layer, matching
-- the existing codebase convention (see automation migration).
-- No database triggers are used for updated_at.