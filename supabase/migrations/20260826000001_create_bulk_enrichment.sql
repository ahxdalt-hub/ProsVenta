-- ============================================================================
-- Prosventa Enrichment — Bulk Enrichment Operations & Jobs
-- Feature 2: Enrichment - Phase 3 of 4
-- ============================================================================
-- Server-side bulk enrichment with central-credit integration:
--
--   bulk_enrichment_operations : ONE user-initiated bulk request (the batch)
--   bulk_enrichment_jobs       : ONE row per prospect per operation
--
-- Guarantees:
--   - Idempotency: an organization has at most ONE active bulk operation
--     (partial unique index). Double-clicks / refreshes attach to or are
--     rejected by the existing operation — never duplicated provider work.
--   - Duplicate prevention: UNIQUE (operation_id, prospect_id).
--   - Credit traceability: reserved / used / released credits recorded at
--     operation AND job level, referencing the central ledger via
--     reference_type='enrichment'.
--   - Security: RLS grants members SELECT ONLY. There are deliberately NO
--     client INSERT/UPDATE/DELETE policies — all writes happen inside
--     trusted-server code using the service-role client, so a browser can
--     never mark a job completed or move credits.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. BULK OPERATIONS (the batch)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bulk_enrichment_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'processing', 'completed', 'partial', 'failed', 'cancelled')
  ),
  total_prospects INTEGER NOT NULL DEFAULT 0 CHECK (total_prospects >= 0),
  enriched_count INTEGER NOT NULL DEFAULT 0 CHECK (enriched_count >= 0),
  partial_count INTEGER NOT NULL DEFAULT 0 CHECK (partial_count >= 0),
  skipped_count INTEGER NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  cancelled_count INTEGER NOT NULL DEFAULT 0 CHECK (cancelled_count >= 0),
  -- Central-credit accounting (mirrors the wallet ledger movements)
  reserved_credits INTEGER NOT NULL DEFAULT 0 CHECK (reserved_credits >= 0),
  used_credits INTEGER NOT NULL DEFAULT 0 CHECK (used_credits >= 0),
  released_credits INTEGER NOT NULL DEFAULT 0 CHECK (released_credits >= 0),
  -- Deterministic key of (org, user, sorted prospect ids): double-click /
  -- duplicate-request protection at the operation level.
  idempotency_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bulk_enrichment_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view bulk enrichment operations in their org"
  ON public.bulk_enrichment_operations;
CREATE POLICY "Members can view bulk enrichment operations in their org"
  ON public.bulk_enrichment_operations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = bulk_enrichment_operations.organization_id
    AND om.user_id = auth.uid()
  ));

-- At most ONE active bulk operation per organization (hard server-side guard;
-- application code checks first for a friendly attach/reject response).
CREATE UNIQUE INDEX IF NOT EXISTS idx_bulk_ops_org_active
  ON public.bulk_enrichment_operations(organization_id)
  WHERE status IN ('queued', 'processing');

CREATE UNIQUE INDEX IF NOT EXISTS idx_bulk_ops_org_idempotency
  ON public.bulk_enrichment_operations(organization_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_bulk_ops_org_created
  ON public.bulk_enrichment_operations(organization_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. BULK JOBS (one prospect within one operation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bulk_enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES public.bulk_enrichment_operations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'processing', 'completed', 'partial', 'skipped', 'failed', 'cancelled')
  ),
  skip_reason TEXT CHECK (skip_reason IN ('already_processing', 'recently_enriched')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 2 CHECK (max_attempts >= 1),
  error_category TEXT,
  error_message TEXT,
  -- Per-job credit share of the operation reservation (whole credits)
  reserved_credits INTEGER NOT NULL DEFAULT 0 CHECK (reserved_credits >= 0),
  used_credits INTEGER NOT NULL DEFAULT 0 CHECK (used_credits >= 0),
  usage_record_id UUID,
  provider_request_id TEXT,
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bulk_enrichment_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view bulk enrichment jobs in their org"
  ON public.bulk_enrichment_jobs;
CREATE POLICY "Members can view bulk enrichment jobs in their org"
  ON public.bulk_enrichment_jobs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = bulk_enrichment_jobs.organization_id
    AND om.user_id = auth.uid()
  ));

-- A prospect appears at most once per operation.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bulk_jobs_operation_prospect
  ON public.bulk_enrichment_jobs(operation_id, prospect_id);

CREATE INDEX IF NOT EXISTS idx_bulk_jobs_operation_status
  ON public.bulk_enrichment_jobs(operation_id, status);

CREATE INDEX IF NOT EXISTS idx_bulk_jobs_org_prospect
  ON public.bulk_enrichment_jobs(organization_id, prospect_id);

