// ============================================================================
// Prosventa Workflow Trigger & Event Engine — Event Registry
// Stage 7 — Phase 2
// ============================================================================
// Central, controlled registry of events that actually have reliable producers
// in the current codebase. No fabricated events.
//
// `matchingTriggerTypes` maps each event to the workflow trigger_type values it
// satisfies — both the new event ID itself AND legacy Stage 4 trigger types, so
// previously created active workflows keep working without migration.
// ============================================================================

import type { WorkflowEventTargetType, WorkflowEventType } from "./types";

export interface WorkflowEventDefinition {
  id: WorkflowEventType;
  /** Friendly customer-facing name (never expose raw IDs in primary copy). */
  label: string;
  description: string;
  targetType: WorkflowEventTargetType;
  /** Fields guaranteed present in the payload. */
  payloadFields: string[];
  /** Fields conditions may reference (payload + derived context fields). */
  conditionFields: Array<{ field: string; label: string }>;
  source: string;
  enabled: boolean;
  matchingTriggerTypes: string[];
}

export const WORKFLOW_EVENT_REGISTRY: Partial<Record<WorkflowEventType, WorkflowEventDefinition>> = {
  "prospect.created": {
    id: "prospect.created",
    label: "A prospect is created",
    description: "Fires after a new prospect is committed to the workspace.",
    targetType: "prospect",
    payloadFields: ["prospect_id", "source", "created_at"],
    conditionFields: [{ field: "source", label: "Prospect Source" }],
    source: "prospects",
    enabled: true,
    matchingTriggerTypes: ["prospect.created"],
  },
  "prospect.imported": {
    id: "prospect.imported",
    label: "Prospects are imported",
    description: "Fires once per completed import with a summary — never once per prospect.",
    targetType: "organization",
    payloadFields: ["imported_count", "prospect_ids"],
    conditionFields: [{ field: "imported_count", label: "Imported Count" }],
    source: "import",
    enabled: true,
    matchingTriggerTypes: ["prospect.imported"],
  },
  "prospect.updated": {
    id: "prospect.updated",
    label: "A prospect is updated",
    description: "Fires after a prospect record is changed.",
    targetType: "prospect",
    payloadFields: ["prospect_id", "updated_fields", "updated_at"],
    conditionFields: [{ field: "company_industry", label: "Company Industry" }],
    source: "prospects",
    enabled: true,
    matchingTriggerTypes: ["prospect.updated", "prospect_role_changed"],
  },
  "prospect.deleted": {
    id: "prospect.deleted",
    label: "A prospect is deleted",
    description: "Fires after a prospect is removed from the workspace.",
    targetType: "prospect",
    payloadFields: ["prospect_id", "deleted_at"],
    conditionFields: [],
    source: "prospects",
    enabled: true,
    matchingTriggerTypes: ["prospect.deleted"],
  },
};

export const WORKFLOW_EVENT_REGISTRY_PART2: Partial<Record<WorkflowEventType, WorkflowEventDefinition>> = {
  "prospect.score.updated": {
    id: "prospect.score.updated",
    label: "Prospect score changes",
    description:
      "Fires only when the ICP score actually changes (never on identical re-scores).",
    targetType: "prospect",
    payloadFields: ["prospect_id", "previous_score", "new_score", "score_category"],
    conditionFields: [
      { field: "new_score", label: "New Score" },
      { field: "previous_score", label: "Previous Score" },
      { field: "score_category", label: "Score Category" },
      // Legacy alias so existing score-threshold workflows keep evaluating.
      { field: "icp_score", label: "ICP Score" },
    ],
    source: "icp-scoring",
    enabled: true,
    matchingTriggerTypes: [
      "prospect.score.updated",
      "score_threshold_crossed",
      "high_icp_score",
    ],
  },
  "signal.detected": {
    id: "signal.detected",
    label: "A signal is detected",
    description: "Fires when a legitimate business signal survives Stage 6 deduplication.",
    targetType: "signal",
    payloadFields: ["prospect_id", "signal_id", "signal_type", "signal_strength", "detected_at"],
    conditionFields: [
      { field: "signal_type", label: "Signal Type" },
      { field: "signal_strength", label: "Signal Importance" },
      { field: "confidence", label: "Signal Confidence" },
    ],
    source: "signals",
    enabled: true,
    matchingTriggerTypes: ["signal.detected", "high_priority_signal", "new_company_signal"],
  },
  "recommendation.generated": {
    id: "recommendation.generated",
    label: "A recommendation is generated",
    description: "Fires when a meaningful recommendation is generated.",
    targetType: "recommendation",
    payloadFields: ["prospect_id", "recommendation_id", "recommendation_type", "priority"],
    conditionFields: [
      { field: "recommendation_type", label: "Recommendation Type" },
      { field: "priority", label: "Recommendation Priority" },
    ],
    source: "recommendations",
    enabled: true,
    matchingTriggerTypes: [
      "recommendation.generated",
      "recommendation_created",
      "recommendation_priority_high",
    ],
  },
  "intelligence.completed": {
    id: "intelligence.completed",
    label: "Intelligence run completes",
    description: "Fires when a full intelligence pipeline run completes successfully.",
    targetType: "intelligence_run",
    payloadFields: ["job_id", "prospect_id"],
    conditionFields: [],
    source: "orchestrator",
    enabled: true,
    matchingTriggerTypes: ["intelligence.completed"],
  },
  "intelligence.partially_completed": {
    id: "intelligence.partially_completed",
    label: "Intelligence run partially completes",
    description: "Fires when a pipeline run finishes with some failed or skipped steps.",
    targetType: "intelligence_run",
    payloadFields: ["job_id", "prospect_id"],
    conditionFields: [],
    source: "orchestrator",
    enabled: true,
    matchingTriggerTypes: ["intelligence.partially_completed"],
  },
  "intelligence.failed": {
    id: "intelligence.failed",
    label: "Intelligence run fails",
    description: "Fires when a pipeline run fails entirely.",
    targetType: "intelligence_run",
    payloadFields: ["job_id", "prospect_id", "reason"],
    conditionFields: [],
    source: "orchestrator",
    enabled: true,
    matchingTriggerTypes: ["intelligence.failed"],
  },
  "workflow.manual_triggered": {
    id: "workflow.manual_triggered",
    label: "A workflow is run manually",
    description: "Recorded when a user manually starts a workflow execution.",
    targetType: "workflow",
    payloadFields: ["workflow_id", "triggered_by"],
    conditionFields: [],
    source: "workflows",
    enabled: true,
    matchingTriggerTypes: ["workflow.manual_triggered"],
  },
};

// Full registry = part 1 + part 2 (kept split only for file-size readability).
Object.assign(WORKFLOW_EVENT_REGISTRY, WORKFLOW_EVENT_REGISTRY_PART2);

/** Enabled events available to the trigger selector UI (friendly copy). */
export function getEnabledEventDefinitions(): WorkflowEventDefinition[] {
  return Object.values(WORKFLOW_EVENT_REGISTRY).filter((def) => def.enabled);
}

export function getEventDefinition(eventType: string): WorkflowEventDefinition | null {
  return (
    (WORKFLOW_EVENT_REGISTRY as Record<string, WorkflowEventDefinition | undefined>)[eventType] ??
    null
  );
}

export function isRegisteredEventType(eventType: string): eventType is WorkflowEventType {
  const def = getEventDefinition(eventType);
  return def !== null && def.enabled;
}

