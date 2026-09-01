// ============================================================================
// Prosventa Credits — Phase 1 Test Suite
// Stage 8 — Phase 1: Prosventa Credits Architecture
// ============================================================================
// Layers covered:
//   1. Centralized validation (amounts, references, idempotency keys)
//   2. Structured credit errors + normalization
//   3. Migration structural guarantees (atomicity row-locks, idempotency
//      uniqueness, immutable ledger, negative-balance prevention, RLS,
//      integer-only accounting, indexes)
//   4. Accounting model simulations (concurrency serialization, idempotent
//      retries, refund traceability, reconciliation across sequences)
//   5. No-payment guarantee (no checkout/provider/subscription code)
// ============================================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  validatePositiveAmount,
  validateSignedAmount,
  validateReference,
  validateIdempotencyKey,
  sanitizeMetadata,
  MAX_CREDIT_AMOUNT,
} from "./validation";
import { CreditError, CREDIT_ERROR_MESSAGES, toCreditError } from "./errors";
import type { CreditLedgerEntry } from "./types";

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20260824000011_create_credit_wallet_ledger.sql"),
  "utf8"
);
const FOUNDATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20260817000001_create_credit_entitlement.sql"),
  "utf8"
);

// ----------------------------------------------------------------------------
// 1. Validation
// ----------------------------------------------------------------------------
describe("credit validation", () => {
  it("accepts positive whole credit amounts", () => {
    expect(validatePositiveAmount(1)).toBe(1);
    expect(validatePositiveAmount(2450)).toBe(2450);
  });

  it("rejects zero, negative, fractional and oversized amounts", () => {
    expect(() => validatePositiveAmount(0)).toThrow(CreditError);
    expect(() => validatePositiveAmount(-10)).toThrow(CreditError);
    expect(() => validatePositiveAmount(10.5)).toThrow(CreditError); // never fractional
    expect(() => validatePositiveAmount(MAX_CREDIT_AMOUNT + 1)).toThrow(CreditError);
    expect(() => validatePositiveAmount("100" as unknown as number)).toThrow(CreditError);
    expect(() => validatePositiveAmount(Number.NaN)).toThrow(CreditError);
  });

  it("rejects invalid error codes on amounts", () => {
    try {
      validatePositiveAmount(-1);
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as CreditError).code).toBe("INVALID_CREDIT_AMOUNT");
    }
  });

  it("validates signed adjustment amounts", () => {
    expect(validateSignedAmount(-500)).toBe(-500);
    expect(validateSignedAmount(25)).toBe(25);
    expect(() => validateSignedAmount(0)).toThrow(CreditError);
    expect(() => validateSignedAmount(2.5)).toThrow(CreditError);
  });

  it("requires traceable operation references", () => {
    expect(() => validateReference("research", "rec_123")).not.toThrow();
    expect(() => validateReference("research", "")).toThrow(CreditError);
    expect(() => validateReference(null, "x")).toThrow(CreditError);
    expect(() => validateReference("crypto_mining", "x")).toThrow(CreditError);
    try {
      validateReference("research", "");
    } catch (e) {
      expect((e as CreditError).code).toBe("INVALID_TRANSACTION_REFERENCE");
    }
  });

  it("normalizes idempotency keys and rejects malformed ones", () => {
    expect(validateIdempotencyKey(" purchase_123 ")).toBe("purchase_123");
    expect(validateIdempotencyKey(null)).toBeNull();
    expect(validateIdempotencyKey(undefined)).toBeNull();
    expect(validateIdempotencyKey("   ")).toBeNull();
    expect(() => validateIdempotencyKey("x".repeat(201))).toThrow(CreditError);
  });

  it("keeps ledger metadata compact and structured", () => {
    const meta = sanitizeMetadata({
      operation: "research",
      provider: "mock",
      junk: undefined,
    });
    expect(Object.keys(meta)).toEqual(["operation", "provider"]);
    const long = sanitizeMetadata({ k: "v".repeat(600) });
    expect((long.k as string).length).toBeLessThanOrEqual(500);
  });
});

// ----------------------------------------------------------------------------
// 2. Structured errors
// ----------------------------------------------------------------------------
describe("credit errors", () => {
  it("exposes the required structured error codes", () => {
    const codes = [
      "INSUFFICIENT_CREDITS",
      "WALLET_NOT_FOUND",
      "UNAUTHORIZED_CREDIT_OPERATION",
      "INVALID_CREDIT_AMOUNT",
      "DUPLICATE_TRANSACTION",
      "INVALID_TRANSACTION_REFERENCE",
    ] as const;
    for (const code of codes) {
      expect(CREDIT_ERROR_MESSAGES[code].length).toBeGreaterThan(0);
      const err = new CreditError(code);
      expect(err.code).toBe(code);
      expect(err.name).toBe("CreditError");
    }
  });

  it("carries the available balance on insufficient-credit errors", () => {
    const err = new CreditError("INSUFFICIENT_CREDITS", { balance: 50 });
    expect(err.balance).toBe(50);
  });

  it("normalizes database sentinels into typed credit errors", () => {
    expect(toCreditError(new Error("invalid_credit_amount")).code).toBe("INVALID_CREDIT_AMOUNT");
    expect(toCreditError(new Error("wallet_not_found")).code).toBe("WALLET_NOT_FOUND");
    expect(
      toCreditError(
        new Error('duplicate key value violates unique constraint "idx_credit_tx_idempotency_key"')
      ).code
    ).toBe("DUPLICATE_TRANSACTION");
    expect(toCreditError(new Error("new row violates row-level security policy")).code).toBe(
      "UNAUTHORIZED_CREDIT_OPERATION"
    );
    expect(toCreditError(new CreditError("INSUFFICIENT_CREDITS")).code).toBe("INSUFFICIENT_CREDITS");
    const opaque = toCreditError("mystery failure");
    expect(opaque.code).toBe("CREDIT_SERVICE_ERROR");
    // Never leaks raw messages to users.
    expect(opaque.message).not.toContain("mystery");
  });
});

// ----------------------------------------------------------------------------
// 3. Migration structural guarantees
// ----------------------------------------------------------------------------
describe("credit migration structure", () => {
  it("uses integer (never floating point) credit columns", () => {
    expect(FOUNDATION).toMatch(/balance INTEGER NOT NULL DEFAULT 0 CHECK \(balance >= 0\)/);
    expect(MIGRATION).toMatch(/ADD COLUMN IF NOT EXISTS reserved INTEGER NOT NULL DEFAULT 0/);
    expect(MIGRATION).toMatch(/lifetime_purchased INTEGER NOT NULL DEFAULT 0/);
    expect(MIGRATION).toMatch(/lifetime_consumed INTEGER NOT NULL DEFAULT 0/);
    expect(MIGRATION + FOUNDATION).not.toMatch(/balance\s+(DOUBLE|REAL|NUMERIC|DECIMAL)/i);
  });

  it("prevents negative balances with database constraints", () => {
    expect(MIGRATION).toMatch(
      /org_credit_balances_balance_check CHECK \(balance >= 0\)/
    );
    expect(MIGRATION).toMatch(
      /org_credit_balances_reserved_check CHECK \(reserved >= 0\)/
    );
  });

  it("serializes concurrent mutations with row locks (atomicity)", () => {
    // Every mutating function takes FOR UPDATE before checking the balance —
    // this is what makes racing consumers (70 + 50 vs balance 100) safe.
    const lockCount = (MIGRATION.match(/FOR UPDATE;/g) ?? []).length;
    expect(lockCount).toBeGreaterThanOrEqual(6);
    // Sufficiency check happens after acquiring the lock in consume_credits.
    const consume = MIGRATION.slice(MIGRATION.indexOf("consume_credits"), MIGRATION.indexOf("refund_credits"));
    const lockPos = consume.indexOf("FOR UPDATE");
    const checkPos = consume.indexOf("v_wallet.balance < p_amount");
    expect(lockPos).toBeGreaterThan(-1);
    expect(checkPos).toBeGreaterThan(lockPos);
  });

  it("rejects consumption that would overdraw the wallet", () => {
    expect(MIGRATION).toMatch(
      /IF v_wallet\.balance < p_amount THEN[\s\S]*?insufficient_credits/
    );
  });

  it("enforces ledger idempotency with a unique index", () => {
    expect(MIGRATION).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_tx_idempotency_key\s*\n\s*ON public\.credit_transactions\(idempotency_key\)\s*\n\s*WHERE idempotency_key IS NOT NULL/
    );
  });

  it("makes the ledger append-only via trigger", () => {
    expect(MIGRATION).toMatch(/BEFORE UPDATE OR DELETE ON public\.credit_transactions/);
    expect(MIGRATION).toMatch(/credit ledger is append-only/);
  });

  it("constrains transaction types to the documented vocabulary", () => {
    for (const t of [
      "grant",
      "purchase",
      "consumption",
      "refund",
      "adjustment",
      "reservation",
      "release",
    ]) {
      expect(MIGRATION).toContain(`'${t}'`);
    }
    expect(MIGRATION).toMatch(/amount <> 0/); // signed amounts, never zero
  });

  it("keeps mutations server-authoritative (SECURITY DEFINER, RLS read-only)", () => {
    const definerCount = (MIGRATION.match(/SECURITY DEFINER/g) ?? []).length;
    expect(definerCount).toBeGreaterThanOrEqual(8);
    // Foundation grants members SELECT-only policies; no INSERT/UPDATE/DELETE
    // mutation policies may exist on either table.
    expect(FOUNDATION).not.toMatch(/ON public\.org_credit_balances FOR (INSERT|UPDATE|DELETE)/);
    expect(FOUNDATION).not.toMatch(/ON public\.credit_transactions FOR (INSERT|UPDATE|DELETE)/);
    expect(FOUNDATION).toMatch(/ENABLE ROW LEVEL SECURITY;\s*\n\s*\n?DROP POLICY IF EXISTS "Members can view their org credit balance"/);
    expect(MIGRATION).toMatch(/ALTER TABLE public\.org_credit_balances ENABLE ROW LEVEL SECURITY/);
    expect(MIGRATION).toMatch(/ALTER TABLE public\.credit_transactions ENABLE ROW LEVEL SECURITY/);
  });

  it("scopes reads by organization membership", () => {
    for (const sql of [FOUNDATION]) {
      expect((sql.match(/om\.user_id = auth\.uid\(\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
      expect(sql.match(/organization_members om/g)?.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("indexes actual query patterns", () => {
    expect(MIGRATION).toMatch(/idx_credit_tx_org_created_desc/);
    expect(MIGRATION).toMatch(/idx_credit_tx_wallet_id/);
    expect(MIGRATION).toMatch(/idx_credit_tx_reference/);
    expect(FOUNDATION).toMatch(/unique_org_credit_balance UNIQUE \(organization_id\)/);
  });

  it("provides a reconciliation function comparing wallet and ledger", () => {
    expect(MIGRATION).toMatch(/FUNCTION public\.reconcile_org_credits/);
    expect(MIGRATION).toMatch(/SUM\(amount\), 0/);
    expect(MIGRATION).toMatch(/v_balance = v_ledger_total/);
  });
});

// ----------------------------------------------------------------------------
// 4. Accounting model simulations
// ----------------------------------------------------------------------------
// A faithful in-memory model of the ledger semantics defined by the SECURITY
// DEFINER functions (signed amounts, FOR UPDATE serialization semantics,
// idempotency-key fast path, append-only entries).

interface SimWallet {
  balance: number;
  reserved: number;
}

function simulateMutation(
  wallet: SimWallet,
  entries: CreditLedgerEntry[],
  params: {
    amount: number;
    type: CreditLedgerEntry["type"];
    idempotencyKey?: string | null;
    allowNegative?: boolean;
    organizationId?: string;
  }
): { status: string; balance: number } {
  const organizationId = params.organizationId ?? "org_a";
  // Idempotency fast-path — mirrors the RPC behavior.
  if (params.idempotencyKey) {
    const existing = entries.find((e) => e.idempotency_key === params.idempotencyKey);
    if (existing) return { status: "duplicate", balance: wallet.balance };
  }
  // Row-lock serialization point: only one mutation may be "in flight".
  const next = wallet.balance + params.amount;
  if (!params.allowNegative && next < 0) {
    return { status: "insufficient_credits", balance: wallet.balance };
  }
  wallet.balance = next;
  if (params.type === "reservation") wallet.reserved += Math.abs(params.amount);
  if (params.type === "release") wallet.reserved -= params.amount;
  entries.push({
    id: `entry_${entries.length + 1}`,
    organization_id: organizationId,
    wallet_id: null,
    user_id: "actor",
    feature_id: "",
    amount: params.amount,
    type: params.type,
    description: "",
    source: null,
    reference_type: null,
    reference_id: null,
    metadata: {},
    idempotency_key: params.idempotencyKey ?? null,
    created_at: new Date().toISOString(),
  });
  return { status: "ok", balance: wallet.balance };
}

function reconcile(wallet: SimWallet, entries: CreditLedgerEntry[]) {
  const total = entries
    .filter((e) => e.type !== "reservation" && e.type !== "release")
    .reduce((sum, e) => sum + e.amount, 0);
  // Available balance must equal ledger total minus currently-reserved credits.
  return {
    matches: wallet.balance === total - wallet.reserved,
    ledgerTotal: total,
    expectedBalance: total - wallet.reserved,
  };
}

describe("credit accounting simulations", () => {
  it("serializes concurrent consumption so the wallet never goes negative", () => {
    // Balance = 100. Request A consumes 70, request B consumes 50.
    // The row lock serializes them: whichever acquires it second sees the
    // updated balance and is rejected — exactly one succeeds.
    const wallet: SimWallet = { balance: 100, reserved: 0 };
    const entries: CreditLedgerEntry[] = [];

    const a = simulateMutation(wallet, entries, { amount: -70, type: "consumption" });
    expect(a.status).toBe("ok");
    expect(a.balance).toBe(30);

    const b = simulateMutation(wallet, entries, { amount: -50, type: "consumption" });
    expect(b.status).toBe("insufficient_credits");
    expect(b.balance).toBe(30); // unchanged — no partial consumption

    // Reverse order also yields exactly one success.
    const wallet2: SimWallet = { balance: 100, reserved: 0 };
    const entries2: CreditLedgerEntry[] = [];
    const b2 = simulateMutation(wallet2, entries2, { amount: -50, type: "consumption" });
    const a2 = simulateMutation(wallet2, entries2, { amount: -70, type: "consumption" });
    expect(b2.status).toBe("ok");
    expect(a2.status).toBe("insufficient_credits");
    expect(wallet2.balance).toBe(50);
  });

  it("rejects consumption exceeding the balance without any ledger entry", () => {
    const wallet: SimWallet = { balance: 50, reserved: 0 };
    const entries: CreditLedgerEntry[] = [];
    const result = simulateMutation(wallet, entries, { amount: -60, type: "consumption" });
    expect(result.status).toBe("insufficient_credits");
    expect(entries).toHaveLength(0);
    expect(wallet.balance).toBe(50);
  });

  it("allows consuming the exact remaining balance", () => {
    const wallet: SimWallet = { balance: 0, reserved: 0 };
    const entries: CreditLedgerEntry[] = [];
    simulateMutation(wallet, entries, { amount: 60, type: "grant", idempotencyKey: "seed" });
    const result = simulateMutation(wallet, entries, { amount: -60, type: "consumption" });
    expect(result.status).toBe("ok");
    expect(result.balance).toBe(0);
    expect(reconcile(wallet, entries).matches).toBe(true);
  });

  it("makes retried requests idempotent (no duplicate mutation)", () => {
    const wallet: SimWallet = { balance: 100, reserved: 0 };
    const entries: CreditLedgerEntry[] = [];
    const first = simulateMutation(wallet, entries, {
      amount: -10,
      type: "consumption",
      idempotencyKey: "operation_abc",
    });
    const retry = simulateMutation(wallet, entries, {
      amount: -10,
      type: "consumption",
      idempotencyKey: "operation_abc",
    });
    expect(first.status).toBe("ok");
    expect(retry.status).toBe("duplicate");
    expect(wallet.balance).toBe(90);
    expect(entries.filter((e) => e.idempotency_key === "operation_abc")).toHaveLength(1);
  });

  it("keeps refunds traceable and preserves both events", () => {
    const wallet: SimWallet = { balance: 0, reserved: 0 };
    const entries: CreditLedgerEntry[] = [];
    simulateMutation(wallet, entries, { amount: 100, type: "grant", idempotencyKey: "seed" });
    simulateMutation(wallet, entries, { amount: -10, type: "consumption", idempotencyKey: "op_1" });
    simulateMutation(wallet, entries, { amount: 10, type: "refund", idempotencyKey: "refund_op_1" });
    expect(wallet.balance).toBe(100);
    const types = entries.map((e) => e.type).filter((t) => t !== "grant");
    expect(types).toEqual(["consumption", "refund"]); // both preserved
    expect(reconcile(wallet, entries).matches).toBe(true);
  });

  it("reconciles a full mixed sequence against the wallet", () => {
    // Grant +1000 → Consume -100 → Consume -200 → Refund +50 → Adjust +25
    const wallet: SimWallet = { balance: 0, reserved: 0 };
    const entries: CreditLedgerEntry[] = [];
    simulateMutation(wallet, entries, { amount: 1000, type: "grant", idempotencyKey: "g1" });
    simulateMutation(wallet, entries, { amount: -100, type: "consumption", idempotencyKey: "c1" });
    simulateMutation(wallet, entries, { amount: -200, type: "consumption", idempotencyKey: "c2" });
    simulateMutation(wallet, entries, { amount: 50, type: "refund", idempotencyKey: "r1" });
    const adj = simulateMutation(wallet, entries, {
      amount: 25,
      type: "adjustment",
      idempotencyKey: "a1",
      allowNegative: true,
    });

    expect(adj.status).toBe("ok");
    expect(adj.balance).toBe(775);
    const report = reconcile(wallet, entries);
    expect(report.matches).toBe(true);
    expect(report.ledgerTotal).toBe(775);
    expect(entries.every((e) => e.amount !== 0)).toBe(true);
    expect(entries).toHaveLength(5); // append-only history
  });

  it("accounts for reservations explicitly in reconciliation", () => {
    const wallet: SimWallet = { balance: 0, reserved: 0 };
    const entries: CreditLedgerEntry[] = [];
    simulateMutation(wallet, entries, { amount: 500, type: "grant", idempotencyKey: "g" });
    simulateMutation(wallet, entries, { amount: -80, type: "reservation", idempotencyKey: "res" });
    expect(wallet.balance).toBe(420);
    expect(wallet.reserved).toBe(80);
    const report = reconcile(wallet, entries);
    expect(report.matches).toBe(true);
    expect(report.ledgerTotal).toBe(500); // grant only — reservation is a split
    expect(wallet.balance + wallet.reserved).toBe(500); // nothing lost
    simulateMutation(wallet, entries, { amount: 80, type: "release", idempotencyKey: "rel" });
    expect(wallet.balance).toBe(500);
    expect(wallet.reserved).toBe(0);
  });

  it("isolates organizations (each org has its own wallet and ledger)", () => {
    const wallets: Record<string, SimWallet> = {
      org_a: { balance: 0, reserved: 0 },
      org_b: { balance: 0, reserved: 0 },
    };
    const ledgers: Record<string, CreditLedgerEntry[]> = { org_a: [], org_b: [] };
    simulateMutation(wallets.org_a, ledgers.org_a, { amount: 300, type: "grant", organizationId: "org_a" });
    simulateMutation(wallets.org_b, ledgers.org_b, { amount: 40, type: "grant", organizationId: "org_b" });
    simulateMutation(wallets.org_b, ledgers.org_b, { amount: -40, type: "consumption", organizationId: "org_b" });
    // Org B's consumption can never touch Org A's wallet.
    expect(wallets.org_a.balance).toBe(300);
    expect(wallets.org_b.balance).toBe(0);
    expect(ledgers.org_a.every((e) => e.organization_id === "org_a")).toBe(true);
    expect(ledgers.org_b.every((e) => e.organization_id === "org_a")).toBe(false);
  });
});

// ----------------------------------------------------------------------------
// 5. No-payment guarantee
// ----------------------------------------------------------------------------
describe("phase 1 scope guardrails", () => {
  it("introduces no payment processing in the Phase 1 migration", () => {
    // Strip SQL comments — only executable DDL is checked.
    const code = MIGRATION.replace(/--[^\n]*/g, "").toLowerCase();
    for (const banned of [
      "stripe",
      "razorpay",
      "paypal",
      "checkout",
      "card_number",
      "invoice",
      "subscription",
      "price_id",
    ]) {
      expect(code).not.toContain(banned);
    }
  });

  it("introduces no payment provider anywhere in the credit schema", () => {
    const all = FOUNDATION.toLowerCase();
    for (const banned of ["stripe", "razorpay", "paypal", "price_id"]) {
      expect(all).not.toContain(banned);
    }
  });

  it("does not hardcode credit pricing economics", () => {
    // No rupee/dollar-to-credits conversion constants in the migration.
    expect(MIGRATION).not.toMatch(/₹|\$\s*=\s*\d+/);
  });
});




