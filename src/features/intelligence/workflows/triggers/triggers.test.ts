// ============================================================================
// Prosventa Workflow Trigger & Event Engine — Unit Tests
// Stage 7 — Phase 2
// ============================================================================
// Covers the PURE parts of the trigger engine: registry integrity, event
// validation, matching, condition groups (AND/OR), loop protection, rate
// limiting, and dedupe key determinism.
//
// DB/RLS/execution behaviour is enforced by database constraints and the
// existing workflow execution service — not duplicated here.
// ============================================================================

import { describe, it } from "vitest";
import assert from "node:assert/strict";

import {
  WORKFLOW_EVENT_REGISTRY,
  getEnabledEventDefinitions,
  getEventDefinition,
  isRegisteredEventType,
} from "./registry";
import { buildDefaultDedupeKey, validateWorkflowEventInput } from "./validate";
import {
  evaluateConditionSet,
  getMatchingTriggerTypes,
  isLoopSafe,
  isRateLimited,
  MAX_ORIGIN_CHAIN_DEPTH,
} from "./engine";
import type { WorkflowEventInput } from "./types";

function baseInput(overrides?: Partial<WorkflowEventInput>): WorkflowEventInput {
  return {
    eventType: "prospect.score.updated",
    organizationId: "org-1",
    targetType: "prospect",
    targetId: "p-1",
    payload: {
      prospect_id: "p-1",
      previous_score: 62,
      new_score: 81,
      score_category: "strong",
    },
    ...overrides,
  };
}

describe("event registry", () => {
  it("exposes only events with real producers", () => {
    const expected = new Set([
      "prospect.created",
      "prospect.imported",
      "prospect.updated",
      "prospect.deleted",
      "prospect.score.updated",
      "signal.detected",
      "recommendation.generated",
      "intelligence.completed",
      "intelligence.partially_completed",
      "intelligence.failed",
      "workflow.manual_triggered",
    ]);
    assert.equal(Object.keys(WORKFLOW_EVENT_REGISTRY).length, expected.size);
    for (const def of Object.values(WORKFLOW_EVENT_REGISTRY)) {
      assert.ok(expected.has(def.id), `unexpected event ${def.id}`);
      assert.notEqual(def.label, def.id, "labels must be customer-friendly copy");
      assert.ok(Array.isArray(def.payloadFields));
    }
  });

  it("returns enabled definitions for the trigger selector", () => {
    const enabled = getEnabledEventDefinitions();
    assert.ok(enabled.length > 0);
    assert.ok(enabled.every((d) => d.enabled));
  });

  it("rejects unknown event types", () => {
    assert.equal(getEventDefinition("made.up.event"), null);
    assert.equal(isRegisteredEventType("made.up.event"), false);
  });

  it("maps score events to legacy trigger types for compatibility", () => {
    const types = getMatchingTriggerTypes("prospect.score.updated");
    assert.ok(types.includes("score_threshold_crossed"));
    assert.ok(types.includes("high_icp_score"));
    assert.ok(types.includes("prospect.score.updated"));
  });

  it("maps signal events to legacy signal triggers", () => {
    const types = getMatchingTriggerTypes("signal.detected");
    assert.ok(types.includes("high_priority_signal"));
    assert.ok(types.includes("new_company_signal"));
  });
});

describe("event validation", () => {
  it("accepts a valid score-change event", () => {
    const result = validateWorkflowEventInput(baseInput());
    assert.deepEqual(result.errors, []);
    assert.ok(result.valid);
  });

  it("rejects unregistered event types", () => {
    const result = validateWorkflowEventInput(
      baseInput({ eventType: "not.real" as WorkflowEventInput["eventType"] })
    );
    assert.ok(!result.valid);
    assert.match(result.errors[0], /Unknown or disabled event type/);
  });

  it("rejects payloads missing required fields", () => {
    const result = validateWorkflowEventInput(baseInput({ payload: { prospect_id: "p-1" } }));
    assert.ok(!result.valid);
    assert.ok(result.errors.some((e) => e.includes("new_score")));
  });

  it("requires target_id for target-scoped events", () => {
    const result = validateWorkflowEventInput(baseInput({ targetId: null }));
    assert.ok(!result.valid);
  });

  it("allows org-level events without a target", () => {
    const result = validateWorkflowEventInput(
      baseInput({
        eventType: "prospect.imported",
        targetType: "organization",
        targetId: null,
        payload: { imported_count: 5, prospect_ids: ["a", "b"] },
      })
    );
    assert.ok(result.valid);
  });

  it("rejects invalid timestamps", () => {
    const result = validateWorkflowEventInput(baseInput({ occurredAt: "not-a-date" }));
    assert.ok(!result.valid);
  });

  it("rejects future timestamps beyond tolerance", () => {
    const result = validateWorkflowEventInput(
      baseInput({ occurredAt: new Date(Date.now() + 60 * 60_000).toISOString() })
    );
    assert.ok(!result.valid);
  });

  it("rejects secret-like payload keys", () => {
    const result = validateWorkflowEventInput(
      baseInput({ payload: { ...baseInput().payload, api_key: "x" } as never })
    );
    assert.ok(!result.valid);
  });

  it("builds deterministic default dedupe keys", () => {
    const a = buildDefaultDedupeKey("prospect.created", "p-1", "2026-08-24T10:00:00.500Z");
    const b = buildDefaultDedupeKey("prospect.created", "p-1", "2026-08-24T10:00:00.900Z");
    // Same second → same identity; duplicate delivery collapses into one event.
    assert.equal(a, b);
  });
});

describe("condition evaluation (Phase 1 engine reuse + AND/OR groups)", () => {
  const ctx = { new_score: 81, previous_score: 62, industry: "SaaS" };
  const gt = (field: never, value: unknown) =>
    ({ field, operator: "greater_than", value }) as never;
  const eq = (field: never, value: unknown) =>
    ({ field, operator: "equals", value }) as never;

  it("passes flat AND conditions when all hold (Test 3 semantics)", () => {
    const result = evaluateConditionSet([gt("new_score" as never, 75)], null, ctx);
    assert.ok(result.passed);
  });

  it("fails when any flat condition fails (Test 4 semantics)", () => {
    const result = evaluateConditionSet(
      [gt("new_score" as never, 75), eq("industry" as never, "Healthcare")],
      null,
      ctx
    );
    assert.ok(!result.passed);
    assert.equal(result.failedConditions.length, 1);
  });

  it("evaluates 'all' groups with AND inside, groups combined with AND", () => {
    const result = evaluateConditionSet(
      [],
      [
        { mode: "all", conditions: [gt("new_score" as never, 75)] },
        { mode: "all", conditions: [eq("industry" as never, "SaaS")] },
      ],
      ctx
    );
    assert.ok(result.passed);
  });

  it("evaluates 'any' groups with OR inside (signal_type = funding OR hiring)", () => {
    const sigCtx = { signal_type: "hiring" };
    const passed = evaluateConditionSet(
      [],
      [
        {
          mode: "any",
          conditions: [eq("signal_type" as never, "funding"), eq("signal_type" as never, "hiring")],
        },
      ],
      sigCtx
    );
    assert.ok(passed.passed);

    const failed = evaluateConditionSet(
      [],
      [
        {
          mode: "any",
          conditions: [
            eq("signal_type" as never, "funding"),
            eq("signal_type" as never, "partnership"),
          ],
        },
      ],
      sigCtx
    );
    assert.ok(!failed.passed);
  });

  it("supports the documented example: score 81 executes, 54 does not", () => {
    const highFit = evaluateConditionSet(
      [gt("new_score" as never, 75)],
      null,
      { new_score: 54 }
    );
    assert.ok(!highFit.passed);

    const strongFit = evaluateConditionSet(
      [gt("new_score" as never, 75)],
      null,
      { new_score: 81 }
    );
    assert.ok(strongFit.passed);
  });
});

describe("loop protection", () => {
  it("blocks events beyond the max chain depth (Test 16 semantics)", () => {
    assert.ok(
      !isLoopSafe({ originChainDepth: MAX_ORIGIN_CHAIN_DEPTH + 1 }, ["wf-1"]),
      "depth > max must be blocked"
    );
  });

  it("allows legitimate chains within the depth cap", () => {
    assert.ok(isLoopSafe({ originChainDepth: 0 }, []));
    assert.ok(isLoopSafe({ originChainDepth: 1 }, ["wf-2"]));
    assert.ok(isLoopSafe({ originChainDepth: MAX_ORIGIN_CHAIN_DEPTH }, ["wf-2"]));
  });
});

describe("rate limiting", () => {
  it("is not limited below the threshold", () => {
    const now = Date.now();
    assert.ok(!isRateLimited([now - 1000, now - 2000], now, 5));
  });

  it("limits at the threshold within the window", () => {
    const now = Date.now();
    const recent = Array.from({ length: 5 }, (_, i) => now - i * 1000);
    assert.ok(isRateLimited(recent, now, 5));
  });

  it("ignores events outside the rolling window", () => {
    const now = Date.now();
    const old = Array.from({ length: 5 }, (_, i) => now - 120_000 - i * 1000);
    assert.ok(!isRateLimited(old, now, 5));
  });
});

