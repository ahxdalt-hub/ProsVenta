-- ============================================================================
-- Prosventa Payments — Credit Purchase System
-- Stage 8 — Phase 4: Payment + Credit Purchase System
-- ============================================================================
-- Model:
--   credit_packages (centralized purchasable credit catalog, lifecycle states)
--     └── purchases (authoritative order + IMMUTABLE price/credit snapshot)
--           ├── payments ("did money move?" — never merged with credits)
--           │     └── payment_provider_events (webhook idempotency record)
--           └── purchase_refunds (compensating accounting foundation)
--
-- Design rules honored:
--   - NO second wallet. Credits are granted ONLY via the Phase 1 ledger
--     functions (public.grant_credits / public.adjust_credits) invoked inside
--     transactional SECURITY DEFINER confirmation/refund RPCs below. Payment
--     code NEVER updates org_credit_balances directly.
--   - Purchase-to-credit idempotency: deterministic key 'purchase:{id}' hits
--     the ledger's unique idempotency_key index — retries can NEVER grant
--     twice.
--   - Webhook idempotency: payment_provider_events.id is the provider event
--     ID (primary key) — duplicate deliveries are detected authoritatively.
--   - Price snapshot: purchases store currency/amount/credits/package data at
--     purchase time; later package price changes cannot rewrite history.
--   - Packages are deactivated/deprecated, never deleted (FK RESTRICT).
--   - Amounts are INTEGER minor units (paise/cents). Never floats.
--   - NO sensitive card data is stored anywhere in this schema.
--   - RLS: organization members may READ their own org's purchases/payments/
--     refunds. There are NO client-side INSERT/UPDATE/DELETE policies — all
--     mutations happen through server-side application code + RPCs.
-- ============================================================================

-- ============================================================================
-- 1. CREDIT PACKAGE CATALOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable API identifier (never changes once referenced by a purchase).
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  credit_amount INTEGER NOT NULL CHECK (credit_amount > 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  -- Minor units (paise for INR, cents for USD).
  price INTEGER NOT NULL CHECK (price >= 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'deprecated')),
  display_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.credit_packages IS
  'Centralized purchasable credit packages. Prices are development placeholders — commercial pricing is configured later. Deactivate rather than delete packages referenced by historical purchases.';

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view credit package catalog" ON public.credit_packages;
CREATE POLICY "Authenticated users can view credit package catalog"
  ON public.credit_packages FOR SELECT
  USING (auth.role() = 'authenticated');
-- No client write policies: catalog administration happens via SQL/service role.

CREATE INDEX IF NOT EXISTS idx_credit_packages_display_order
  ON public.credit_packages(display_order);

-- Development placeholder packages (NOT final commercial pricing).
INSERT INTO public.credit_packages (key, name, description, credit_amount, currency, price, status, display_order, metadata) VALUES
  ('starter_credits', 'Starter Credits',  'Development starter credit package.', 5000,   'INR', 99900,    'active', 10, '{"development_config": true}'),
  ('growth_credits',  'Growth Credits',   'Development growth credit package.',  25000,  'INR', 399900,   'active', 20, '{"development_config": true}'),
  ('scale_credits',   'Scale Credits',    'Development scale credit package.',   100000, 'INR', 1299900,  'active', 30, '{"development_config": true}')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 2. PURCHASES (authoritative order + snapshot)
-- ============================================================================
-- purchase_status lifecycle (documented):
--   pending             → checkout created, waiting for provider confirmation
--   processing          → provider reports action in flight (rare/transitional)
--   paid                → provider confirmed payment AND credits were granted
--                         atomically by process_payment_confirmation()
--   failed              → provider reported failure. No credits ever.
--   cancelled           → customer abandoned checkout. No credits ever.
--   expired             → checkout session expired. No credits ever.
--   refunded            → fully refunded (compensating ledger entries exist)
--   partially_refunded  → partially refunded
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.credit_packages(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  purchase_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (purchase_status IN (
      'pending','processing','paid','failed','cancelled','expired',
      'refunded','partially_refunded')),
  -- ---- PRICE SNAPSHOT (immutable commercial truth at purchase time) -------
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  credits INTEGER NOT NULL CHECK (credits > 0),
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- ---- Provider linkage ----------------------------------------------------
  provider TEXT NOT NULL,
  provider_order_id TEXT UNIQUE,
  provider_payment_id TEXT,
  -- Server-side double-click protection per organization.
  idempotency_key TEXT,
  refunded_amount INTEGER NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Snapshot integrity: the order must always match its own snapshot.
  CONSTRAINT purchases_snapshot_credits_check CHECK ((snapshot->>'credit_amount')::integer = credits),
  CONSTRAINT purchases_snapshot_amount_check CHECK ((snapshot->>'price')::integer = amount),
  CONSTRAINT purchases_snapshot_currency_check CHECK (snapshot->>'currency' = currency)
);

COMMENT ON TABLE public.purchases IS
  'Authoritative purchase/order record. Currency, amount and credits are SNAPSHOTS taken at purchase time — later package changes never rewrite them.';

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organization members can view their org purchases" ON public.purchases;
CREATE POLICY "Organization members can view their org purchases"
  ON public.purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = purchases.organization_id
        AND m.user_id = auth.uid()
    )
  );
-- No client write policies anywhere: state transitions happen only through
-- server-side service code invoking SECURITY DEFINER RPCs / service role.

CREATE INDEX IF NOT EXISTS idx_purchases_org_created_desc
  ON public.purchases(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(purchase_status);
CREATE INDEX IF NOT EXISTS idx_purchases_provider_payment_id
  ON public.purchases(provider_payment_id) WHERE provider_payment_id IS NOT NULL;
-- Double-click protection: one pending purchase per (org, client key).
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_org_idempotency
  ON public.purchases(organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_package ON public.purchases(package_id);

DROP TRIGGER IF EXISTS update_purchases_updated_at ON public.purchases;
CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 3. PAYMENTS (money movement — separate responsibility from credits)
-- ============================================================================
-- Stores ONLY safe provider-reported fields. Card numbers, CVV, credentials
-- and secrets are PROHIBITED here (and exist nowhere in Prosventa's DB).
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','succeeded','failed','refunded')),
  payment_method_type TEXT,
  provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.payments IS
  'Money-movement records from the payment provider. Answers "did money move?" — the credit ledger separately answers "did credits move?". No sensitive card data ever.';

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organization members can view their org payments" ON public.payments;
CREATE POLICY "Organization members can view their org payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.purchases p
      JOIN public.organization_members m
        ON m.organization_id = p.organization_id
      WHERE p.id = payments.purchase_id
        AND m.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_payments_purchase ON public.payments(purchase_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_payment_id
  ON public.payments(provider_payment_id) WHERE provider_payment_id IS NOT NULL;

-- ============================================================================
-- 4. PAYMENT PROVIDER EVENTS (webhook idempotency)
-- ============================================================================
-- Primary key = provider event ID. A redelivered webhook INSERT collides with
-- this PK → authoritative duplicate detection. No client policies at all:
-- only the server-side webhook processor touches this table (service role).
CREATE TABLE IF NOT EXISTS public.payment_provider_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'processing'
    CHECK (processing_status IN ('processing','processed','ignored','failed')),
  error TEXT,
  payload_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.payment_provider_events IS
  'Authoritative webhook event log. The provider event id is the primary key so duplicate deliveries are detected at INSERT time.';

ALTER TABLE public.payment_provider_events ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: not client-accessible. Service role only.

CREATE INDEX IF NOT EXISTS idx_payment_events_received
  ON public.payment_provider_events(received_at DESC);

-- ============================================================================
-- 5. PURCHASE REFUNDS (foundation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.purchase_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  provider_refund_id TEXT UNIQUE,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  -- Credits actually revoked via compensating ledger entry (never deletes the
  -- original grant). Deterministic rule: revoke only UNCONSUMED credits.
  credits_revoked INTEGER NOT NULL DEFAULT 0 CHECK (credits_revoked >= 0),
  -- Credits already consumed that a full revoke could not cover — recorded
  -- for controlled review instead of silently driving a wallet negative.
  credits_shortfall INTEGER NOT NULL DEFAULT 0 CHECK (credits_shortfall >= 0),
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending','completed','failed')),
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.purchase_refunds IS
  'Refund records. Refunds NEVER delete original ledger entries — they add compensating transactions and record any consumed-credit shortfall for review.';

ALTER TABLE public.purchase_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organization members can view their org refunds" ON public.purchase_refunds;
CREATE POLICY "Organization members can view their org refunds"
  ON public.purchase_refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.purchases p
      JOIN public.organization_members m
        ON m.organization_id = p.organization_id
      WHERE p.id = purchase_refunds.purchase_id
        AND m.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_purchase_refunds_purchase
  ON public.purchase_refunds(purchase_id);


-- ============================================================================
-- 6. TRANSACTIONAL CONFIRMATION / FAILURE / REFUND RPCs
-- ============================================================================
-- These SECURITY DEFINER functions are the ONLY path from "payment happened"
-- to "credits moved". Each runs in a single transaction so the system can
-- never end in 'paid without credits' or 'credits without paid'.

-- 6a. CONFIRM PAYMENT + GRANT CREDITS (atomic, idempotent)
-- Called by the webhook processor and by post-redirect verification.
-- Returns jsonb: {status, credits, balance}
--   status: ok | duplicate | amount_mismatch | currency_mismatch | invalid_state
CREATE OR REPLACE FUNCTION public.process_payment_confirmation(
  p_purchase_id UUID,
  p_provider_payment_id TEXT,
  p_amount INTEGER,
  p_currency TEXT,
  p_provider_metadata JSONB DEFAULT '{}'::jsonb,
  p_payment_method_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_purchase public.purchases%ROWTYPE;
  v_grant JSONB;
BEGIN
  SELECT * INTO v_purchase FROM public.purchases
  WHERE id = p_purchase_id FOR UPDATE;
  IF v_purchase.id IS NULL THEN
    RETURN jsonb_build_object('status','invalid_state','credits',0,'balance',0);
  END IF;

  -- Already confirmed → authoritative duplicate. Never grant again.
  IF v_purchase.purchase_status = 'paid' THEN
    RETURN jsonb_build_object('status','duplicate','credits',0,'balance',0);
  END IF;

  -- Terminal non-paid states can never be paid retroactively.
  IF v_purchase.purchase_status NOT IN ('pending','processing') THEN
    RETURN jsonb_build_object('status','invalid_state','credits',0,'balance',0);
  END IF;

  -- AMOUNT VALIDATION: mismatch → flag for review, grant nothing.
  IF p_amount IS NOT NULL AND p_amount <> v_purchase.amount THEN
    UPDATE public.purchases
    SET failure_reason = 'amount_mismatch_review', updated_at = NOW()
    WHERE id = v_purchase.id;
    INSERT INTO public.payments (
      purchase_id, provider, provider_payment_id, amount, currency,
      status, payment_method_type, provider_metadata
    ) VALUES (
      v_purchase.id, v_purchase.provider, p_provider_payment_id,
      COALESCE(p_amount, 0), COALESCE(p_currency, v_purchase.currency),
      'failed', p_payment_method_type,
      jsonb_build_object('review_reason','amount_mismatch')
        || COALESCE(p_provider_metadata,'{}'::jsonb)
    );
    RETURN jsonb_build_object('status','amount_mismatch','credits',0,'balance',0);
  END IF;

  -- CURRENCY VALIDATION: mismatch → flag for review, grant nothing.
  IF p_currency IS NOT NULL AND upper(p_currency) <> v_purchase.currency THEN
    UPDATE public.purchases
    SET failure_reason = 'currency_mismatch_review', updated_at = NOW()
    WHERE id = v_purchase.id;
    RETURN jsonb_build_object('status','currency_mismatch','credits',0,'balance',0);
  END IF;

  -- Mark paid + payment row + credit grant ALL inside this one transaction.
  -- The grant uses the deterministic key 'purchase:{id}' — protected by the
  -- ledger's unique idempotency constraint. If ANYTHING fails, the whole
  -- transaction rolls back together: impossible-state protection.
  UPDATE public.purchases
  SET purchase_status = 'paid',
      provider_payment_id = COALESCE(p_provider_payment_id, provider_payment_id),
      updated_at = NOW()
  WHERE id = v_purchase.id;

  INSERT INTO public.payments (
    purchase_id, provider, provider_payment_id, amount, currency,
    status, payment_method_type, provider_metadata
  ) VALUES (
    v_purchase.id, v_purchase.provider, p_provider_payment_id,
    v_purchase.amount, v_purchase.currency, 'succeeded',
    p_payment_method_type, COALESCE(p_provider_metadata,'{}'::jsonb)
  );

  -- CREDIT GRANT through the existing Phase 1 accounting function
  -- (grant_credits → ledger → wallet). Deterministic idempotency key means
  -- webhook retries / worker retries can never double-grant.
  SELECT public.grant_credits(
    p_org_id          => v_purchase.organization_id,
    p_amount          => v_purchase.credits,
    p_type            => 'purchase',
    p_source          => 'purchase',
    p_actor_id        => v_purchase.created_by,
    p_idempotency_key => 'purchase:' || v_purchase.id::text,
    p_reference_type  => 'payment',
    p_reference_id    => v_purchase.id::text,
    p_metadata        => jsonb_build_object(
      'purchase_id', v_purchase.id::text,
      'package_key', v_purchase.snapshot->>'package_key',
      'amount_minor', v_purchase.amount,
      'currency', v_purchase.currency
    )
  ) INTO v_grant;

  IF v_grant->>'status' NOT IN ('ok','duplicate') THEN
    RAISE EXCEPTION 'credit_grant_failed: %', v_grant->>'status';
  END IF;

  RETURN jsonb_build_object(
    'status','ok',
    'credits', v_purchase.credits,
    'balance', (v_grant->>'balance')::integer
  );
END;
$$;


-- 6b. RECORD FAILURE / CANCELLATION / EXPIRATION
-- Only pending/processing purchases may move to a terminal non-paid state.
-- Credits are NEVER granted on these paths.
CREATE OR REPLACE FUNCTION public.record_purchase_failure(
  p_purchase_id UUID,
  p_status TEXT,          -- failed | cancelled | expired
  p_reason TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF p_status NOT IN ('failed','cancelled','expired') THEN
    RAISE EXCEPTION 'invalid_failure_status';
  END IF;

  UPDATE public.purchases
  SET purchase_status = p_status,
      failure_reason = COALESCE(p_reason, failure_reason),
      updated_at = NOW()
  WHERE id = p_purchase_id
    AND purchase_status IN ('pending','processing')
  RETURNING purchase_status INTO v_status;

  IF v_status IS NULL THEN
    -- Already terminal (e.g. paid by a racing webhook): leave untouched.
    SELECT purchase_status INTO v_status FROM public.purchases WHERE id = p_purchase_id;
    RETURN 'ignored:' || COALESCE(v_status, 'not_found');
  END IF;
  RETURN 'ok';
END;
$$;


-- 6c. REFUND FOUNDATION (compensating accounting — never deletes history)
-- Deterministic rule:
--   granted   = credits granted for this purchase (ledger reference)
--   consumed  = credits consumed since that grant
--   revocable = MAX(granted - consumed, 0), optionally capped by
--               p_credits_to_revoke
-- The original grant entry is NEVER modified or deleted. Consumed credits
-- that cannot be revoked are recorded as credits_shortfall for controlled
-- review instead of driving the wallet negative or creating free credits.
CREATE OR REPLACE FUNCTION public.process_purchase_refund(
  p_purchase_id UUID,
  p_refund_amount INTEGER,
  p_currency TEXT,
  p_provider_refund_id TEXT DEFAULT NULL,
  p_credits_to_revoke INTEGER DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_purchase public.purchases%ROWTYPE;
  v_granted INTEGER := 0;
  v_consumed INTEGER := 0;
  v_revocable INTEGER := 0;
  v_shortfall INTEGER := 0;
  v_requested INTEGER := 0;
  v_adjust JSONB;
  v_dupes INTEGER := 0;
BEGIN
  SELECT * INTO v_purchase FROM public.purchases
  WHERE id = p_purchase_id FOR UPDATE;
  IF v_purchase.id IS NULL THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;
  IF v_purchase.purchase_status NOT IN ('paid','partially_refunded') THEN
    RETURN jsonb_build_object('status','invalid_state');
  END IF;
  IF upper(COALESCE(p_currency,'')) <> v_purchase.currency
     OR p_refund_amount IS NULL OR p_refund_amount < 0
     OR p_refund_amount > (v_purchase.amount - v_purchase.refunded_amount) THEN
    RETURN jsonb_build_object('status','refund_amount_invalid');
  END IF;

  -- Duplicate provider refund guard (webhook retries).
  IF p_provider_refund_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_dupes
    FROM public.purchase_refunds
    WHERE purchase_id = p_purchase_id AND provider_refund_id = p_provider_refund_id;
    IF v_dupes > 0 THEN
      RETURN jsonb_build_object('status','duplicate');
    END IF;
  END IF;

  -- Ledger-derived accounting for THIS purchase's credit trail.
  SELECT COALESCE(SUM(amount), 0) INTO v_granted
  FROM public.credit_transactions
  WHERE organization_id = v_purchase.organization_id
    AND reference_type = 'payment'
    AND reference_id = p_purchase_id::text
    AND amount > 0;

  WITH grant_time AS (
    SELECT MIN(t.created_at) AS granted_at
    FROM public.credit_transactions t
    WHERE t.organization_id = v_purchase.organization_id
      AND t.reference_type = 'payment'
      AND t.reference_id = p_purchase_id::text
      AND t.amount > 0
  )
  SELECT COALESCE(-SUM(ct.amount), 0) INTO v_consumed
  FROM public.credit_transactions ct, grant_time g
  WHERE ct.organization_id = v_purchase.organization_id
    AND ct.reference_type IS DISTINCT FROM 'payment'
    AND g.granted_at IS NOT NULL
    AND ct.created_at > g.granted_at;

  v_requested := COALESCE(p_credits_to_revoke, v_granted);
  v_revocable := LEAST(GREATEST(v_granted - v_consumed, 0), GREATEST(v_requested, 0));
  v_shortfall := GREATEST(v_requested - v_revocable, 0);

  INSERT INTO public.purchase_refunds (
    purchase_id, provider_refund_id, amount, currency,
    credits_revoked, credits_shortfall, status, reason, created_by, metadata
  ) VALUES (
    p_purchase_id, p_provider_refund_id, p_refund_amount, v_purchase.currency,
    v_revocable, v_shortfall,
    CASE WHEN v_shortfall > 0 THEN 'pending' ELSE 'completed' END,
    p_reason, p_actor_id,
    jsonb_build_object('granted', v_granted, 'consumed', v_consumed)
  );

  IF v_revocable > 0 THEN
    -- Compensating ledger entry through the existing accounting function.
    -- Idempotent per (purchase, provider refund).
    SELECT public.adjust_credits(
      p_org_id          => v_purchase.organization_id,
      p_amount          => -v_revocable,
      p_reason          => 'purchase_refund:' || COALESCE(p_provider_refund_id, 'full'),
      p_actor_id        => COALESCE(p_actor_id, v_purchase.created_by),
      p_idempotency_key => 'refund:' || p_purchase_id::text || ':' || COALESCE(p_provider_refund_id, 'full'),
      p_metadata        => jsonb_build_object(
        'purchase_id', p_purchase_id::text,
        'credits_shortfall', v_shortfall
      )
    ) INTO v_adjust;
    IF v_adjust->>'status' NOT IN ('ok','duplicate') THEN
      RAISE EXCEPTION 'refund_credit_adjustment_failed: %', v_adjust->>'status';
    END IF;
  END IF;

  UPDATE public.purchases
  SET refunded_amount = refunded_amount + p_refund_amount,
      purchase_status = CASE
        WHEN refunded_amount + p_refund_amount >= amount THEN 'refunded'
        ELSE 'partially_refunded' END,
      updated_at = NOW()
  WHERE id = p_purchase_id;

  RETURN jsonb_build_object(
    'status','ok',
    'credits_revoked', v_revocable,
    'credits_shortfall', v_shortfall,
    'refunded_amount', p_refund_amount
  );
END;
$$;

