// ============================================================================
// Prosventa Credits — Operation Catalog & Billing Logic Tests
// Stage 8 — Phase 2: Credit Consumption + Usage Tracking
// ============================================================================
// Pure-logic coverage (no DB / network): catalog integrity, preflight
// arithmetic (single + batch + exact balance), idempotency key stability /
// windowing, and controlled usage transitions.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  BILLABLE_OPERATION_KEYS,
  CREDIT_OPERATION_CATALOG,
  getCreditOperation,
  buildOperationIdempotencyKey,
  computePreflight,
  isValidUsageTransition,
  USAGE_STATUS_TRANSITIONS,
} from "./operations";

describe("CreditOperationCatalog", () => {
  it("contains only real, implemented billable operations", () => {
    const expected = [
      "company_enrichment",
      "prospect_enrichment",
      "company_research",
      "prospect_research",
      "signal_refresh",
      "automation_execution",
    ];
    expect(Object.keys(CREDIT_OPERATION_CATALOG).sort()).toEqual(expected.sort());
    for (const key of expected) {
      expect(CREDIT_OPERATION_CATALOG[key as keyof typeof CREDIT_OPERATION_CATALOG].enabled).toBe(true);
    }
    expect(BILLABLE_OPERATION_KEYS.length).toBe(expected.length);
  });

  it("uses stable snake_case operation keys (never UI labels)", () => {
    for (const op of Object.values(CREDIT_OPERATION_CATALOG)) {
      expect(op.key).toMatch(/^[a-z]+(_[a-z]+)*$/);
      expect(op.displayName.length).toBeGreaterThan(0);
      expect(op.description.length).toBeGreaterThan(0);
    }
  });

  it("has positive whole-credit dev/test costs in valid categories", () => {
    const categories = new Set(["enrichment", "research", "signals", "automation", "other"]);
    for (const op of Object.values(CREDIT_OPERATION_CATALOG)) {
      expect(Number.isInteger(op.cost)).toBe(true);
      expect(op.cost).toBeGreaterThan(0);
      expect(categories.has(op.category)).toBe(true);
    }
  });

  it("resolves operations by key with a stable cost", () => {
    const research = getCreditOperation("prospect_research");
    expect(research.key).toBe("prospect_research");
    expect(research.cost).toBe(getCreditOperation("prospect_research").cost);
  });
});

describe("computePreflight — consumption checks", () => {
  it("READY with sufficient balance", () => {
    expect(computePreflight({ unitCost: 5, available: 100 })).toEqual({
      status: "READY",
      estimatedCost: 5,
      available: 100,
      shortfall: 0,
    });
  });

  it("READY at exact balance (concurrency-safe boundary)", () => {
    const result = computePreflight({ unitCost: 100, available: 100 });
    expect(result.status).toBe("READY");
    expect(result.shortfall).toBe(0);
  });

  it("INSUFFICIENT_CREDITS below balance requirement", () => {
    const result = computePreflight({ unitCost: 10, available: 9 });
    expect(result.status).toBe("INSUFFICIENT_CREDITS");
    expect(result.shortfall).toBe(1);
  });

  it("zero balance always rejects positive-cost operations", () => {
    const result = computePreflight({ unitCost: 5, available: 0 });
    expect(result.status).toBe("INSUFFICIENT_CREDITS");
    expect(result.shortfall).toBe(5);
  });

  it("rejects invalid costs and quantities (invalid cost defense)", () => {
    expect(() => computePreflight({ unitCost: 0.5, available: 10 })).toThrow();
    expect(() => computePreflight({ unitCost: -3, available: 10 })).toThrow();
    expect(() => computePreflight({ unitCost: 5, quantity: 0, available: 10 })).toThrow();
    expect(() => computePreflight({ unitCost: 5, quantity: 2.5, available: 10 })).toThrow();
  });

  it("batch preflight multiplies honestly (50 × 5 vs available)", () => {
    const ok = computePreflight({ unitCost: 5, quantity: 50, available: 500 });
    expect(ok.status).toBe("READY");
    expect(ok.estimatedCost).toBe(250);

    const rejected = computePreflight({ unitCost: 5, quantity: 50, available: 100 });
    expect(rejected.status).toBe("INSUFFICIENT_CREDITS");
    expect(rejected.shortfall).toBe(150);
  });
});

describe("buildOperationIdempotencyKey — duplicate/retry protection", () => {
  const base = {
    operationKey: "company_enrichment" as const,
    organizationId: "org-1",
    prospectId: "p-1",
  };

  it("is stable for the same logical request within the window", () => {
    const a = buildOperationIdempotencyKey({ ...base, now: 1_000_000 });
    const b = buildOperationIdempotencyKey({ ...base, now: 1_004_999, windowMs: 10_000 });
    expect(a).toBe(b);
  });

  it("changes across the duplicate window (intentional repeat = new charge)", () => {
    const before = buildOperationIdempotencyKey({ ...base, now: 1_000_000, windowMs: 10_000 });
    const after = buildOperationIdempotencyKey({ ...base, now: 1_010_001, windowMs: 10_000 });
    expect(before).not.toBe(after);
  });

  it("distinguishes operations, orgs, prospects and scopes", () => {
    const now = 123_456;
    const same = buildOperationIdempotencyKey({ ...base, scope: "refresh", now });
    expect(same).toBe(buildOperationIdempotencyKey({ ...base, scope: "refresh", now }));
    expect(same).not.toBe(buildOperationIdempotencyKey({ ...base, now })); // different scope
    expect(same).not.toBe(
      buildOperationIdempotencyKey({ ...base, scope: "refresh", now, prospectId: "p-2" })
    );
    expect(same).not.toBe(
      buildOperationIdempotencyKey({ ...base, scope: "refresh", now, organizationId: "org-2" })
    );
  });

  it("falls back to an org-wide key when no prospect applies", () => {
    const k = buildOperationIdempotencyKey({
      operationKey: "automation_execution",
      organizationId: "org-1",
      now: 7,
    });
    expect(k).toContain(":org:");
  });
});

describe("usage record status transitions", () => {
  it("allows only documented lifecycle moves", () => {
    expect(isValidUsageTransition("pending", "completed")).toBe(true);
    expect(isValidUsageTransition("pending", "failed")).toBe(true);
    expect(isValidUsageTransition("pending", "cancelled")).toBe(true);
    expect(isValidUsageTransition("completed", "refunded")).toBe(true);

    // Arbitrary jumps are forbidden.
    expect(isValidUsageTransition("pending", "refunded")).toBe(false);
    expect(isValidUsageTransition("failed", "completed")).toBe(false);
    expect(isValidUsageTransition("completed", "pending")).toBe(false);
    expect(isValidUsageTransition("cancelled", "completed")).toBe(false);
    expect(isValidUsageTransition("refunded", "completed")).toBe(false);
  });

  it("terminal states never transition", () => {
    const statuses = Object.keys(USAGE_STATUS_TRANSITIONS) as Array<
      keyof typeof USAGE_STATUS_TRANSITIONS
    >;
    for (const terminal of ["failed", "refunded", "cancelled"] as const) {
      for (const next of statuses) {
        expect(isValidUsageTransition(terminal, next)).toBe(false);
      }
    }
  });
});


