// ============================================================================
// Prosventa Automation Orchestrator — State Machine Tests
// Stage 7 — Phase 4
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  canTransition,
  classifyFailure,
  isResumable,
  isTerminalState,
  resolveFailureOutcome,
  resolveTransition,
  TERMINAL_STATES,
  TRANSITIONS,
  type ExecutionState,
} from "./state-machine";

describe("state machine transitions", () => {
  it("allows happy path queued → running → completed", () => {
    expect(resolveTransition("queued", "running")).toBe("running");
    expect(resolveTransition("running", "completed")).toBe("completed");
  });

  it("allows failure path running → failed", () => {
    expect(resolveTransition("running", "failed")).toBe("failed");
  });

  it("allows pause and resume", () => {
    expect(resolveTransition("running", "paused")).toBe("paused");
    expect(resolveTransition("paused", "running")).toBe("running");
    expect(resolveTransition("queued", "paused")).toBe("paused");
  });

  it("allows cancellation from queued/running/paused", () => {
    for (const from of ["queued", "running", "paused", "waiting"] as ExecutionState[]) {
      expect(resolveTransition(from, "cancelled")).toBe("cancelled");
    }
  });

  it("rejects invalid transitions", () => {
    expect(resolveTransition("completed", "running")).toBeNull();
    expect(resolveTransition("failed", "running")).toBeNull();
    expect(resolveTransition("cancelled", "running")).toBeNull();
    expect(resolveTransition("running", "queued")).toBeNull();
    expect(resolveTransition("paused", "failed")).toBeNull();
  });

  it("treats only listed states as resumable", () => {
    expect(isResumable("queued")).toBe(true);
    expect(isResumable("running")).toBe(true);
    expect(isResumable("paused")).toBe(false);
    expect(isResumable("completed")).toBe(false);
  });

  it("marks completed/failed/cancelled as terminal", () => {
    for (const state of TERMINAL_STATES) expect(isTerminalState(state)).toBe(true);
    expect(isTerminalState("running")).toBe(false);
  });

  it("declares every state in TRANSITIONS is a valid state", () => {
    for (const to of Object.keys(TRANSITIONS)) {
      expect(canTransition("queued", to as ExecutionState)).toBe(
        TRANSITIONS.queued.includes(to as ExecutionState)
      );
    }
  });
});

describe("failure classification", () => {
  it("treats configuration errors as permanent", () => {
    const c = classifyFailure("invalid configuration: missing list_id");
    expect(c.retryable).toBe(false);
    expect(c.category).toBe("validation_error");
  });

  it("treats provider availability as permanent", () => {
    const c = classifyFailure("Required provider is not configured.");
    expect(c.retryable).toBe(false);
    expect(c.category).toBe("provider_unavailable");
    expect(c.userMessage).toContain("provider");
  });

  it("treats permission errors as permanent", () => {
    const c = classifyFailure("permission denied for table prospects");
    expect(c.retryable).toBe(false);
    expect(c.category).toBe("permission_denied");
  });

  it("treats loop protection as permanent with clear message", () => {
    const c = classifyFailure("maximum automation chain depth reached");
    expect(c.retryable).toBe(false);
    expect(c.category).toBe("loop_protection");
    expect(c.userMessage).toContain("loop");
  });

  it("treats unknown/transient errors as retryable", () => {
    const c = classifyFailure("ECONNRESET");
    expect(c.retryable).toBe(true);
    expect(c.category).toBe("transient_error");
  });
});

describe("failure outcomes", () => {
  it("stops by default for any failure (safest)", () => {
    const outcome = resolveFailureOutcome({ retryable: true, category: "transient_error", userMessage: "" }, 1, "stop");
    expect(outcome.nextExecutionState).toBe("failed");
    expect(outcome.shouldRetry).toBe(false);
  });

  it("honors skip policy", () => {
    const outcome = resolveFailureOutcome({ retryable: true, category: "transient_error", userMessage: "" }, 1, "skip");
    expect(outcome.nextExecutionState).toBe("running");
    expect(outcome.shouldRetry).toBe(false);
  });

  it("bounds retries and never retries permanently", () => {
    const retry = resolveFailureOutcome({ retryable: true, category: "transient_error", userMessage: "" }, 1, "retry");
    expect(retry.shouldRetry).toBe(true);
    const exhausted = resolveFailureOutcome({ retryable: true, category: "transient_error", userMessage: "" }, 3, "retry");
    expect(exhausted.nextExecutionState).toBe("failed");
    const permanent = resolveFailureOutcome({ retryable: false, category: "validation_error", userMessage: "" }, 1, "retry");
    expect(permanent.shouldRetry).toBe(false);
    expect(permanent.nextExecutionState).toBe("failed");
  });
});