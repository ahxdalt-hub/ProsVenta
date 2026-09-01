// ============================================================================
// Prosventa Intelligence Orchestrator — Unit Tests (pure modules)
// Stage 6 — Phase 6: Intelligence Orchestration
// ============================================================================
import { describe, it, expect } from "vitest";
import {
  canRunOperation,
  summarizeOperations,
  PIPELINE_OPERATIONS,
} from "./operations";
import {
  derivePipelineState,
  derivePipelineProgress,
  decideQueueRun,
  toUiProcessingState,
  STALE_PROCESSING_MS,
} from "./state";

describe("operations dependency graph", () => {
  it("blocks recommendations until scoring succeeded", () => {
    expect(canRunOperation("recommendation_generation", {})).toBe(false);
    expect(
      canRunOperation("recommendation_generation", {
        scoring: { outcome: "failed", attempts: 1 },
      })
    ).toBe(false);
    expect(
      canRunOperation("recommendation_generation", {
        scoring: { outcome: "success", attempts: 1 },
      })
    ).toBe(true);
  });

  it("lets scoring continue when enrichment was skipped or failed", () => {
    expect(canRunOperation("scoring", {})).toBe(true);
    expect(
      canRunOperation("scoring", {
        company_enrichment: { outcome: "failed", attempts: 2 },
        person_enrichment: { outcome: "skipped", attempts: 1 },
      })
    ).toBe(true);
  });

  it("defines every operation with stable ids", () => {
    expect(PIPELINE_OPERATIONS).toContain("company_enrichment");
    expect(PIPELINE_OPERATIONS).toContain("recommendation_generation");
  });

  it("summarizes operation outcomes honestly", () => {
    expect(
      summarizeOperations({
        company_enrichment: { outcome: "success", attempts: 1 },
        person_enrichment: { outcome: "skipped", attempts: 1 },
        signal_detection: { outcome: "failed", attempts: 3 },
      })
    ).toEqual({ succeeded: 1, failed: 1, skipped: 1 });
  });
});

describe("pipeline state derivation", () => {
  it("maps physical statuses to logical states", () => {
    expect(derivePipelineState("pending", null)).toBe("queued");
    expect(derivePipelineState("processing", null)).toBe("processing");
  });

  it("uses the recorded final state for completed runs", () => {
    expect(
      derivePipelineState("completed", { finalState: "completed" })
    ).toBe("completed");
    expect(
      derivePipelineState("completed", { finalState: "partially_completed" })
    ).toBe("partially_completed");
  });

  it("derives partial completion from operation outcomes", () => {
    const metadata = {
      operations: {
        company_enrichment: { outcome: "success" },
        signal_detection: { outcome: "skipped", reason: "not_configured" },
      },
    };
    expect(derivePipelineState("completed", metadata)).toBe("partially_completed");
  });

  it("treats all-failed runs as failed, mixed runs as partial", () => {
    const allFailed = {
      operations: { scoring: { outcome: "failed" }, signal_detection: { outcome: "failed" } },
    };
    expect(derivePipelineState("failed", allFailed)).toBe("failed");

    const mixed = {
      operations: { scoring: { outcome: "success" }, signal_detection: { outcome: "failed" } },
    };
    expect(derivePipelineState("failed", mixed)).toBe("partially_completed");
  });

  it("maps logical states to compact UI indicators", () => {
    expect(toUiProcessingState("queued")).toBe("processing");
    expect(toUiProcessingState("completed")).toBe("ready");
    expect(toUiProcessingState("partially_completed")).toBe("partial");
    expect(toUiProcessingState("failed")).toBe("attention");
  });
});

describe("progress derivation", () => {
  it("shows only real outcomes — nothing faked mid-run", () => {
    const steps = derivePipelineProgress(
      { operations: { company_enrichment: { outcome: "success" } } },
      true
    );
    expect(steps[0].marker).toBe("done");
    expect(steps[1].marker).toBe("active"); // next unfinished step
    expect(steps[steps.length - 1].marker).toBe("pending");
  });

  it("marks unavailable operations as skipped, not failed", () => {
    const steps = derivePipelineProgress(
      { operations: { signal_detection: { outcome: "skipped", reason: "not_configured" } } },
      false
    );
    expect(steps.find((s) => s.id === "signal_detection")?.marker).toBe("skipped");
  });
});

describe("idempotency & stale recovery", () => {
  const now = Date.now();

  it("never queues when an active run exists", () => {
    const decision = decideQueueRun(
      [{ id: "a", status: "processing", started_at: new Date(now).toISOString(), updated_at: null }],
      now
    );
    expect(decision.queue).toBe(false);
  });

  it("allows queueing after completed/failed runs", () => {
    const decision = decideQueueRun([
      { id: "a", status: "completed", started_at: null, updated_at: null },
      { id: "b", status: "failed", started_at: null, updated_at: null },
    ], now);
    expect(decision.queue).toBe(true);
  });

  it("recovers abandoned processing runs instead of blocking forever", () => {
    const staleStartedAt = new Date(now - STALE_PROCESSING_MS - 60_000).toISOString();
    const decision = decideQueueRun(
      [{ id: "a", status: "processing", started_at: staleStartedAt, updated_at: null }],
      now
    );
    expect(decision.queue).toBe(true);
    expect(decision.staleRunIds).toEqual(["a"]);
  });

  it("treats a fresh pending run as blocking", () => {
    const decision = decideQueueRun(
      [{ id: "a", status: "pending", started_at: null, updated_at: new Date(now).toISOString() }],
      now
    );
    expect(decision.queue).toBe(false);
    expect(decision.staleRunIds).toEqual([]);
  });
});
