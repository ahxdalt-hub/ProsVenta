// ============================================================================
// Prosventa Workflow Automation Engine
// Stage 3 — Phase 9: Intelligent Sales Automation Platform
// ============================================================================

import type { Prospect } from "@/types/database";
import type {
  WorkflowCondition,
  WorkflowDefinition,
  WorkflowAction,
  WorkflowActionType,
  ExecutionPreview,
  ConditionField,
} from "./types";

// ============================================================================
// Condition Evaluation
// ============================================================================

/**
 * Resolves the value of a condition field from a prospect.
 * Returns null when the field is not set.
 */
function resolveFieldValue(prospect: Prospect, field: ConditionField): string | number | null {
  switch (field) {
    case "industry":
      return prospect.industry;
    case "country":
      return prospect.country;
    case "lead_score":
      return prospect.lead_score;
    case "pipeline_stage":
      return prospect.status;
    case "status":
      return prospect.status;
    case "owner":
      return prospect.owner_id;
    case "tags":
      return prospect.tags.length > 0 ? prospect.tags.join(",") : null;
    case "last_activity":
      return prospect.last_contacted_at;
    case "company_size":
      return prospect.employee_count;
    case "priority":
      return prospect.priority;
    default:
      return null;
  }
}

/**
 * Evaluates a single condition against a prospect.
 */
export function evaluateCondition(condition: WorkflowCondition, prospect: Prospect): boolean {
  const actualValue = resolveFieldValue(prospect, condition.field);
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
    case "contains":
      if (actualValue === null || actualValue === undefined) return false;
      return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    case "not_contains":
      if (actualValue === null || actualValue === undefined) return true;
      return !String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
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

/**
 * Evaluates all conditions for a workflow. All conditions must be true (AND semantics).
 */
export function evaluateConditions(conditions: WorkflowCondition[], prospect: Prospect): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((condition) => evaluateCondition(condition, prospect));
}

// ============================================================================
// Action Execution
// ============================================================================

/**
 * The context provides the data-access layer for the engine.
 * This keeps the engine pure and testable without touching Supabase directly.
 */
export interface ActionContext {
  userId: string;
  updateProspect: (prospectId: string, update: Record<string, unknown>) => Promise<void>;
  createTask: (input: {
    prospectId: string;
    title: string;
    dueInDays: number;
    assigneeId: string;
  }) => Promise<void>;
  sendNotification: (input: {
    userId: string;
    organizationId: string;
    title: string;
    prospectId: string;
    prospectName: string;
  }) => Promise<void>;
  createReminder: (input: {
    userId: string;
    organizationId: string;
    prospectId: string;
    title: string;
    scheduledFor: string;
  }) => Promise<void>;
}

/**
 * Executes a single workflow action against a prospect.
 * This is the core mutation that performs the automation.
 */
export async function executeAction(
  action: WorkflowAction,
  prospect: Prospect,
  context: ActionContext
): Promise<{ success: boolean; error?: string }> {
  switch (action.type) {
    case "assign_prospect": {
      const ownerId = action.config.owner_id as string | null;
      if (!ownerId) return { success: false, error: "No owner selected." };
      await context.updateProspect(prospect.id, { owner_id: ownerId });
      return { success: true };
    }
    case "create_task": {
      const title = (action.config.title as string) || "Follow up";
      const dueInDays = (action.config.due_in_days as number) || 1;
      await context.createTask({
        prospectId: prospect.id,
        title,
        dueInDays,
        assigneeId: (action.config.assignee_id as string) || context.userId,
      });
      return { success: true };
    }
    case "add_tag": {
      const tag = action.config.tag as string;
      if (!tag) return { success: false, error: "No tag provided." };
      const currentTags = prospect.tags ?? [];
      if (!currentTags.includes(tag)) {
        await context.updateProspect(prospect.id, { tags: [...currentTags, tag] });
      }
      return { success: true };
    }
    case "move_pipeline_stage": {
      const stage = action.config.stage as string;
      if (!stage) return { success: false, error: "No stage provided." };
      await context.updateProspect(prospect.id, { status: stage as Prospect["status"] });
      return { success: true };
    }
    case "send_notification": {
      const message = (action.config.message as string) || "New automation event";
      const userId = (action.config.user_id as string) || context.userId;
      await context.sendNotification({
        userId,
        organizationId: prospect.organization_id,
        title: message,
        prospectId: prospect.id,
        prospectName: prospect.name,
      });
      return { success: true };
    }
    case "create_reminder": {
      const title = (action.config.title as string) || "Follow up on prospect";
      const hoursFromNow = (action.config.hours_from_now as number) || 24;
      await context.createReminder({
        userId: (action.config.user_id as string) || context.userId,
        organizationId: prospect.organization_id,
        prospectId: prospect.id,
        title,
        scheduledFor: new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString(),
      });
      return { success: true };
    }
    case "archive_prospect": {
      await context.updateProspect(prospect.id, { status: "lost" });
      return { success: true };
    }
    case "mark_high_priority": {
      await context.updateProspect(prospect.id, { priority: "high" });
      return { success: true };
    }
    default:
      return { success: false, error: `Unknown action type: ${action.type}` };
  }
}

/**
 * Executes all actions for a workflow. Stops on first failure.
 */
export async function executeActions(
  actions: WorkflowAction[],
  prospect: Prospect,
  context: ActionContext
): Promise<{ success: boolean; error?: string; executed: number }> {
  let executed = 0;
  for (const action of actions) {
    const result = await executeAction(action, prospect, context);
    if (!result.success) {
      return { success: false, error: result.error, executed };
    }
    executed++;
  }
  return { success: true, executed };
}

// ============================================================================
// Full Workflow Execution
// ============================================================================

/**
 * Runs a complete workflow against a prospect:
 * 1. Evaluate all conditions
 * 2. Execute all actions
 */
export async function runWorkflow(
  workflow: WorkflowDefinition,
  prospect: Prospect,
  context: ActionContext
): Promise<{ matched: boolean; success: boolean; error?: string; executed: number }> {
  // Evaluate conditions
  const conditionsMet = evaluateConditions(workflow.conditions, prospect);
  if (!conditionsMet) {
    return { matched: false, success: false, executed: 0 };
  }

  // Execute actions
  const result = await executeActions(workflow.actions, prospect, context);
  return {
    matched: true,
    success: result.success,
    error: result.error,
    executed: result.executed,
  };
}

// ============================================================================
// Execution Preview
// ============================================================================

/**
 * Generates a human-readable preview of what a workflow will do.
 * Used in the Workflow Builder before enabling.
 */
export function generateExecutionPreview(workflow: WorkflowDefinition): ExecutionPreview {
  const triggerLabel = workflow.trigger_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const conditionText =
    workflow.conditions.length === 0
      ? "All prospects"
      : workflow.conditions
          .map((c) => {
            const field = c.field.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
            const op = c.operator.replace(/_/g, " ");
            const val = c.value ?? "";
            return `${field} ${op} ${val}`;
          })
          .join(" AND ");

  const actionText =
    workflow.actions.length === 0
      ? "No actions"
      : workflow.actions
          .map((a) => {
            const label = a.type.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
            const extra =
              a.type === "assign_prospect"
                ? ` to ${(a.config.owner_name as string) || "someone"}`
                : a.type === "add_tag"
                  ? ` "${a.config.tag}"`
                  : a.type === "move_pipeline_stage"
                    ? ` to ${(a.config.stage as string) || "new stage"}`
                    : "";
            return `${label}${extra}`;
          })
          .join(", then ");

  let estimatedResult = "No matching prospects will be affected.";
  const affectedProspects = 0;

  if (workflow.conditions.length === 0 && workflow.actions.length > 0) {
    estimatedResult = "Will apply to all prospects matching the trigger.";
  } else if (workflow.conditions.length > 0) {
    estimatedResult = `Will apply to prospects where ${conditionText}`;
  }

  return {
    trigger: triggerLabel,
    condition: conditionText,
    action: actionText,
    estimatedResult,
    affectedProspects,
  };
}

// ============================================================================
// Action Type Helpers
// ============================================================================

export const ACTION_TYPES: WorkflowActionType[] = [
  "assign_prospect",
  "create_task",
  "add_tag",
  "move_pipeline_stage",
  "send_notification",
  "create_reminder",
  "archive_prospect",
  "mark_high_priority",
];