-- ============================================================================
-- Prosventa Credits — Wallet & Ledger Architecture
-- Stage 8 — Phase 1: Prosventa Credits Architecture
-- ============================================================================
-- UPGRADES the Stage 5 credit foundation (20260817000001) into the full
-- organization-level credit wallet + immutable ledger architecture.
--
-- Model:
--   Organization → Credit Wallet (org_credit_balances)
--                    ├── available balance        (balance)
--                    ├── reserved credits          (reserved)
--                    ├── lifetime purchased/granted/consumed counters
--                    └── Ledger (credit_transactions, append-only)
--
-- Accounting convention (used EVERYWHERE):
--   - Signed amounts on ledger entries. Positive = credits added,
--     negative = credits removed. No separate direction column.
--   - Whole credits only. INTEGER columns. Never floating point.
--
-- Guarantees:
--   - Atomic, row-locked balance mutations (FOR UPDATE serialization).
--   - Negative balances impossible (DB CHECK + function guards).
--   - Idempotency via unique idempotency_key per ledger entry.
--   - Ledger is append-only (UPDATE/DELETE blocked by trigger).
--   - Balance reconciliation: balance = SUM(ledger amounts).
--   - RLS: members read their own org's wallet/ledger only; NO client-side
--     mutation policies exist — all mutations go through SECURITY DEFINER
--     RPCs invoked by server-authorized application code only.
--
-- NOT implemented here (later Stage 8 phases): payment processing,
-- subscriptions, plan pricing and related commerce features.
-- ============================================================================

-- ============================================================================
-- 1. WALLET UPGRADE (org_credit_balances)
-- ============================================================================
-- The wallet row is the authoritative, fast-to-read balance store.
-- `balance` = AVAILABLE credits (excludes reservations).
-- `reserved` = credits held for in-flight long-running operations.
ALTER TABLE public.org_credit_balances
  ADD COLUMN IF NOT EXISTS reserved INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_purchased INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_granted INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_consumed INTEGER NOT NULL DEFAULT 0;

-- Whole credits only; available and reserved can never go negative.
ALTER TABLE public.org_credit_balances DROP CONSTRAINT IF EXISTS org_credit_balances_balance_check;
ALTER TABLE public.org_credit_balances
  ADD CONSTRAINT org_credit_balances_balance_check CHECK (balance >= 0);
ALTER TABLE public.org_credit_balances DROP CONSTRAINT IF EXISTS org_credit_balances_reserved_check;
ALTER TABLE public.org_credit_balances
  ADD CONSTRAINT org_credit_balances_reserved_check CHECK (reserved >= 0);

CREATE INDEX IF NOT EXISTS idx_org_credit_balances_updated_at
  ON public.org_credit_balances(updated_at);

-- ============================================================================
-- 2. LEDGER UPGRADE (credit_transactions)
-- ============================================================================
-- Append-only source of truth. Every credit movement creates exactly one row.
ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES public.org_credit_balances(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS reference_type TEXT,
  ADD COLUMN IF NOT EXISTS reference_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Controlled transaction vocabulary (documented):
--   grant        → credits given to the org (initial/promotional/admin grants)
--   purchase     → credits bought with real money (Phase 4+, not wired yet)
--   consumption  → credits spent by a product operation (research/enrichment…)
--   refund       → credits returned after a failed/voided operation
--   adjustment   → administrative correction (server-authorized only)
--   expiration   → credits removed due to expiry (future use)
--   reservation  → credits moved from available into reserved state
--   release      → a reservation released back to available
--   deduction    → LEGACY (Stage 5): negative mutation, ≈ consumption
--   topup        → LEGACY (Stage 5): positive mutation, ≈ grant/purchase
ALTER TABLE public.credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_type_check;
ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_type_check CHECK (
    type IN ('grant','purchase','consumption','refund','adjustment',
             'expiration','reservation','release','deduction','topup')
  );

-- Amounts must be non-zero whole credits (signed accounting convention).
ALTER TABLE public.credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_amount_nonzero;
ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_amount_nonzero CHECK (amount <> 0);

-- IDEMPOTENCY: the same logical transaction can never produce two ledger
-- entries. Retried requests hit this constraint and are treated as duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_tx_idempotency_key
  ON public.credit_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Query-pattern indexes (organization filtering, chronology, references).
CREATE INDEX IF NOT EXISTS idx_credit_tx_wallet_id ON public.credit_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_reference ON public.credit_transactions(reference_type, reference_id);
DROP INDEX IF EXISTS idx_credit_tx_org_created;
CREATE INDEX IF NOT EXISTS idx_credit_tx_org_created_desc
  ON public.credit_transactions(organization_id, created_at DESC);

-- Backfill wallet links for any pre-existing ledger rows.
UPDATE public.credit_transactions ct
SET wallet_id = w.id
FROM public.org_credit_balances w
WHERE w.organization_id = ct.organization_id
  AND ct.wallet_id IS NULL;

-- ============================================================================
-- 3. IMMUTABLE LEDGER
-- ============================================================================
-- Financial history is never rewritten. A wrong entry is corrected with a new
-- (e.g. 'adjustment') entry — never edited or deleted.
CREATE OR REPLACE FUNCTION public.prevent_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'credit ledger is append-only: % is not permitted', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS credit_transactions_immutable ON public.credit_transactions;
CREATE TRIGGER credit_transactions_immutable
  BEFORE UPDATE OR DELETE ON public.credit_transactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_mutation();

-- ============================================================================
-- 4. SERVER-AUTHORITATIVE CREDIT OPERATIONS
-- ============================================================================
-- All mutations run through these SECURITY DEFINER functions. There are NO
-- INSERT/UPDATE/DELETE RLS policies on either table, so clients cannot mutate
-- balances directly. Application-level authorization (authenticated user +
-- organization membership + role) is enforced by CreditService BEFORE calling.
--
-- Every mutating function accepts an optional idempotency key:
--   - First call performs the mutation and writes the ledger entry.
--   - A repeated call with the same key returns status 'duplicate' WITHOUT
--     performing any second mutation (a partial unique index is the hard DB
--     guarantee against double-grant / double-consume).
-- Return shape (JSONB): {"status": "ok"|"duplicate"|"insufficient_credits"
--                        |"wallet_not_found", "balance": int, "entry_id": uuid}
-- ============================================================================

-- Shared: resolve the org's wallet row.
CREATE OR REPLACE FUNCTION public.get_credit_wallet(p_org_id UUID)
RETURNS public.org_credit_balances
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_wallet public.org_credit_balances;
BEGIN
  SELECT * INTO v_wallet FROM public.org_credit_balances
  WHERE organization_id = p_org_id;
  RETURN v_wallet;
END;
$$;

-- 4a. GRANT / PURCHASE (positive-only mutation)
CREATE OR REPLACE FUNCTION public.grant_credits(
  p_org_id UUID,
  p_amount INTEGER,
  p_type TEXT DEFAULT 'grant',
  p_source TEXT DEFAULT 'admin_adjustment',
  p_actor_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_wallet public.org_credit_balances;
  v_entry_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_credit_amount';
  END IF;
  IF p_type NOT IN ('grant', 'purchase') THEN
    RAISE EXCEPTION 'invalid_transaction_type';
  END IF;

  -- Idempotency fast-path: return the existing entry without mutating.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_entry_id FROM public.credit_transactions
    WHERE idempotency_key = p_idempotency_key;
    IF v_entry_id IS NOT NULL THEN
      SELECT balance INTO v_wallet.balance FROM public.org_credit_balances w2
      WHERE w2.organization_id = p_org_id;
      RETURN jsonb_build_object('status','duplicate',
        'balance', COALESCE(v_wallet.balance, 0), 'entry_id', v_entry_id);
    END IF;
  END IF;

  -- Row lock serializes concurrent mutations on this wallet.
  SELECT * INTO v_wallet FROM public.org_credit_balances
  WHERE organization_id = p_org_id FOR UPDATE;
  IF v_wallet.id IS NULL THEN
    RETURN jsonb_build_object('status','wallet_not_found','balance',0,'entry_id',NULL);
  END IF;

  UPDATE public.org_credit_balances
  SET balance = balance + p_amount,
      lifetime_purchased = lifetime_purchased + CASE WHEN p_type = 'purchase' THEN p_amount ELSE 0 END,
      lifetime_granted = lifetime_granted + CASE WHEN p_type = 'grant' THEN p_amount ELSE 0 END,
      updated_at = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO public.credit_transactions (
    organization_id, wallet_id, user_id, feature_id, amount, type,
    description, source, reference_type, reference_id, metadata, idempotency_key
  ) VALUES (
    p_org_id, v_wallet.id, COALESCE(p_actor_id,
      (SELECT o.owner_id FROM public.organizations o WHERE o.id = p_org_id)), '',
    p_amount, p_type, '', p_source, p_reference_type, p_reference_id,
    p_metadata, p_idempotency_key
  )
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object('status','ok','balance', v_wallet.balance + p_amount, 'entry_id', v_entry_id);
END;
$$;

-- 4b. CONSUME (negative-only mutation, atomic, never negative balance)
CREATE OR REPLACE FUNCTION public.consume_credits(
  p_org_id UUID,
  p_amount INTEGER,
  p_feature_id TEXT DEFAULT '',
  p_actor_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_wallet public.org_credit_balances;
  v_entry_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_credit_amount';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_entry_id FROM public.credit_transactions
    WHERE idempotency_key = p_idempotency_key;
    IF v_entry_id IS NOT NULL THEN
      SELECT balance INTO v_wallet.balance FROM public.org_credit_balances w2
      WHERE w2.organization_id = p_org_id;
      RETURN jsonb_build_object('status','duplicate',
        'balance', COALESCE(v_wallet.balance, 0), 'entry_id', v_entry_id);
    END IF;
  END IF;

  -- Row lock serializes concurrent consumers: two racing requests cannot both
  -- pass this sufficiency check (prevents the read-subtract-save race where
  -- two requests each see balance=100 and both succeed).
  SELECT * INTO v_wallet FROM public.org_credit_balances
  WHERE organization_id = p_org_id FOR UPDATE;
  IF v_wallet.id IS NULL THEN
    RETURN jsonb_build_object('status','wallet_not_found','balance',0,'entry_id',NULL);
  END IF;
  IF v_wallet.balance < p_amount THEN
    -- Insufficient credits: no ledger entry, no balance mutation.
    RETURN jsonb_build_object('status','insufficient_credits',
      'balance', v_wallet.balance, 'entry_id', NULL);
  END IF;

  UPDATE public.org_credit_balances
  SET balance = balance - p_amount,
      lifetime_consumed = lifetime_consumed + p_amount,
      updated_at = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO public.credit_transactions (
    organization_id, wallet_id, user_id, feature_id, amount, type,
    description, source, reference_type, reference_id, metadata, idempotency_key
  ) VALUES (
    p_org_id, v_wallet.id,
    COALESCE(p_actor_id, (SELECT o.owner_id FROM public.organizations o WHERE o.id = p_org_id)),
    COALESCE(p_feature_id, ''), -p_amount, 'consumption', '',
    'operation', p_reference_type, p_reference_id, p_metadata, p_idempotency_key
  )
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object('status','ok','balance', v_wallet.balance - p_amount, 'entry_id', v_entry_id);
END;
$$;

-- 4c. REFUND (traceable reversal of a prior consumption)
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_org_id UUID,
  p_amount INTEGER,
  p_actor_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_wallet public.org_credit_balances;
  v_entry_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_credit_amount';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_entry_id FROM public.credit_transactions
    WHERE idempotency_key = p_idempotency_key;
    IF v_entry_id IS NOT NULL THEN
      SELECT balance INTO v_wallet.balance FROM public.org_credit_balances w2
      WHERE w2.organization_id = p_org_id;
      RETURN jsonb_build_object('status','duplicate',
        'balance', COALESCE(v_wallet.balance, 0), 'entry_id', v_entry_id);
    END IF;
  END IF;

  SELECT * INTO v_wallet FROM public.org_credit_balances
  WHERE organization_id = p_org_id FOR UPDATE;
  IF v_wallet.id IS NULL THEN
    RETURN jsonb_build_object('status','wallet_not_found','balance',0,'entry_id',NULL);
  END IF;

  UPDATE public.org_credit_balances
  SET balance = balance + p_amount, updated_at = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO public.credit_transactions (
    organization_id, wallet_id, user_id, feature_id, amount, type,
    description, source, reference_type, reference_id, metadata, idempotency_key
  ) VALUES (
    p_org_id, v_wallet.id,
    COALESCE(p_actor_id, (SELECT o.owner_id FROM public.organizations o WHERE o.id = p_org_id)),
    '', p_amount, 'refund', '', 'refund', p_reference_type, p_reference_id,
    p_metadata, p_idempotency_key
  )
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object('status','ok','balance', v_wallet.balance + p_amount, 'entry_id', v_entry_id);
END;
$$;

-- 4d. ADJUSTMENT (administrative correction; signed amount allowed)
CREATE OR REPLACE FUNCTION public.adjust_credits(
  p_org_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_wallet public.org_credit_balances;
  v_entry_id UUID;
  v_new_balance INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'invalid_credit_amount';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'missing_adjustment_reason';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_entry_id FROM public.credit_transactions
    WHERE idempotency_key = p_idempotency_key;
    IF v_entry_id IS NOT NULL THEN
      SELECT balance INTO v_wallet.balance FROM public.org_credit_balances w2
      WHERE w2.organization_id = p_org_id;
      RETURN jsonb_build_object('status','duplicate',
        'balance', COALESCE(v_wallet.balance, 0), 'entry_id', v_entry_id);
    END IF;
  END IF;

  SELECT * INTO v_wallet FROM public.org_credit_balances
  WHERE organization_id = p_org_id FOR UPDATE;
  IF v_wallet.id IS NULL THEN
    RETURN jsonb_build_object('status','wallet_not_found','balance',0,'entry_id',NULL);
  END IF;

  v_new_balance := v_wallet.balance + p_amount;
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object('status','insufficient_credits',
      'balance', v_wallet.balance, 'entry_id', NULL);
  END IF;

  UPDATE public.org_credit_balances
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO public.credit_transactions (
    organization_id, wallet_id, user_id, feature_id, amount, type,
    description, source, metadata, idempotency_key
  ) VALUES (
    p_org_id, v_wallet.id,
    COALESCE(p_actor_id, (SELECT o.owner_id FROM public.organizations o WHERE o.id = p_org_id)),
    '', p_amount, 'adjustment', left(trim(p_reason), 500), 'admin_adjustment',
    jsonb_build_object('reason', left(trim(p_reason), 500)) || p_metadata, p_idempotency_key
  )
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object('status','ok','balance', v_new_balance, 'entry_id', v_entry_id);
END;
$$;

-- 4e. RESERVE (available → reserved for long-running operations)
CREATE OR REPLACE FUNCTION public.reserve_credits(
  p_org_id UUID,
  p_amount INTEGER,
  p_actor_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_wallet public.org_credit_balances;
  v_entry_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_credit_amount';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_entry_id FROM public.credit_transactions
    WHERE idempotency_key = p_idempotency_key AND type = 'reservation';
    IF v_entry_id IS NOT NULL THEN
      RETURN jsonb_build_object('status','duplicate','balance',NULL,'entry_id',v_entry_id);
    END IF;
  END IF;

  SELECT * INTO v_wallet FROM public.org_credit_balances
  WHERE organization_id = p_org_id FOR UPDATE;
  IF v_wallet.id IS NULL THEN
    RETURN jsonb_build_object('status','wallet_not_found','balance',0,'entry_id',NULL);
  END IF;
  IF v_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('status','insufficient_credits',
      'balance', v_wallet.balance, 'entry_id', NULL);
  END IF;

  UPDATE public.org_credit_balances
  SET balance = balance - p_amount, reserved = reserved + p_amount, updated_at = NOW()
  WHERE id = v_wallet.id;

  -- Reservation ledger entries are bookkeeping of the available→reserved
  -- split (balance impact of the pair is zero — credits are moved, not
  -- consumed). Reconciliation excludes them from the balance total and
  -- audits `reserved` explicitly.
  INSERT INTO public.credit_transactions (
    organization_id, wallet_id, user_id, feature_id, amount, type,
    description, source, reference_type, reference_id, metadata, idempotency_key
  ) VALUES (
    p_org_id, v_wallet.id,
    COALESCE(p_actor_id, (SELECT o.owner_id FROM public.organizations o WHERE o.id = p_org_id)),
    '', -p_amount, 'reservation', '', 'operation', p_reference_type, p_reference_id,
    jsonb_build_object('reserved', p_amount), p_idempotency_key
  )
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object('status','ok','balance', v_wallet.balance - p_amount, 'entry_id', v_entry_id);
END;
$$;

-- 4f. RELEASE (reserved → available). Used when a reserved operation fails or
-- is cancelled; on success, convert a reservation via consume_credits after
-- releasing (reserve → consume pattern keeps the ledger explicit).
CREATE OR REPLACE FUNCTION public.release_credits(
  p_org_id UUID,
  p_amount INTEGER,
  p_actor_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_wallet public.org_credit_balances;
  v_entry_id UUID;
  v_release INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_credit_amount';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_entry_id FROM public.credit_transactions
    WHERE idempotency_key = p_idempotency_key AND type = 'release';
    IF v_entry_id IS NOT NULL THEN
      RETURN jsonb_build_object('status','duplicate','balance',NULL,'entry_id',v_entry_id);
    END IF;
  END IF;

  SELECT * INTO v_wallet FROM public.org_credit_balances
  WHERE organization_id = p_org_id FOR UPDATE;
  IF v_wallet.id IS NULL THEN
    RETURN jsonb_build_object('status','wallet_not_found','balance',0,'entry_id',NULL);
  END IF;

  v_release := LEAST(p_amount, v_wallet.reserved);

  UPDATE public.org_credit_balances
  SET balance = balance + v_release, reserved = reserved - v_release, updated_at = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO public.credit_transactions (
    organization_id, wallet_id, user_id, feature_id, amount, type,
    description, source, reference_type, reference_id, metadata, idempotency_key
  ) VALUES (
    p_org_id, v_wallet.id,
    COALESCE(p_actor_id, (SELECT o.owner_id FROM public.organizations o WHERE o.id = p_org_id)),
    '', v_release, 'release', '', 'operation', p_reference_type, p_reference_id,
    jsonb_build_object('released', v_release), p_idempotency_key
  )
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object('status','ok','balance', v_wallet.balance + v_release, 'entry_id', v_entry_id);
END;
$$;

-- 4g. RECONCILIATION
-- Verifies: current available balance == SUM(valid ledger movements).
-- Reservation/release entries are excluded from the total (they are neutral
-- splits between `balance` and `reserved`); the reserved amount is reported
-- explicitly so reserved credits remain auditable.
CREATE OR REPLACE FUNCTION public.reconcile_org_credits(p_org_id UUID)
RETURNS TABLE (
  balance INTEGER,
  reserved INTEGER,
  ledger_total INTEGER,
  expected_balance INTEGER,
  matches BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_balance INTEGER;
  v_reserved INTEGER;
  v_ledger_total INTEGER;
BEGIN
  SELECT w.balance, w.reserved INTO v_balance, v_reserved
  FROM public.org_credit_balances w
  WHERE w.organization_id = p_org_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_ledger_total
  FROM public.credit_transactions
  WHERE organization_id = p_org_id
    AND type NOT IN ('reservation', 'release');

  v_balance := COALESCE(v_balance, 0);
  v_reserved := COALESCE(v_reserved, 0);

  -- Available balance must equal the ledger total minus currently-reserved
  -- credits (reservations hold value outside `balance` but inside the org).
  RETURN QUERY SELECT
    v_balance,
    v_reserved,
    v_ledger_total,
    v_ledger_total - v_reserved,
    (v_balance = v_ledger_total - v_reserved);
END;
$$;

-- ============================================================================
-- 5. RLS CONFIRMATION
-- ============================================================================
-- Both tables were enabled with member-scoped SELECT-only policies in
-- 20260817000001 ("Members can view their org credit balance" and "Members
-- can view credit transactions in their org"). Re-assert ENABLE here; no
-- mutation policies exist or will be created — clients can read their own
-- organization's wallet/ledger but can NEVER write to them.
ALTER TABLE public.org_credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;








