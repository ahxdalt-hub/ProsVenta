import { describe, it, expect } from "vitest";

// ============================================================================
// Stage 8 Phase 5 — UI configuration & financial UX helper tests
// Pure logic only; no network, no DB.
// ============================================================================

import {
  getCreditHealth,
  formatCredits,
  formatSignedCredits,
  requiresConfirmation,
  estimateBatch,
  ledgerTypeLabel,
  purchaseStatusCategory,
} from "./ui-config";

describe("getCreditHealth", () => {
  it("classifies empty balances", () => {
    expect(getCreditHealth({ balance: 0 })).toBe("empty");
    expect(getCreditHealth({ balance: -5 })).toBe("empty");
    expect(getCreditHealth({ balance: NaN })).toBe("empty");
  });

  it("uses configured ratios against the monthly allowance", () => {
    // allowance 1000 → low < 200, critical < 50
    expect(getCreditHealth({ balance: 900, monthlyAllowance: 1000 })).toBe("healthy");
    expect(getCreditHealth({ balance: 199, monthlyAllowance: 1000 })).toBe("low");
    expect(getCreditHealth({ balance: 49, monthlyAllowance: 1000 })).toBe("critical");
  });

  it("falls back to absolute thresholds without an allowance", () => {
    expect(getCreditHealth({ balance: 500 })).toBe("healthy");
    expect(getCreditHealth({ balance: 40 })).toBe("low");
    expect(getCreditHealth({ balance: 8 })).toBe("critical");
  });
});

describe("formatting", () => {
  it("formats whole credits with separators", () => {
    expect(formatCredits(5240)).toBe("5,240");
    expect(formatCredits(0)).toBe("0");
    expect(formatCredits(1000000)).toBe("1,000,000");
  });

  it("formats signed ledger amounts", () => {
    expect(formatSignedCredits(10000)).toBe("+10,000");
    expect(formatSignedCredits(-50)).toBe("-50");
    expect(formatSignedCredits(0)).toBe("0");
  });
});

describe("requiresConfirmation", () => {
  it("only confirms high-cost operations", () => {
    expect(requiresConfirmation(3)).toBe(false);
    expect(requiresConfirmation(19)).toBe(false);
    expect(requiresConfirmation(20)).toBe(true);
    expect(requiresConfirmation(250)).toBe(true);
  });
});

describe("estimateBatch", () => {
  it("computes affordable batch estimates", () => {
    const est = estimateBatch({ unitCost: 5, quantity: 50, balance: 5240 });
    expect(est.estimatedCost).toBe(250);
    expect(est.affordable).toBe(true);
    expect(est.shortfall).toBe(0);
    expect(est.affordableQuantity).toBe(50);
  });

  it("detects shortfalls and partial affordability", () => {
    const est = estimateBatch({ unitCost: 5, quantity: 50, balance: 132 });
    expect(est.estimatedCost).toBe(250);
    expect(est.affordable).toBe(false);
    expect(est.shortfall).toBe(118);
    expect(est.affordableQuantity).toBe(26); // floor(132/5)
  });

  it("handles zero-cost operations safely", () => {
    const est = estimateBatch({ unitCost: 0, quantity: 10, balance: 0 });
    expect(est.estimatedCost).toBe(0);
    expect(est.affordable).toBe(true);
  });
});

describe("ledgerTypeLabel", () => {
  it("maps transaction types to calm customer copy", () => {
    expect(ledgerTypeLabel("purchase")).toBe("Credit purchase");
    expect(ledgerTypeLabel("consumption")).toBe("Usage");
    expect(ledgerTypeLabel("refund")).toBe("Refund");
    expect(ledgerTypeLabel("expiration")).toBe("Credits expired");
    expect(ledgerTypeLabel("unknown_type")).toBe("Credit activity");
  });
});

describe("purchaseStatusCategory", () => {
  it("maps every authoritative status to exactly one presentation state", () => {
    expect(purchaseStatusCategory("pending")).toBe("pending");
    expect(purchaseStatusCategory("processing")).toBe("processing");
    expect(purchaseStatusCategory("paid")).toBe("confirmed");
    expect(purchaseStatusCategory("refunded")).toBe("confirmed");
    expect(purchaseStatusCategory("failed")).toBe("failed");
    expect(purchaseStatusCategory("cancelled")).toBe("cancelled");
    expect(purchaseStatusCategory("expired")).toBe("cancelled");
    // Unknown statuses fail safe to pending (never shown as success).
    expect(purchaseStatusCategory("mystery")).toBe("pending");
  });
});
