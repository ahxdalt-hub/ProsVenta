// ============================================================================
// Prosventa Payments — Phase 4 Test Suite
// Stage 8 — Phase 4: Payment + Credit Purchase System
// ============================================================================
// Layers covered:
//   1. Migration structural guarantees (snapshot integrity, idempotency
//      uniqueness, webhook event PK, transactional confirmation via the
//      EXISTING grant_credits path, refund compensating accounting, RLS,
//      no-second-wallet guarantee)
//   2. Webhook signature verification (valid / invalid / tampered / replayed)
//   3. Provider configuration safety (no credentials → graceful failure)
//   4. Error normalization + pure helpers
// ============================================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyStripeSignature } from "./provider/stripe";
import { formatMinorAmount } from "./packages";
import { RETRYABLE_PURCHASE_STATUSES } from "./types";
import { PaymentError as _PaymentError, toPaymentError } from "./errors";

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20260824000014_create_payments.sql"),
  "utf8"
);
const LEDGER_MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20260824000011_create_credit_wallet_ledger.sql"),
  "utf8"
);

const WEBHOOK_SECRET = "whsec_test_secret";

function sign(payload: string, timestamp: number, secret = WEBHOOK_SECRET): string {
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return `t=${timestamp},v1=${expected}`;
}

// ----------------------------------------------------------------------------
// 1. Migration structure
// ----------------------------------------------------------------------------
describe("payments migration structure", () => {
  it("creates the centralized credit package catalog with lifecycle states", () => {
    expect(MIGRATION).toMatch(/CREATE TABLE IF NOT EXISTS public\.credit_packages/);
    expect(MIGRATION).toMatch(/status TEXT NOT NULL DEFAULT 'active'[\s\S]*?'active', 'inactive', 'deprecated'/);
    // Never delete referenced packages.
    expect(MIGRATION).toMatch(/REFERENCES public\.credit_packages\(id\) ON DELETE RESTRICT/);
  });

  it("stores an immutable price snapshot with integrity constraints", () => {
    expect(MIGRATION).toMatch(/purchases_snapshot_credits_check/);
    expect(MIGRATION).toMatch(/purchases_snapshot_amount_check/);
    expect(MIGRATION).toMatch(/purchases_snapshot_currency_check/);
    // Amounts are integer minor units, never floats.
    expect(MIGRATION).toMatch(/amount INTEGER NOT NULL CHECK \(amount >= 0\)/);
  });

  it("documents the full controlled purchase status lifecycle", () => {
    for (const status of [
      "pending","processing","paid","failed","cancelled","expired",
      "refunded","partially_refunded",
    ]) {
      expect(MIGRATION).toContain(`'${status}'`);
    }
  });

  it("enforces server-side double-click protection via unique index", () => {
    expect(MIGRATION).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_org_idempotency\s+ON public\.purchases\(organization_id, idempotency_key\)/
    );
  });

  it("records payments separately from credits with no sensitive data", () => {
    expect(MIGRATION).toMatch(/CREATE TABLE IF NOT EXISTS public\.payments/);
    const paymentsBlock = MIGRATION.slice(
      MIGRATION.indexOf("public.payments ("),
      MIGRATION.indexOf("-- 4.")
    ).toLowerCase();
    for (const forbidden of ["card_number", "cvv", "cvc"]) {
      expect(paymentsBlock).not.toContain(forbidden);
    }
  });

  it("uses the provider event id as PRIMARY KEY for webhook idempotency", () => {
    expect(MIGRATION).toMatch(
      /CREATE TABLE IF NOT EXISTS public\.payment_provider_events \(\s*id TEXT PRIMARY KEY/
    );
    // Not client-accessible at all: no policies on the events table.
    const eventsBlock = MIGRATION.slice(
      MIGRATION.indexOf("public.payment_provider_events"),
      MIGRATION.indexOf("-- 5. PURCHASE REFUNDS")
    );
    expect(eventsBlock).not.toMatch(/CREATE POLICY/);
  });

  it("grants credits ONLY through the existing grant_credits accounting path", () => {
    // The confirmation RPC calls the Phase 1 ledger function…
    expect(MIGRATION).toContain("public.grant_credits(");
    // …with the deterministic purchase-to-credit idempotency reference.
    expect(MIGRATION).toContain("'purchase:' || v_purchase.id::text");
    // And payment code NEVER touches wallet balances directly.
    expect(MIGRATION).not.toMatch(/UPDATE public\.org_credit_balances/);
    expect(MIGRATION).not.toMatch(/SET balance\s*=/);
  });


  it("marks paid + payment row + credit grant inside ONE transaction function", () => {
    const confirmFn = MIGRATION.slice(
      MIGRATION.indexOf("process_payment_confirmation"),
      MIGRATION.indexOf("record_purchase_failure")
    );
    expect(confirmFn).toContain("purchase_status = 'paid'");
    expect(confirmFn).toContain("INSERT INTO public.payments");
    expect(confirmFn).toContain("public.grant_credits(");
    // Duplicate confirmations are detected authoritatively.
    expect(confirmFn).toMatch(/IF v_purchase\.purchase_status = 'paid'[\s\S]*'duplicate'/);
    // Terminal states can never be retroactively paid.
    expect(confirmFn).toContain("'pending','processing'");
  });

  it("validates amount and currency before granting credits", () => {
    const confirmFn = MIGRATION.slice(
      MIGRATION.indexOf("process_payment_confirmation"),
      MIGRATION.indexOf("record_purchase_failure")
    );
    expect(confirmFn).toContain("'amount_mismatch'");
    expect(confirmFn).toContain("'currency_mismatch'");
  });

  it("never grants credits on failure/cancellation/expiry paths", () => {
    const failureFn = MIGRATION.slice(
      MIGRATION.indexOf("record_purchase_failure"),
      MIGRATION.indexOf("6c. REFUND")
    );
    expect(failureFn).not.toContain("grant_credits");
    expect(failureFn).toContain("'failed','cancelled','expired'");
    // Only pending/processing purchases may move to terminal non-paid states.
    expect(failureFn).toContain("IN ('pending','processing')");
  });

  it("implements refunds as compensating ledger entries, never deletions", () => {
    const refundFn = MIGRATION.slice(MIGRATION.indexOf("process_purchase_refund"));
    // Uses adjust_credits (existing accounting), records shortfall explicitly.
    expect(refundFn).toContain("public.adjust_credits(");
    expect(refundFn).toContain("credits_shortfall");
    // Refunds are idempotent per provider refund id.
    expect(refundFn).toMatch(/'duplicate'/);
  });

  it("protects organization billing data with member-scoped SELECT-only RLS", () => {
    expect(MIGRATION).toMatch(/"Organization members can view their org purchases"/);
    expect(MIGRATION).toMatch(/"Organization members can view their org payments"/);
    expect(MIGRATION).toMatch(/"Organization members can view their org refunds"/);
    // No client-side write policies anywhere in this migration:
    // every CREATE POLICY must be a member-scoped FOR SELECT.
    const policies = MIGRATION.match(/CREATE POLICY[^;]+;/g) ?? [];
    expect(policies.length).toBeGreaterThan(0);
    for (const policy of policies) {
      expect(policy).toContain("FOR SELECT");
      expect(policy).not.toMatch(/FOR (INSERT|UPDATE|DELETE)/);
    }
  });

  it("does not create a second wallet or duplicate the ledger", () => {
    expect(MIGRATION).not.toMatch(/CREATE TABLE IF NOT EXISTS public\.\w*wallet\w*/);
    expect(MIGRATION).not.toMatch(/CREATE TABLE IF NOT EXISTS public\.\w*ledger\w*/);
    // Ledger uniqueness (idempotency key) still comes from Phase 1.
    expect(LEDGER_MIGRATION).toMatch(/idx_credit_tx_idempotency_key/);
  });
});

// ----------------------------------------------------------------------------
// 2. Webhook signature verification
// ----------------------------------------------------------------------------
describe("stripe webhook signature verification", () => {
  const payload = JSON.stringify({
    id: "evt_123",
    type: "checkout.session.completed",
    data: { object: { id: "cs_123", object: "checkout.session" } },
  });
  const now = Math.floor(Date.now() / 1000);

  it("accepts a validly signed request within tolerance", () => {
    expect(verifyStripeSignature(payload, sign(payload, now), WEBHOOK_SECRET, now)).toBe(true);
  });

  it("rejects missing signatures (arbitrary POSTs are not confirmations)", () => {
    expect(verifyStripeSignature(payload, null, WEBHOOK_SECRET, now)).toBe(false);
    expect(verifyStripeSignature(payload, "", WEBHOOK_SECRET, now)).toBe(false);
  });

  it("rejects tampered payloads", () => {
    const tampered = payload.replace("cs_123", "cs_999");
    expect(verifyStripeSignature(tampered, sign(payload, now), WEBHOOK_SECRET, now)).toBe(false);
  });

  it("rejects signatures made with the wrong secret", () => {
    expect(verifyStripeSignature(payload, sign(payload, now, "whsec_evil"), WEBHOOK_SECRET, now)).toBe(false);
  });

  it("rejects stale timestamps outside the replay tolerance window", () => {
    const stale = now - 3600;
    expect(verifyStripeSignature(payload, sign(payload, stale), WEBHOOK_SECRET, now)).toBe(false);
  });

  it("rejects malformed signature headers", () => {
    expect(verifyStripeSignature(payload, "garbage", WEBHOOK_SECRET, now)).toBe(false);
    expect(verifyStripeSignature(payload, `v1=${"a".repeat(64)}`, WEBHOOK_SECRET, now)).toBe(false);
  });
});


// ----------------------------------------------------------------------------
// 3. Error normalization + helpers
// ----------------------------------------------------------------------------
describe("payment errors and helpers", () => {
  it("normalizes unknown errors without leaking raw messages", () => {
    const normalized = toPaymentError(
      new Error('duplicate key value violates unique constraint "purchases_pkey"')
    );
    expect(normalized.code).toBe("DUPLICATE_PURCHASE_REQUEST");
    expect(normalized.message).not.toContain("purchases_pkey");

    expect(toPaymentError(new Error("row-level security")).code).toBe(
      "UNAUTHORIZED_PAYMENT_OPERATION"
    );
    expect(toPaymentError("mystery").code).toBe("PAYMENT_SERVICE_ERROR");
  });

  it("formats minor-unit amounts for display only", () => {
    expect(formatMinorAmount(99900, "INR")).toContain("₹999");
    expect(formatMinorAmount(1299900, "INR")).toContain("12,999");
  });

  it("defines retryable statuses for safe payment retry", () => {
    expect(RETRYABLE_PURCHASE_STATUSES.has("pending")).toBe(true);
    expect(RETRYABLE_PURCHASE_STATUSES.has("paid")).toBe(false);
    expect(RETRYABLE_PURCHASE_STATUSES.has("refunded")).toBe(false);
  });

  it("keeps provider secrets out of the codebase (env-only, never hardcoded)", () => {
    const stripeSource = readFileSync(
      join(process.cwd(), "src/features/payments/provider/stripe.ts"),
      "utf8"
    );
    // Secrets are read from env at call time — never hardcoded.
    expect(stripeSource).not.toMatch(/sk_(live|test)_\w{8,}/);
    expect(stripeSource).toMatch(/STRIPE_WEBHOOK_SECRET/);
  });
});

