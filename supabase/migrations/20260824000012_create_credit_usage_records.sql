-- ============================================================================
-- Prosventa Credits — Usage Records
-- Stage 8 — Phase 2: Credit Consumption + Usage Tracking
-- ============================================================================
-- Adds credit_usage_records: the PRODUCT-side consumption record.
--
--   Ledger (credit_transactions) answers: "How did credits move?"
--   Usage  (credit_usage_records) answers: "What did the customer use
--          Prosventa for?"
--
-- Every successful billable operation is traceable end-to-end:
--   usage record → ledger transaction (ledger_transaction_id) → wallet.
-- The ledger reference_id also stores the usage id.
--
-- Status lifecycle (enforced in app layer + CHECK below):
--   pending → completed | failed | cancelled
--   failed  → refunded
--
-- RLS: organization members may READ their own org's usage only. There are NO
-- client mutation policies — all writes go through server-authorized services.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.credit_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  operation_key TEXT NOT NULL,
  category TEXT NOT NULL,
  credit_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  company_domain TEXT,
  reference_id TEXT NOT NULL,
  execution_id TEXT,
  provider TEXT,
  ledger_transaction_id UUID REFERENCES public.credit_transactions(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT credit_usage_records_operation_check CHECK (operation_key IN (
    'company_enrichment',
    'prospect_enrichment',
    'company_research',
    'prospect_research',
    'signal_refresh',
    'automation_execution'
  )),
  CONSTRAINT credit_usage_records_category_check CHECK (category IN (
    'enrichment', 'research', 'signals', 'automation', 'other'
  )),
  -- Zero allowed: a failed/cancelled operation consumed nothing but is still
  -- recorded for support/debugging. Completed rows are always positive.
  CONSTRAINT credit_usage_records_amount_check CHECK (
    credit_amount >= 0 AND credit_amount <= 1000000
  ),
  CONSTRAINT credit_usage_records_status_check CHECK (status IN (
    'pending', 'completed', 'failed', 'refunded', 'cancelled'
  )),
  -- Completed usage must point at its ledger transaction and be non-zero.
  CONSTRAINT credit_usage_records_ledger_link_check CHECK (
    status <> 'completed' OR ledger_transaction_id IS NOT NULL
  ),
  CONSTRAINT credit_usage_records_completed_amount_check CHECK (
    status <> 'completed' OR credit_amount > 0
  )
);

-- ============================================================================
-- Indexes (based on actual query patterns: org history, filters, attribution)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_credit_usage_org_created
  ON public.credit_usage_records(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_usage_org_operation
  ON public.credit_usage_records(organization_id, operation_key);
CREATE INDEX IF NOT EXISTS idx_credit_usage_org_status
  ON public.credit_usage_records(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_credit_usage_prospect
  ON public.credit_usage_records(prospect_id) WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_usage_reference
  ON public.credit_usage_records(reference_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_actor
  ON public.credit_usage_records(actor_id) WHERE actor_id IS NOT NULL;

-- ============================================================================
-- Aggregation RPC — powers "used today / this week / this month / by
-- operation / by category". SECURITY DEFINER because it is only invoked from
-- authorized server services (UsageService), never directly by clients.
-- Returns a JSONB summary.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.aggregate_credit_usage(
  p_org_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_from TIMESTAMPTZ := COALESCE(p_from, '-infinity'::timestamptz);
  v_to TIMESTAMPTZ := COALESCE(p_to, 'infinity'::timestamptz);
  v_total BIGINT;
  v_count BIGINT;
  v_by_category JSONB;
  v_by_operation JSONB;
  v_failed_credits BIGINT;
BEGIN
  SELECT COALESCE(SUM(credit_amount), 0), COUNT(*)
  INTO v_total, v_count
  FROM public.credit_usage_records
  WHERE organization_id = p_org_id
    AND status = 'completed'
    AND created_at >= v_from AND created_at <= v_to;

  SELECT COALESCE(jsonb_object_agg(category, credits), '{}'::jsonb)
  INTO v_by_category
  FROM (
    SELECT category, SUM(credit_amount) AS credits
    FROM public.credit_usage_records
    WHERE organization_id = p_org_id
      AND status = 'completed'
      AND created_at >= v_from AND created_at <= v_to
    GROUP BY category
  ) c;

  SELECT COALESCE(jsonb_object_agg(operation_key, credits), '{}'::jsonb)
  INTO v_by_operation
  FROM (
    SELECT operation_key, SUM(credit_amount) AS credits
    FROM public.credit_usage_records
    WHERE organization_id = p_org_id
      AND status = 'completed'
      AND created_at >= v_from AND created_at <= v_to
    GROUP BY operation_key
  ) o;

  -- Credits tied to failed/refunded usage — auditable, never part of the total.
  SELECT COALESCE(SUM(credit_amount), 0)
  INTO v_failed_credits
  FROM public.credit_usage_records
  WHERE organization_id = p_org_id
    AND status IN ('failed', 'refunded')
    AND created_at >= v_from AND created_at <= v_to;

  RETURN jsonb_build_object(
    'totalCredits', v_total,
    'usageCount', v_count,
    'byCategory', v_by_category,
    'byOperation', v_by_operation,
    'failedCredits', v_failed_credits
  );

-- ============================================================================
-- RLS — read-only for org members, nothing for anonymous clients
-- ============================================================================

END;
$$;

ALTER TABLE public.credit_usage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their org credit usage" ON public.credit_usage_records;
CREATE POLICY "Members can view their org credit usage"
  ON public.credit_usage_records
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );
