// ============================================================================
// Prosventa Enrichment — Bulk Model Tests (Phase 3)
// ============================================================================
import { describe, expect, it } from "vitest";

import {
  buildBulkOperationKey,
  computeBulkEstimate,
  computeFinalOperationStatus,
  computeProgressView,
  getProspectEnrichmentUnitCost,
  isRetryableBulkJob,
  isStaleBulkOperation,
  isTerminalOperationStatus,
} from "./bulk";

describe("bulk estimate", () => {
  it("derives unit cost from the central credit catalog (both legs)", () => {
    const unit = getProspectEnrichmentUnitCost();
    expect(unit).toBeGreaterThan(0);
    const estimate = computeBulkEstimate(25);
    expect(estimate.estimatedCost).toBe(unit * 25);
    expect(estimate.prospectCount).toBe(25);
  });

  it("handles zero selections safely", () => {
    expect(computeBulkEstimate(0).estimatedCost).toBe(0);
  });
});

describe("operation idempotency key", () => {
  it("is deterministic regardless of selection order", () => {
    const base = { organizationId: "org-1", userId: "user-1" };
    const a = buildBulkOperationKey({ ...base, prospectIds: ["p1", "p2", "p3"] });
    const b = buildBulkOperationKey({ ...base, prospectIds: ["p3", "p1", "p2"] });
    expect(a).toBe(b);
  });

  it("differs across organizations, users, and selections", () => {
    const ids = ["p1", "p2"];
    const k1 = buildBulkOperationKey({ organizationId: "org-1", userId: "u1", prospectIds: ids });
    const k2 = buildBulkOperationKey({ organizationId: "org-2", userId: "u1", prospectIds: ids });
    const k3 = buildBulkOperationKey({ organizationId: "org-1", userId: "u2", prospectIds: ids });
    const k4 = buildBulkOperationKey({ organizationId: "org-1", userId: "u1", prospectIds: ["p1"] });
    expect(new Set([k1, k2, k3, k4]).size).toBe(4);
  });

  it("deduplicates repeated ids in a double-click payload", () => {
    const base = { organizationId: "o", userId: "u" };
    expect(
      buildBulkOperationKey({ ...base, prospectIds: ["p1", "p1"] })
    ).toBe(buildBulkOperationKey({ ...base, prospectIds: ["p1"] }));
  });
});

describe("final operation status", () => {
  it("all success is completed", () => {
    expect(
      computeFinalOperationStatus({ enriched: 5, partial: 0, skipped: 0, failed: 0, cancelled: 0 })
    ).toBe("completed");
  });

  it("mixed outcomes are partial (bulk ≠ all-or-nothing)", () => {
    expect(
      computeFinalOperationStatus({ enriched: 21, partial: 2, skipped: 1, failed: 1, cancelled: 0 })
    ).toBe("partial");
  });

  it("everything failed is failed", () => {
    expect(
      computeFinalOperationStatus({ enriched: 0, partial: 0, skipped: 0, failed: 3, cancelled: 0 })
    ).toBe("failed");
  });

  it("cancelled-before-work with no failures is cancelled", () => {
    expect(
      computeFinalOperationStatus({ enriched: 0, partial: 0, skipped: 0, failed: 0, cancelled: 6 })
    ).toBe("cancelled");
  });
});

describe("retry eligibility (bounded)", () => {
  it("allows retry within attempt budget for retryable categories", () => {
    expect(
      isRetryableBulkJob({
        status: "failed",
        attemptCount: 1,
        maxAttempts: 2,
        errorCategory: "rate_limited",
      })
    ).toBe(true);
  });

  it("blocks retry when the attempt budget is exhausted", () => {
    expect(
      isRetryableBulkJob({
        status: "failed",
        attemptCount: 2,
        maxAttempts: 2,
        errorCategory: "rate_limited",
      })
    ).toBe(false);
  });

  it("never retries timeouts (double-charge protection)", () => {
    expect(
      isRetryableBulkJob({
        status: "failed",
        attemptCount: 0,
        maxAttempts: 2,
        errorCategory: "timeout",
      })
    ).toBe(false);
  });

  it("only applies to failed jobs", () => {
    expect(
      isRetryableBulkJob({
        status: "completed",
        attemptCount: 0,
        maxAttempts: 2,
        errorCategory: null,
      })
    ).toBe(false);
  });
});

describe("progress view", () => {
  it("computes processed/remaining and completion without inventing time", () => {
    const view = computeProgressView({
      total: 25,
      counters: { enriched: 9, partial: 2, skipped: 1, failed: 0, cancelled: 0 },
      processing: 2,
      queued: 11,
    });
    expect(view.processed).toBe(12);
    expect(view.remaining).toBe(13);
    expect(view.done).toBe(false);
  });

  it("reports done when nothing is queued or processing", () => {
    const view = computeProgressView({
      total: 10,
      counters: { enriched: 8, partial: 1, skipped: 1, failed: 0, cancelled: 0 },
      processing: 0,
      queued: 0,
    });
    expect(view.done).toBe(true);
  });
});

describe("terminal statuses", () => {
  it("recognizes terminal operation states", () => {
    expect(isTerminalOperationStatus("processing")).toBe(false);
    expect(isTerminalOperationStatus("queued")).toBe(false);
    expect(isTerminalOperationStatus("partial")).toBe(true);
    expect(isTerminalOperationStatus("cancelled")).toBe(true);
  });
});

describe("stuck-operation detection", () => {
  const cutoff = "2026-01-01T12:00:00Z";

  it("marks an operation stale when neither it nor any job was touched since the cutoff", () => {
    expect(
      isStaleBulkOperation({
        opUpdatedAt: "2026-01-01T11:00:00Z",
        lastJobUpdatedAt: "2026-01-01T10:30:00Z",
        cutoffIso: cutoff,
      })
    ).toBe(true);
  });

  it("keeps a live run whose jobs are still being updated (slow but alive)", () => {
    expect(
      isStaleBulkOperation({
        opUpdatedAt: "2026-01-01T11:00:00Z",
        lastJobUpdatedAt: "2026-01-01T12:05:00Z",
        cutoffIso: cutoff,
      })
    ).toBe(false);
  });

  it("keeps a live operation row even with no job activity yet", () => {
    expect(
      isStaleBulkOperation({
        opUpdatedAt: "2026-01-01T12:04:00Z",
        lastJobUpdatedAt: null,
        cutoffIso: cutoff,
      })
    ).toBe(false);
  });

  it("never marks an operation stale from missing timestamps alone", () => {
    expect(
      isStaleBulkOperation({ opUpdatedAt: null, lastJobUpdatedAt: null, cutoffIso: cutoff })
    ).toBe(false);
  });

  it("treats unparseable timestamps conservatively as stale evidence, not liveness", () => {
    expect(
      isStaleBulkOperation({
        opUpdatedAt: "not-a-date",
        lastJobUpdatedAt: "2026-01-01T09:00:00Z",
        cutoffIso: cutoff,
      })
    ).toBe(true);
    // …but a valid fresh timestamp always wins.
    expect(
      isStaleBulkOperation({
        opUpdatedAt: "not-a-date",
        lastJobUpdatedAt: "2026-01-01T12:30:00Z",
        cutoffIso: cutoff,
      })
    ).toBe(false);
  });
});
