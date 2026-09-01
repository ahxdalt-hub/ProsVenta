-- ============================================================================
-- Prosventa Plans, Limits + Organization Billing
-- Stage 8 — Phase 3: Plan & Entitlement Foundation
-- ============================================================================
-- Creates the centralized plan catalog, entitlement/limit definitions, the
-- authoritative organization plan assignment (billing profile), and the
-- idempotent monthly credit allocation bridge into the Phase 1 CreditService.
--
-- Model:
--   plans (catalog, lifecycle: active | inactive | deprecated)
--     └── plan_entitlements (limits + feature flags per plan)
--           └── organization_subscriptions (org → current plan, billing status,
--                 billing period, provider placeholders)
--                 └── subscription_history (append-only transitions)
--
-- Design rules honored:
--   - Plan keys are stable identifiers; names/pricing are display metadata.
--   - No payment provider, checkout, invoices or final commercial pricing.
--   - Unlimited is an explicit limit_type — never a magic number.
--   - Recurring credits flow ONLY through grant_plan_allocation() which writes
--     to the Phase 1 wallet/ledger via the same accounting path as every other
--     credit mutation. Wallet balances are never touched directly.
--   - Allocation idempotency: one ledger entry per (org, period) via the
--     ledger's unique idempotency_key index.
--   - Downgrades never delete data; over-limit organizations simply cannot
--     create/import more until compliant.
--   - RLS: organization members read their own org's billing rows; there are
--     NO client-side INSERT/UPDATE/DELETE policies anywhere in this migration.
-- ============================================================================

-- ============================================================================
-- 1. PLAN CATALOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plans (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
  display_order INTEGER NOT NULL DEFAULT 0,
  -- Display/marketing metadata. Commercial pricing may live here LATER but is
  -- intentionally NOT seeded in this phase.
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.plans IS
  'Centralized plan catalog. Keys are stable API identifiers; deactivate/deprecate rather than delete plans that have organizations attached.';

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view plan catalog" ON public.plans;
CREATE POLICY "Authenticated users can view plan catalog"
  ON public.plans FOR SELECT
  USING (auth.role() = 'authenticated');
-- No client-side write policies: plan administration happens via SQL/service role.

CREATE INDEX IF NOT EXISTS idx_plans_display_order ON public.plans(display_order);

-- ============================================================================
-- 2. PLAN ENTITLEMENTS (central limits + feature access)
-- ============================================================================
-- limit_type:
--   integer   → value holds a finite whole-number cap.
--   boolean   → value interpreted as enabled (1) / disabled (0).
--   unlimited → no cap; value MUST be stored as 0 and is ignored by checks.
-- reset_period:
--   never     → lifetime/cumulative limit (e.g. max prospects).
--   monthly   → resets each billing period (e.g. monthly_credit_allowance).
--   daily     → reserved for future use; nothing resets daily today.
CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT NOT NULL REFERENCES public.plans(key) ON DELETE CASCADE,
  key TEXT NOT NULL,
  limit_type TEXT NOT NULL DEFAULT 'integer' CHECK (limit_type IN ('integer', 'boolean', 'unlimited')),
  value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0),
  reset_period TEXT NOT NULL DEFAULT 'never' CHECK (reset_period IN ('never', 'monthly', 'daily')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_plan_entitlement UNIQUE (plan_key, key),
  CONSTRAINT unlimited_value_ignored CHECK (
    limit_type <> 'unlimited' OR value = 0
  )
);

COMMENT ON TABLE public.plan_entitlements IS
  'Centralized per-plan entitlements. Stable keys (e.g. max_prospects, monthly_credit_allowance, research_access). Product code reads these — it never hardcodes plan comparisons.';

ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view plan entitlements" ON public.plan_entitlements;
CREATE POLICY "Authenticated users can view plan entitlements"
  ON public.plan_entitlements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_plan_entitlements_key ON public.plan_entitlements(key);
CREATE INDEX IF NOT EXISTS idx_plan_entitlements_plan ON public.plan_entitlements(plan_key);


-- ============================================================================
-- 3. ORGANIZATION SUBSCRIPTIONS (authoritative plan + billing profile)
-- ============================================================================
-- One row per organization. billing_status lifecycle (documented):
--   active    → organization is on its plan in good standing.
--   trialing  → evaluation period before paid activation (Phase 4+).
--   past_due  → payment problem; service continues briefly (Phase 4+).
--   cancelled → organization ended its subscription; typically reverts to free.
--   suspended → administrative suspension; product access may be restricted.
CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL REFERENCES public.plans(key),
  billing_status TEXT NOT NULL DEFAULT 'active'
    CHECK (billing_status IN ('active', 'trialing', 'past_due', 'cancelled', 'suspended')),
  billing_interval TEXT CHECK (billing_interval IN ('monthly', 'yearly')),
  -- Current billing period for recurring allowances/usage windows.
  period_start DATE,
  period_end DATE,
  CONSTRAINT valid_billing_period CHECK (
    period_start IS NULL OR period_end IS NULL OR period_start < period_end
  ),
  -- Payment-provider placeholders (Phase 4). NEVER store card/payment data.
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  -- Set when usage exceeds the current plan's limits after a downgrade.
  -- Creation/import is blocked until compliant; existing data stays intact.
  limit_exceeded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.organization_subscriptions.limit_exceeded IS
  'Set by assignOrganizationPlan when current usage exceeds the new plan limits. Blocks further creation until usage is within limits; NEVER triggers data deletion.';

ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their org subscription" ON public.organization_subscriptions;
CREATE POLICY "Members can view their org subscription"
  ON public.organization_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_subscriptions.organization_id
      AND om.user_id = auth.uid()
  ));
-- NO client-side mutation policies: plan assignment is server/administrative only.

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_plan ON public.organization_subscriptions(plan_key);

-- ============================================================================
-- 4. SUBSCRIPTION HISTORY (append-only; supports grandfathering/audits)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_plan_key TEXT REFERENCES public.plans(key),
  to_plan_key TEXT NOT NULL REFERENCES public.plans(key),
  reason TEXT NOT NULL DEFAULT '',
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT history_transition_differs CHECK (
    from_plan_key IS NULL OR from_plan_key <> to_plan_key
  )
);

COMMENT ON TABLE public.subscription_history IS
  'Append-only record of every plan transition ("what plan did this org have, when?"). Never overwritten.';

ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their org subscription history" ON public.subscription_history;
CREATE POLICY "Members can view their org subscription history"
  ON public.subscription_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = subscription_history.organization_id
      AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_subscription_history_org_created
  ON public.subscription_history(organization_id, created_at DESC);

-- Append-only guarantee: history is never rewritten.
CREATE OR REPLACE FUNCTION public.prevent_subscription_history_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'subscription history is append-only: % is not permitted', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS subscription_history_immutable ON public.subscription_history;
CREATE TRIGGER subscription_history_immutable
  BEFORE UPDATE OR DELETE ON public.subscription_history
  FOR EACH ROW EXECUTE FUNCTION public.prevent_subscription_history_mutation();

