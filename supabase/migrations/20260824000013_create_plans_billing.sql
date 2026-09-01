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

-- ============================================================================
-- 5. AUTO-PROVISION FREE SUBSCRIPTION ON ORGANIZATION CREATION
-- ============================================================================
-- Every organization always has an authoritative current plan (free default).
CREATE OR REPLACE FUNCTION public.ensure_org_subscription_on_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.organization_subscriptions (organization_id, plan_key)
  VALUES (NEW.id, 'free')
  ON CONFLICT (organization_id) DO NOTHING;

  INSERT INTO public.subscription_history (organization_id, from_plan_key, to_plan_key, reason)
  VALUES (NEW.id, NULL, 'free', 'organization_created');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_org_subscription_on_create_trigger ON public.organizations;
CREATE TRIGGER ensure_org_subscription_on_create_trigger
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.ensure_org_subscription_on_create();

-- Backfill any organizations created before this migration existed.
INSERT INTO public.organization_subscriptions (organization_id, plan_key)
SELECT o.id, 'free' FROM public.organizations o
ON CONFLICT (organization_id) DO NOTHING;

INSERT INTO public.subscription_history (organization_id, from_plan_key, to_plan_key, reason)
SELECT s.organization_id, NULL, 'free', 'backfill_initial_plan'
FROM public.organization_subscriptions s
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_history h WHERE h.organization_id = s.organization_id
);

-- ============================================================================
-- 6. IDEMPOTENT MONTHLY CREDIT ALLOCATION
-- ============================================================================
-- Bridges plan allowances into the Phase 1 credit architecture:
--   allocation → grant_credits() → ledger (source='plan_allocation') → wallet
-- Idempotency: the ledger entry idempotency key is
--   plan_allocation:{org}:{period}
-- so a retried allocation job returns status='duplicate' and grants nothing.
-- The period key is derived from the CURRENT billing period on the
-- subscription row (falls back to the calendar month when unset), so a retry
-- in a NEW period allocates the NEW period exactly once.
CREATE OR REPLACE FUNCTION public.grant_plan_allocation(
  p_org_id UUID,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_subscription public.organization_subscriptions;
  v_entitlement public.plan_entitlements;
  v_amount INTEGER;
  v_period_start DATE;
  v_period_end DATE;
  v_period_key TEXT;
  v_idempotency_key TEXT;
  v_result JSONB;
BEGIN
  SELECT * INTO v_subscription
  FROM public.organization_subscriptions
  WHERE organization_id = p_org_id
  FOR UPDATE;

  IF v_subscription.organization_id IS NULL THEN
    RETURN jsonb_build_object('status','no_subscription','amount',0,'period_key',NULL,'entry_id',NULL);
  END IF;

  IF v_subscription.billing_status IN ('cancelled', 'suspended') THEN
    RETURN jsonb_build_object('status','billing_inactive','amount',0,'period_key',NULL,'entry_id',NULL);
  END IF;

  -- Resolve the plan's recurring credit allowance (active plans only).
  SELECT pe.* INTO v_entitlement
  FROM public.plan_entitlements pe
  JOIN public.plans p ON p.key = pe.plan_key
  WHERE pe.plan_key = v_subscription.plan_key
    AND pe.key = 'monthly_credit_allowance'
    AND p.status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','no_allowance','amount',0,'period_key',NULL,'entry_id',NULL);
  END IF;

  IF v_entitlement.limit_type = 'unlimited' THEN
    RETURN jsonb_build_object('status','unlimited','amount',0,'period_key',NULL,'entry_id',NULL);
  END IF;

  v_amount := v_entitlement.value;
  IF v_amount <= 0 THEN
    RETURN jsonb_build_object('status','no_allowance','amount',0,'period_key',NULL,'entry_id',NULL);
  END IF;

  -- Current billing period (calendar-month fallback).
  v_period_start := COALESCE(v_subscription.period_start, date_trunc('month', NOW())::date);
  v_period_end := COALESCE(v_subscription.period_end, (date_trunc('month', NOW()) + interval '1 month - 1 day')::date);
  v_period_key := to_char(v_period_start, 'YYYY-MM');

  v_idempotency_key := 'plan_allocation:' || p_org_id::text || ':' || v_period_key;

  -- Route through the Phase 1 accounting system (ledger + wallet). This call
  -- is itself idempotent via the ledger's unique idempotency_key index.
  v_result := public.grant_credits(
    p_org_id,
    v_amount,
    'grant',
    'plan_allocation',
    p_actor_id,
    v_idempotency_key,
    'system',
    v_period_key,
    jsonb_build_object('plan_key', v_subscription.plan_key, 'period_key', v_period_key)
  );

  -- Keep the subscription's billing window aligned with the granted period.
  UPDATE public.organization_subscriptions
  SET period_start = v_period_start,
      period_end = v_period_end,
      updated_at = NOW()
  WHERE organization_id = p_org_id;

  -- Mirror the allowance onto the wallet for fast UI reads.
  UPDATE public.org_credit_balances
  SET monthly_allowance = v_amount, month_key = v_period_key, updated_at = NOW()
  WHERE organization_id = p_org_id;

  RETURN jsonb_build_object(
    'status', v_result->>'status',
    'amount', CASE WHEN v_result->>'status' = 'ok' THEN v_amount ELSE 0 END,
    'period_key', v_period_key,
    'entry_id', v_result->>'entry_id',
    'balance', COALESCE((v_result->>'balance')::integer, 0)
  );
END;
$$;


-- ============================================================================
-- 7. SEED DATA — DEVELOPMENT CONFIGURATION (NOT commercial pricing)
-- ============================================================================
-- Values below are development placeholders proving out the infrastructure.
-- They are NOT approved commercial pricing/allowances and must be revisited
-- with real commercial configuration before launch (Phase 4+).
INSERT INTO public.plans (key, name, description, status, display_order, metadata) VALUES
  ('free', 'Free', 'Get started with core prospecting.', 'active', 10,
   '{"development_config": true}'),
  ('pro', 'Pro', 'For growing teams that need serious pipeline.', 'active', 20,
   '{"development_config": true}'),
  ('business', 'Business', 'For organizations scaling outbound motion.', 'active', 30,
   '{"development_config": true}'),
  ('enterprise', 'Enterprise', 'For large organizations with custom needs.', 'active', 40,
   '{"development_config": true}')
ON CONFLICT (key) DO NOTHING;

-- Development placeholder entitlements (limit_type='unlimited' stores value=0).
INSERT INTO public.plan_entitlements (plan_key, key, limit_type, value, reset_period) VALUES
  -- Free
  ('free', 'monthly_credit_allowance', 'integer', 5000, 'monthly'),
  ('free', 'max_prospects',            'integer', 1000, 'never'),
  ('free', 'max_team_members',         'integer', 1,    'never'),
  ('free', 'max_saved_lists',          'integer', 3,    'never'),
  ('free', 'max_active_automations',   'integer', 0,    'never'),
  ('free', 'research_access',          'boolean', 0,    'never'),
  ('free', 'enrichment_access',        'boolean', 0,    'never'),
  ('free', 'signal_access',            'boolean', 0,    'never'),
  ('free', 'advanced_intelligence_access', 'boolean', 0, 'never'),
  -- Pro
  ('pro', 'monthly_credit_allowance',  'integer', 25000, 'monthly'),
  ('pro', 'max_prospects',             'integer', 10000, 'never'),
  ('pro', 'max_team_members',          'integer', 5,     'never'),
  ('pro', 'max_saved_lists',           'integer', 25,    'never'),
  ('pro', 'max_active_automations',    'integer', 5,     'never'),
  ('pro', 'research_access',           'boolean', 1,     'never'),
  ('pro', 'enrichment_access',         'boolean', 1,     'never'),
  ('pro', 'signal_access',             'boolean', 1,     'never'),
  ('pro', 'advanced_intelligence_access', 'boolean', 0, 'never'),
  -- Business
  ('business', 'monthly_credit_allowance', 'integer', 75000, 'monthly'),
  ('business', 'max_prospects',            'integer', 50000, 'never'),
  ('business', 'max_team_members',         'integer', 15,    'never'),
  ('business', 'max_saved_lists',          'integer', 100,   'never'),
  ('business', 'max_active_automations',   'integer', 25,    'never'),
  ('business', 'research_access',          'boolean', 1,     'never'),
  ('business', 'enrichment_access',        'boolean', 1,     'never'),
  ('business', 'signal_access',            'boolean', 1,     'never'),
  ('business', 'advanced_intelligence_access', 'boolean', 1, 'never'),
  -- Enterprise (explicit unlimited representation — never magic numbers)
  ('enterprise', 'monthly_credit_allowance', 'unlimited', 0, 'monthly'),
  ('enterprise', 'max_prospects',            'unlimited', 0, 'never'),
  ('enterprise', 'max_team_members',         'unlimited', 0, 'never'),
  ('enterprise', 'max_saved_lists',          'unlimited', 0, 'never'),
  ('enterprise', 'max_active_automations',   'unlimited', 0, 'never'),
  ('enterprise', 'research_access',          'boolean',   1, 'never'),
  ('enterprise', 'enrichment_access',        'boolean',   1, 'never'),
  ('enterprise', 'signal_access',            'boolean',   1, 'never'),
  ('enterprise', 'advanced_intelligence_access', 'boolean', 1, 'never')
ON CONFLICT (plan_key, key) DO NOTHING;

-- ============================================================================
-- 8. UPDATED_AT TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS update_plans_updated_at ON public.plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_subscriptions_updated_at ON public.organization_subscriptions;
CREATE TRIGGER update_organization_subscriptions_updated_at
  BEFORE UPDATE ON public.organization_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

