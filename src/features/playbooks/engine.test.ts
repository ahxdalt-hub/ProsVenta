// ============================================================================
// Prosventa Playbook Engine — Pure Logic Tests
// Stage 7 — Phase 3
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  buildPreview,
  formatConditions,
  isSupportedTrigger,
  recommendPlaybookCategory,
  validatePlaybook,
} from "./engine";
import { STARTER_PLAYBOOKS } from "./starters";
import type { PlaybookStepInput } from "./types";

const validStep = (): PlaybookStepInput => ({
  action_type: "create_task",
  title: "Review",
  config: {},
});

describe("validatePlaybook", () => {
  it("accepts a complete playbook", () => {
    const result = validatePlaybook({
      name: "High Intent Review",
      category: "high_intent",
      trigger_type: "prospect.score.updated",
      conditions: [{ field: "icp_score", operator: "greater_than_or_equal", value: 75 }],
      steps: [validStep()],
    });
    expect(result.valid).toBe(true);
    expect(result.problems).toHaveLength(0);
  });

  it("rejects a missing name", () => {
    const result = validatePlaybook({
      name: "   ",
      category: "high_intent",
      trigger_type: "prospect.created",
      conditions: [],
      steps: [validStep()],
    });
    expect(result.valid).toBe(false);
    expect(result.problems.join(" ")).toContain("name");
  });

  it("rejects an unregistered trigger", () => {
    const result = validatePlaybook({
      name: "X",
      category: "high_intent",
      trigger_type: "not.a.real.event",
      conditions: [],
      steps: [validStep()],
    });
    expect(result.valid).toBe(false);
    expect(result.problems.join(" ")).toContain("trigger");
  });

  it("rejects zero steps", () => {
    const result = validatePlaybook({
      name: "X",
      category: "high_intent",
      trigger_type: "prospect.created",
      conditions: [],
      steps: [],
    });
    expect(result.valid).toBe(false);
    expect(result.problems.join(" ")).toContain("at least one step");
  });

  it("rejects unsupported action types", () => {
    const result = validatePlaybook({
      name: "X",
      category: "high_intent",
      trigger_type: "prospect.created",
      conditions: [],
      steps: [{ action_type: "send_cold_email" as never }],
    });
    expect(result.valid).toBe(false);
    expect(result.problems.join(" ")).toContain("not a supported action");
  });

  it("rejects add_to_saved_list without a list", () => {
    const result = validatePlaybook({
      name: "X",
      category: "high_intent",
      trigger_type: "prospect.created",
      conditions: [],
      steps: [{ action_type: "add_to_saved_list", config: {} }],
    });
    expect(result.valid).toBe(false);
    expect(result.problems.join(" ")).toContain("saved list");
  });

  it("rejects numeric comparisons with non-numeric values", () => {
    const result = validatePlaybook({
      name: "X",
      category: "high_intent",
      trigger_type: "prospect.created",
      conditions: [{ field: "icp_score", operator: "greater_than", value: "high" }],
      steps: [validStep()],
    });
    expect(result.valid).toBe(false);
  });

  it("validates every starter playbook", () => {
    for (const starter of STARTER_PLAYBOOKS) {
      const result = validatePlaybook(starter);
      if (!result.valid) {
        throw new Error(`Starter "${starter.name}" invalid: ${result.problems.join("; ")}`);
      }
      expect(result.valid).toBe(true);
    }
  });
});

describe("isSupportedTrigger / preview", () => {
  it("recognizes Phase 2 registered events and legacy triggers", () => {
    expect(isSupportedTrigger("prospect.created")).toBe(true);
    expect(isSupportedTrigger("score_threshold_crossed")).toBe(true);
    expect(isSupportedTrigger("made.up.event")).toBe(false);
  });

  it("builds a human-readable preview and hides disabled steps", () => {
    const preview = buildPreview({
      name: "Test",
      trigger_type: "prospect.score.updated",
      conditions: [{ field: "icp_score", operator: "greater_than_or_equal", value: 75 }],
      steps: [
        { action_type: "create_task", title: "Follow up" },
        { action_type: "create_notification", enabled: false },
      ],
    });
    expect(preview.triggerLabel).not.toContain("_");
    expect(preview.conditionText).toContain("ICP score");
    expect(preview.steps).toHaveLength(1);
    expect(preview.steps[0].title).toBe("Follow up");
  });

  it("formats no-condition case in plain language", () => {
    expect(formatConditions([])).toContain("Any prospect");
  });
});

describe("recommendPlaybookCategory (deterministic rules)", () => {
  it("recommends high_intent for strong ICP scores", () => {
    const rec = recommendPlaybookCategory({ icpScore: 91 });
    expect(rec.category).toBe("high_intent");
    expect(rec.reason).toContain("91");
  });

  it("recommends signal_response on signals before status rules", () => {
    const rec = recommendPlaybookCategory({ icpScore: 40, signalType: "Funding" });
    expect(rec.category).toBe("signal_response");
  });

  it("recommends new_prospect for brand-new prospects", () => {
    const rec = recommendPlaybookCategory({ prospectStatus: "new" });
    expect(rec.category).toBe("new_prospect");
  });

  it("returns null when nothing confidently applies — never invents one", () => {
    const rec = recommendPlaybookCategory({ icpScore: 10, prospectStatus: "customer" });
    expect(rec.category).toBeNull();
    expect(rec.reason).toBeNull();
  });
});
