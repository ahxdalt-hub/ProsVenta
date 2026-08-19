-- ============================================================================
-- Prosventa Credit & Entitlement Foundation
-- Stage 5 — Feature Access, Plan Entitlements & Curiosity-Driven Upgrade UX
-- ============================================================================
-- Creates the server-side credit balance and transaction tracking needed by
-- the entitlement architecture. This is the AUTHORITATIVE source for credit
-- balances — clients can never manipulate these values.
--
-- Why this is needed:
--   - The existing `intelligence_usage` table only logs operations.
--   - There is no durable credit balance store.
--   - Server-side authorization must verify credit balance BEFORE any
--     external provider call. That requires a server-authoritative table.
-- ============================================================================

-- ============================================================================
-- 1. ORGANIZATION CREDIT BALANCES
-- ============================================================================
-- One row per organization. The balance is the authoritative credit count.
CREATE TABLE IF NOT EXISTS public.org_credit_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  monthly_allowance INTEGER NOT NULL DEFAULT 0,
  month_key TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_org_credit_balance UNIQUE (organization_id)
);

ALTER TABLE public.org_credit_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their org credit balance" ON public.org_credit_balances;

-- Members can view their organization's credit balance.
-- Only server-side functions (SECURITY DEFINER) may modify balances.
CREATE POLICY "Members can view their org credit balance"
  ON public.org_credit_balances FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = org_credit_balances.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_org_credit_balances_org_id
  ON public.org_credit_balances(organization_id);

-- ============================================================================
-- 2. CREDIT TRANSACTIONS
-- ============================================================================
-- Append-only audit log of every credit deduction, top-up, or adjustment.
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deduction', 'topup', 'refund', 'adjustment')),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view credit transactions in their org" ON public.credit_transactions;

-- Members can view transactions for their organization.
-- Only server-side functions (SECURITY DEFINER) may insert transactions.
CREATE POLICY "Members can view credit transactions in their org"
  ON public.credit_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = credit_transactions.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_credit_tx_org_id ON public.credit_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_created_at ON public.credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_tx_org_created ON public.credit_transactions(organization_id, created_at);

-- ============================================================================
-- 3. SECURITY DEFINER FUNCTIONS (Server-Authoritative Credit Operations)
-- ============================================================================
-- These functions bypass RLS so only the application server (via server
-- actions) can modify credit balances. Clients can never change balances.

-- 3a. GET CREDIT BALANCE
CREATE OR REPLACE FUNCTION public.get_org_credit_balance(p_org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance INTO v_balance
  FROM public.org_credit_balances
  WHERE organization_id = p_org_id;

  RETURN COALESCE(v_balance, 0);
END;
$$;

-- 3b. ENSURE CREDIT BALANCE ROW
-- Creates the row if it does not exist (e.g. first-time setup).
CREATE OR REPLACE FUNCTION public.ensure_org_credit_balance(p_org_id UUID, p_monthly_allowance INTEGER DEFAULT 0)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_balance INTEGER;
  v_month TEXT := to_char(NOW(), 'YYYY-MM');
BEGIN
  INSERT INTO public.org_credit_balances (organization_id, balance, monthly_allowance, month_key)
  VALUES (p_org_id, p_monthly_allowance, p_monthly_allowance, v_month)
  ON CONFLICT (organization_id) DO NOTHING;

  SELECT balance INTO v_balance
  FROM public.org_credit_balances
  WHERE organization_id = p_org_id;

  RETURN COALESCE(v_balance, 0);
END;
$$;

-- 3c. DEDUCT CREDITS (Atomic)
-- Atomically checks and deducts credits. Returns 1 on success, 0 on
-- insufficient balance. This is the single guardrail before any external
-- provider call — it CANNOT be bypassed from the client.
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_org_id UUID,
  p_user_id UUID,
  p_feature_id TEXT,
  p_amount INTEGER,
  p_description TEXT DEFAULT ''
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive';
  END IF;

  -- Lock the balance row so concurrent deductions are serialized.
  SELECT balance INTO v_balance
  FROM public.org_credit_balances
  WHERE organization_id = p_org_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN 0; -- insufficient credits
  END IF;

  UPDATE public.org_credit_balances
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE organization_id = p_org_id;

  INSERT INTO public.credit_transactions (
    organization_id, user_id, feature_id, amount, type, description
  )
  VALUES (p_org_id, p_user_id, p_feature_id, -p_amount, 'deduction', p_description);

  RETURN 1;
END;
$$;

-- 3d. ADD CREDITS (Top-up / Adjustment)
CREATE OR REPLACE FUNCTION public.add_credits(
  p_org_id UUID,
  p_user_id UUID,
  p_feature_id TEXT,
  p_amount INTEGER,
  p_description TEXT DEFAULT ''
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.org_credit_balances (organization_id, balance, monthly_allowance)
  VALUES (p_org_id, p_amount, 0)
  ON CONFLICT (organization_id)
  DO UPDATE SET balance = public.org_credit_balances.balance + p_amount,
                updated_at = NOW();

  INSERT INTO public.credit_transactions (
    organization_id, user_id, feature_id, amount, type, description
  )
  VALUES (p_org_id, p_user_id, p_feature_id, p_amount, CASE WHEN p_amount > 0 THEN 'topup' ELSE 'adjustment' END, p_description);

  RETURN 1;
END;
$$;

-- ============================================================================
-- 4. DEFAULT CREDIT BALANCE ON ORGANIZATION CREATION
-- ============================================================================
-- When a new organization is created, give it the free-plan default.
CREATE OR REPLACE FUNCTION public.ensure_org_credit_on_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.org_credit_balances (organization_id, balance, monthly_allowance)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_org_credit_on_create_trigger ON public.organizations;
CREATE TRIGGER ensure_org_credit_on_create_trigger
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_org_credit_on_create();