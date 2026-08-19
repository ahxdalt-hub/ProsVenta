// ============================================================================
// Prosventa Intelligence-Powered Workflows — Engine
// Stage 4 — Phase 9: Intelligence-Powered Workflows
// ============================================================================
// Pure, testable workflow engine. Handles:
//   - Condition evaluation (deterministic — no AI in workflow logic)
//   - Action preview generation (for approval gates)
//   - Execution plan generation
//   - Safe internal action execution
//
// IMPORTANT:
//   - No AI is used for deterministic workflow logic.
//   - All actions are internal to Prosventa (no external communication).
//   - Idempotency is enforced by the caller via trigger_event_id.
// ============================================================================

import type {
  IntelligenceCondition,
  IntelligenceAction,
  IntelligenceTriggerEvent,
  IntelligenceActionType,
  ActionPreview,
  ExecutionPlan,
} from "./types";

// ============================================================================
// Condition Evaluation
// ============================================================================

function resolveContextValue(field: string, context: Record<string, unknown>): string | number | null {
  const value = context[field];
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return String(value);
}

export function evaluateIntelligenceCondition(condition: IntelligenceCondition, event: IntelligenceTriggerEvent): boolean {
  const actualValue = resolveContextValue(condition.field, event.context);
  const expectedValue = condition.value;

  switch (condition.operator) {
    case "is_set":
      return actualValue !== null && actualValue !== undefined && actualValue !== "";
    case "is_not_set":
      return actualValue === null || actualValue === undefined || actualValue === "";
    case "equals":
      if (actualValue === null || actualValue === undefined) return false;
      return String(actualValue).toLowerCase() === String(expectedValue).toLowerCase();
    case "not_equals":
      if (actualValue === null || actualValue === undefined) return true;
      return String(actualValue).toLowerCase() !== String(expectedValue).toLowerCase();
    case "greater_than":
      if (actualValue === null || actualValue === undefined) return false;
      return Number(actualValue) > Number(expectedValue);
    case "less_than":
      if (actualValue === null || actualValue === undefined) return false;
      return Number(actualValue) < Number(expectedValue);
    default:
      return false;
  }
}

export function evaluateIntelligenceConditions(conditions: IntelligenceCondition[], event: IntelligenceTriggerEvent): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((condition) => evaluateIntelligenceCondition(condition, event));
}

// ============================================================================
// Action Preview Generation
// ============================================================================

export function generateActionPreview(action: IntelligenceAction, event: IntelligenceTriggerEvent): ActionPreview {
  const prospectName = event.prospectName ?? "this prospect";
  const companyName = (event.context.company_name as string) || prospectName;

  switch (action.type) {
    case "create_notification": {
      const title = (action.config.title as string) || `Intelligence alert for ${companyName}`;
      return {
        actionType: action.type,
        title: "Create Notification",
        description: `A notification will be created for ${companyName}.`,
        details: {
          "Notification Title": title,
          "Related Prospect": prospectName,
          "Workflow": event.triggerType.replace(/_/g, " "),
        },
      };
    }
    case "create_task": {
      const title = (action.config.title as string) || `Review ${companyName}`;
      const dueInDays = (action.config.due_in_days as number) ?? 1;
      const dueDate = new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000).toLocaleDateString();
      return {
        actionType: action.type,
        title: "Create Task",
        description: `A task will be created to review ${companyName}.`,
        details: {
          "Task Title": title,
          "Due": dueDate,
          "Related Prospect": prospectName,
        },
      };
    }
    case "add_to_saved_list": {
      const listName = (action.config.list_name as string) || "Priority Prospects";
      return {
        actionType: action.type,
        title: "Add to Saved List",
        description: `${companyName} will be added to the "${listName}" list.`,
        details: {
          "List": listName,
          "Related Prospect": prospectName,
        },
      };
    }
    case "update_prospect_status": {
      const status = (action.config.status as string) || "qualified";
      return {
        actionType: action.type,
        title: "Update Prospect Status",
        description: `${companyName}'s status will be updated to "${status}".`,
        details: {
          "New Status": status,
          "Related Prospect": prospectName,
        },
      };
    }
    case "create_internal_note": {
      const note = (action.config.note as string) || "Reviewed based on intelligence signal.";
      return {
        actionType: action.type,
        title: "Create Internal Note",
        description: `An internal note will be added to ${companyName}.`,
        details: {
          "Note": note.slice(0, 120),
          "Related Prospect": prospectName,
        },
      };
    }
    case "mark_recommendation_reviewed": {
      return {
        actionType: action.type,
        title: "Mark Recommendation Reviewed",
        description: `The related recommendation will be marked as reviewed.`,
        details: {
          "Related Prospect": prospectName,
        },
      };
    }
    case "create_workflow_activity": {
      return {
        actionType: action.type,
        title: "Create Workflow Activity",
        description: `A workflow activity event will be recorded for ${companyName}.`,
        details: {
          "Related Prospect": prospectName,
        },
      };
    }
    default:
      return {
        actionType: action.type,
        title: String(action.type).replace(/_/g, " "),
        description: `Execute ${String(action.type).replace(/_/g, " ")} for ${companyName}.`,
        details: {},
      };
  }
}

// ============================================================================
// Execution Plan Generation
// ============================================================================

export function generateExecutionPlan(
  workflow: {
    id: string;
    name: string;
    conditions: IntelligenceCondition[];
    actions: IntelligenceAction[];
    requires_approval: boolean;
  },
  event: IntelligenceTriggerEvent
): ExecutionPlan {
  const conditionsMet = evaluateIntelligenceConditions(workflow.conditions, event);

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    triggerEvent: event,
    conditionsMet,
    actions: workflow.actions.map((action, index) => ({
      index,
      type: action.type,
      preview: generateActionPreview(action, event),
      requiresApproval: workflow.requires_approval,
    })),
  };
}

// ============================================================================
// Action Type Validation
// ============================================================================

export function isSafeInternalAction(actionType: string): boolean {
  const safeActions: IntelligenceActionType[] = [
    "create_notification",
    "create_task",
    "add_to_saved_list",
    "update_prospect_status",
    "create_internal_note",
    "mark_recommendation_reviewed",
    "create_workflow_activity",
  ];
  return safeActions.includes(actionType as IntelligenceActionType);
}

export function isSupportedTrigger(triggerType: string): boolean {
  const supportedTriggers = [
    "high_icp_score",
    "score_threshold_crossed",
    "high_priority_signal",
    "new_company_signal",
    "prospect_role_changed",
    "company_research_updated",
    "prospect_research_updated",
    "recommendation_created",
    "recommendation_priority_high",
  ];
  return supportedTriggers.includes(triggerType);
}

// ============================================================================
// Loop Protection
// ============================================================================

export function buildTriggerEventId(triggerType: string, sourceId: string): string {
  return `${triggerType}:${sourceId}`;
}

export function isSelfTriggering(workflowTriggerType: string, eventTriggerType: string): boolean {
  return workflowTriggerType === eventTriggerType;
}