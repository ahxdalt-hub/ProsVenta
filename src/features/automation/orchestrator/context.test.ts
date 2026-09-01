// ============================================================================
// Prosventa Automation Orchestrator — Context & Idempotency Tests
// Stage 7 — Phase 4
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  buildAutomationContext,
  extractResultReference,
  getReferencedValue,
  recordStepInContext,
  summarizeStepOutput,
} from "./context";
import {
  buildExecutionIdempotencyKey,
  buildStepIdempotencyKey,
} from "./idempotency";

describe("execution context", () => {
  it("builds a normalized context with only scalar trigger payload", () => {
    const ctx = buildAutomationContext({
      organizationId: "org-1",
      playbookId: "pb-1",
      executionId: "ex-1",
      eventId: "evt-1",
      eventType: "prospect.score.updated",
      reason: "score increased",
      targetType: "prospect",
      targetId: "prospect-1",
      targetName: "Acme Corp",
      payload: { previous_score: 68, new_score: 84, huge: { blob: "x".repeat(5000) } },
    });
    expect(ctx.organization_id).toBe("org-1");
    expect(ctx.trigger_payload.new_score).toBe(84);
    // Non-scalar payload values are NOT copied into the context.
    expect(ctx.trigger_payload.huge).toBeUndefined();
    expect(ctx.trigger_event?.reason).toBe("score increased");
  });

  it("extracts cross-table references and keeps executions lightweight", () => {
    const ref = extractResultReference({ taskId: "task-9", note: "hello" });
    expect(ref).toEqual({ task_id: "task-9" });
  });

  it("summarizes output and truncates oversized values", () => {
    const summary = summarizeStepOutput("success", { score: 84, blob: "y".repeat(5000) });
    expect(summary.result).toBe("success");
    expect(summary.output.score).toBe(84);
    expect(String(summary.output.blob).length).toBeLessThanOrEqual(2000);
  });

  it("lets a later step consume an earlier step's output", () => {
    const base = buildAutomationContext({
      organizationId: "o",
      playbookId: "p",
      executionId: "e",
      eventId: "evt",
      eventType: "x",
      targetType: "prospect",
      targetId: null,
      targetName: null,
      payload: {},
    });
    const withResult = recordStepInContext(
      base,
      0,
      summarizeStepOutput("success", { score: 84, taskId: "task-1" })
    );
    expect(getReferencedValue(withResult, "score")).toBe(84);
    expect(getReferencedValue(withResult, "task_id")).toBe("task-1");
    expect(getReferencedValue(withResult, "taskId")).toBe("task-1");
  });

  it("does not leak previous outputs when a step failed", () => {
    const base = buildAutomationContext({
      organizationId: "o",
      playbookId: "p",
      executionId: "e",
      eventId: "evt",
      eventType: "x",
      targetType: "prospect",
      targetId: null,
      targetName: null,
      payload: {},
    });
    const ctx = recordStepInContext(base, 0, summarizeStepOutput("failed", { score: 999 }));
    expect(getReferencedValue(ctx, "score")).toBeNull();
  });
});

describe("idempotency keys", () => {
  it("produces a stable execution key for the same occurrence", () => {
    const base = {
      organizationId: "org-1",
      playbookId: "pb-1",
      playbookVersion: 1,
      triggerEventId: "evt-1",
      targetType: "prospect",
      targetId: "prospect-1",
    };
    expect(buildExecutionIdempotencyKey(base)).toBe(buildExecutionIdempotencyKey(base));
    expect(buildExecutionIdempotencyKey(base)).not.toBe(
      buildExecutionIdempotencyKey({ ...base, triggerEventId: "evt-2" })
    );
  });

  it("distinguishes different targets", () => {
    const a = buildExecutionIdempotencyKey({
      organizationId: "o", playbookId: "p", playbookVersion: 1,
      triggerEventId: "e", targetType: "prospect", targetId: "pa",
    });
    const b = buildExecutionIdempotencyKey({
      organizationId: "o", playbookId: "p", playbookVersion: 1,
      triggerEventId: "e", targetType: "prospect", targetId: "pb",
    });
    expect(a).not.toBe(b);
  });

  it("produces a stable step key within an execution", () => {
    const key = buildStepIdempotencyKey({ executionId: "ex-1", stepIndex: 2, actionType: "create_task" });
    expect(key).toBe(buildStepIdempotencyKey({ executionId: "ex-1", stepIndex: 2, actionType: "create_task" }));
    expect(key).not.toBe(
      buildStepIdempotencyKey({ executionId: "ex-1", stepIndex: 3, actionType: "create_task" })
    );
  });

  it("isolates step keys across executions", () => {
    expect(buildStepIdempotencyKey({ executionId: "a", stepIndex: 0, actionType: "t" })).not.toBe(
      buildStepIdempotencyKey({ executionId: "b", stepIndex: 0, actionType: "t" })
    );
  });
});