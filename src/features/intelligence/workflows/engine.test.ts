// ============================================================================
// Prosventa Intelligence-Powered Workflows — Engine Tests
// Stage 4 — Phase 9: Intelligence-Powered Workflows
// ============================================================================

import {
  evaluateIntelligenceCondition,
  evaluateIntelligenceConditions,
  generateActionPreview,
  generateExecutionPlan,
  buildTriggerEventId,
  isSafeInternalAction,
  isSupportedTrigger,
  isSelfTriggering,
} from "./engine";
import type {
  IntelligenceCondition,
  IntelligenceTriggerEvent,
  IntelligenceAction,
} from "./types";

const baseEvent: IntelligenceTriggerEvent = {
  eventId: "rec-123",
  triggerType: "recommendation_created",
  organizationId: "org-1",
  prospectId: "prospect-1",
  prospectName: "Acme Technologies",
  recommendationId: "rec-123",
  signalId: null,
  scoreId: "score-1",
  context: {
    icp_score: 92,
    recommendation_priority: "high",
    recommendation_type: "review_high_fit",
    company_name: "Acme Technologies",
    domain: "acme.com",
  },
  occurredAt: new Date().toISOString(),
};

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.error(`  ❌ ${name}`);
  }
}

// ============================================================================
// 1. Condition Evaluation
// ============================================================================
console.log("Condition Evaluation:");

// Condition match
check("icp_score > 85 matches (92)", evaluateIntelligenceCondition(
  { field: "icp_score", operator: "greater_than", value: 85 }, baseEvent
));

// Condition mismatch
check("icp_score < 85 does not match", !evaluateIntelligenceCondition(
  { field: "icp_score", operator: "less_than", value: 85 }, baseEvent
));

// Equals on signal importance
check("signal_importance equals high", evaluateIntelligenceCondition(
  { field: "signal_importance", operator: "equals", value: "high" },
  { ...baseEvent, context: { ...baseEvent.context, signal_importance: "high" } }
));

// AND semantics — all match
check("all conditions match (AND)", evaluateIntelligenceConditions([
  { field: "icp_score", operator: "greater_than", value: 85 },
  { field: "recommendation_priority", operator: "equals", value: "high" },
], baseEvent));

// AND semantics — one fails
check("one condition fails → overall fail", !evaluateIntelligenceConditions([
  { field: "icp_score", operator: "greater_than", value: 95 },
  { field: "recommendation_priority", operator: "equals", value: "high" },
], baseEvent));

// Empty conditions
check("empty conditions always true", evaluateIntelligenceConditions([], baseEvent));

// is_set on missing field
check("is_set on missing field is false", !evaluateIntelligenceCondition(
  { field: "signal_confidence", operator: "is_set", value: null }, baseEvent
));

// ============================================================================
// 2. Action Preview
// ============================================================================
console.log("Action Preview:");

const taskPreview = generateActionPreview(
  { type: "create_task", config: { title: "Review Acme" } }, baseEvent
);
check("create_task preview title", taskPreview.title === "Create Task");
check("create_task preview detail", taskPreview.details["Task Title"] === "Review Acme");

const listPreview = generateActionPreview(
  { type: "add_to_saved_list", config: { list_name: "Priority Prospects" } }, baseEvent
);
check("add_to_saved_list preview", listPreview.details["List"] === "Priority Prospects");

// ============================================================================
// 3. Execution Plan
// ============================================================================
console.log("Execution Plan:");

const matchPlan = generateExecutionPlan({
  id: "wf-1",
  name: "High-fit review",
  conditions: [{ field: "icp_score", operator: "greater_than", value: 80 }],
  actions: [{ type: "create_task", config: {} }],
  requires_approval: false,
}, baseEvent);
check("plan conditions match", matchPlan.conditionsMet === true);
check("plan has 1 action", matchPlan.actions.length === 1);

const noMatchPlan = generateExecutionPlan({
  id: "wf-2",
  name: "Strict filter",
  conditions: [{ field: "icp_score", operator: "greater_than", value: 99 }],
  actions: [{ type: "create_task", config: {} }],
  requires_approval: false,
}, baseEvent);
check("plan conditions do not match", noMatchPlan.conditionsMet === false);

// ============================================================================
// 4. Idempotency
// ============================================================================
console.log("Idempotency:");

check("same event → same ID", buildTriggerEventId("recommendation_created", "rec-123") === buildTriggerEventId("recommendation_created", "rec-123"));
check("different events → different IDs", buildTriggerEventId("recommendation_created", "rec-123") !== buildTriggerEventId("recommendation_created", "rec-456"));

// ============================================================================
// 5. Safety
// ============================================================================
console.log("Safety:");

check("create_task is safe", isSafeInternalAction("create_task"));
check("create_notification is safe", isSafeInternalAction("create_notification"));
check("add_to_saved_list is safe", isSafeInternalAction("add_to_saved_list"));
check("send_email is NOT safe", !isSafeInternalAction("send_email"));

check("high_priority_signal is supported", isSupportedTrigger("high_priority_signal"));
check("recommendation_created is supported", isSupportedTrigger("recommendation_created"));
check("send_email is not a trigger", !isSupportedTrigger("send_email"));

check("same trigger is self-triggering", isSelfTriggering("recommendation_created", "recommendation_created"));
check("different triggers not self-triggering", !isSelfTriggering("high_icp_score", "recommendation_created"));

// ============================================================================
// Summary
// ============================================================================
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);