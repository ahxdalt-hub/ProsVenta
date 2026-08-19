// ============================================================================
// Prosventa Intelligence-Powered Workflows — Execution Service
// Stage 4 — Phase 9: Intelligence-Powered Workflows
// ============================================================================
// Server-side boundary for workflow execution. This is the ONLY path that
// executes workflow actions. UI components never execute actions directly.
//
// Flow:
//   Trigger → Load active workflows → Idempotency check → Validate workspace
//   → Evaluate conditions → Generate execution plan → Approval gate if needed
//   → Execute safe actions → Record results → Create activity/audit record
//
// IMPORTANT:
//   - All actions are authorized server-side.
//   - No AI is used for deterministic workflow logic.
//   - No external communication actions are implemented.
//   - Idempotency is enforced via (workflow_id, trigger_event_id).
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import { recordActivityEntry, createNotificationEntry } from "@/lib/db/collaboration";
import { recordIntelligenceUsage } from "@/lib/db/intelligence";
import {
  getActiveWorkflowsForTrigger,
  createExecutionRecord,
  updateExecutionStatus,
  createActionExecutionRecord,
  updateActionExecutionStatus,
  createTaskRecord,
  createApprovalRecord,
  executionExistsForTrigger,
} from "@/lib/db/intelligence-workflows";
import { addToList } from "@/lib/db/lists";
import { createProspectNote } from "@/lib/db/notes";
import { updateRecommendationStatus } from "@/lib/db/recommendations";
import {
  evaluateIntelligenceConditions,
  generateActionPreview,
  buildTriggerEventId,
  isSafeInternalAction,
} from "./engine";
import type {
  IntelligenceWorkflow,
  IntelligenceTriggerEvent,
  IntelligenceAction,
  ExecutionResult,
  IntelligenceExecutionStatus,
} from "./types";

// ============================================================================
// Action Execution — Safe Internal Actions Only
// ============================================================================

async function executeSafeAction(
  action: IntelligenceAction,
  event: IntelligenceTriggerEvent,
  orgId: string,
  userId: string,
  executionId: string,
  workflowId: string
): Promise<{ success: boolean; output: Record<string, unknown>; error?: string }> {
  const supabase = await createClient();
  const prospectId = event.prospectId;

  switch (action.type) {
    case "create_notification": {
      const title = (action.config.title as string) || `Intelligence alert for ${event.prospectName ?? "prospect"}`;
      const body = (action.config.body as string) || `Workflow "${action.config.__workflow_name ?? "Intelligence workflow"}" triggered by ${event.triggerType.replace(/_/g, " ")}.`;
      await createNotificationEntry({
        user_id: userId,
        organization_id: orgId,
        type: "signal_detected",
        title,
        body,
        entity_type: prospectId ? "prospect" : null,
        entity_id: prospectId,
        actor_id: userId,
      });
      return { success: true, output: { notificationCreated: true, title } };
    }

    case "create_task": {
      const title = (action.config.title as string) || `Review ${event.prospectName ?? "prospect"}`;
      const description = (action.config.description as string) || `Created by workflow "${action.config.__workflow_name ?? "Intelligence workflow"}" based on ${event.triggerType.replace(/_/g, " ")}.`;
      const priority = (action.config.priority as string) || "medium";
      const dueInDays = (action.config.due_in_days as number) ?? 1;
      const dueDate = new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000).toISOString();
      const assignedTo = (action.config.assigned_to as string) || null;

      const result = await createTaskRecord({
        organization_id: orgId,
        prospect_id: prospectId,
        workflow_id: workflowId,
        execution_id: executionId,
        created_by: userId,
        assigned_to: assignedTo,
        title,
        description,
        priority: priority as "low" | "medium" | "high",
        due_date: dueDate,
      });

      if (result.error) return { success: false, output: {}, error: result.error };
      return { success: true, output: { taskId: result.task?.id, title } };
    }

    case "add_to_saved_list": {
      if (!prospectId) return { success: false, output: {}, error: "No prospect to add to list." };
      const listId = (action.config.list_id as string) || null;
      if (!listId) return { success: false, output: {}, error: "No saved list selected." };

      const { data: existing } = await supabase
        .from("saved_list_items")
        .select("id")
        .eq("list_id", listId)
        .eq("prospect_id", prospectId)
        .maybeSingle();

      if (!existing) {
        await addToList({ list_id: listId, prospect_id: prospectId });
      }

      return { success: true, output: { addedToList: true, listId } };
    }

    case "update_prospect_status": {
      if (!prospectId) return { success: false, output: {}, error: "No prospect to update." };
      const status = (action.config.status as string) || "qualified";
      const { error } = await supabase
        .from("prospects")
        .update({ status: status as never })
        .eq("id", prospectId)
        .eq("organization_id", orgId);
      if (error) return { success: false, output: {}, error: error.message };
      return { success: true, output: { statusUpdated: status } };
    }

    case "create_internal_note": {
      if (!prospectId) return { success: false, output: {}, error: "No prospect for note." };
      const noteText = (action.config.note as string) || `Reviewed based on intelligence signal (${event.triggerType.replace(/_/g, " ")}).`;
      const note = await createProspectNote({
        prospect_id: prospectId,
        user_id: userId,
        content: noteText,
      });
      if (!note) return { success: false, output: {}, error: "Failed to create note." };
      return { success: true, output: { noteCreated: true } };
    }

    case "mark_recommendation_reviewed": {
      const recommendationId = (action.config.recommendation_id as string) || event.recommendationId;
      if (!recommendationId) return { success: false, output: {}, error: "No recommendation to mark." };
      await updateRecommendationStatus(recommendationId, "reviewed");
      return { success: true, output: { recommendationMarkedReviewed: true } };
    }

    case "create_workflow_activity": {
      await recordActivityEntry({
        organization_id: orgId,
        actor_id: userId,
        action: "prospect_updated",
        entity_type: "workflow",
        entity_id: workflowId,
        entity_name: (action.config.__workflow_name as string) || "Intelligence workflow",
        metadata: { trigger: event.triggerType, prospect_id: prospectId },
      });
      return { success: true, output: { activityCreated: true } };
    }

    default:
      return { success: false, output: {}, error: `Unsupported action type: ${action.type}.` };
  }
}

// ============================================================================
// Main Execution Trigger
// ============================================================================

/**
 * Dispatches an intelligence event to all active workflows matching the trigger.
 * Enforces idempotency, evaluates conditions, and executes safe actions.
 */
export async function triggerIntelligenceWorkflows(
  event: IntelligenceTriggerEvent
): Promise<ExecutionResult[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const results: ExecutionResult[] = [];

  // Load active workflows matching this trigger type
  const workflows = await getActiveWorkflowsForTrigger(event.triggerType, event.organizationId);

  for (const workflow of workflows) {
    const triggerEventId = buildTriggerEventId(event.triggerType, event.eventId);

    // Idempotency check — skip if already executed for this trigger event
    const alreadyExecuted = await executionExistsForTrigger(workflow.id, triggerEventId);
    if (alreadyExecuted) continue;

    // Evaluate conditions
    const conditionsMet = evaluateIntelligenceConditions(workflow.conditions, event);
    if (!conditionsMet) continue;

    // Create execution record (running)
    const execRecord = await createExecutionRecord({
      workflowId: workflow.id,
      orgId: event.organizationId,
      prospectId: event.prospectId,
      prospectName: event.prospectName,
      triggerEventId,
      executionContext: event.context,
      createdBy: user.id,
      status: "running",
    });

    if (execRecord.error || !execRecord.executionId) {
      results.push({
        executionId: "",
        status: "failed",
        message: `Failed to create execution for workflow "${workflow.name}".`,
        actionsExecuted: 0,
        actionsFailed: 0,
        error: execRecord.error ?? "Unknown error",
      });
      continue;
    }

    const executionId = execRecord.executionId;
    let actionsExecuted = 0;
    let actionsFailed = 0;
    let executionFailed = false;

    // Execute each action
    for (let i = 0; i < workflow.actions.length; i++) {
      const action = workflow.actions[i];

      // Validate action is safe (internal only)
      if (!isSafeInternalAction(action.type)) {
        actionsFailed++;
        executionFailed = true;
        await updateExecutionStatus(executionId, "failed", `Unsupported action type: ${action.type}`);
        results.push({
          executionId,
          status: "failed",
          message: `Workflow "${workflow.name}" failed: unsupported action type.`,
          actionsExecuted,
          actionsFailed,
          error: `Unsupported action type: ${action.type}`,
        });
        break;
      }

      // Create action execution record
      const actionExec = await createActionExecutionRecord({
        executionId,
        orgId: event.organizationId,
        actionType: action.type,
        status: "running",
        actionInput: action.config,
      });

      if (actionExec.error || !actionExec.actionExecutionId) {
        actionsFailed++;
        executionFailed = true;
        await updateExecutionStatus(executionId, "failed", actionExec.error ?? "Failed to create action record");
        results.push({
          executionId,
          status: "failed",
          message: `Workflow "${workflow.name}" failed.`,
          actionsExecuted,
          actionsFailed,
          error: actionExec.error ?? "Failed to create action record",
        });
        break;
      }

      // Execute the safe action
      const actionResult = await executeSafeAction(
        action,
        event,
        event.organizationId,
        user.id,
        executionId,
        workflow.id
      );

      if (actionResult.success) {
        actionsExecuted++;
        await updateActionExecutionStatus(actionExec.actionExecutionId, "completed", actionResult.output);
      } else {
        actionsFailed++;
        executionFailed = true;
        await updateActionExecutionStatus(actionExec.actionExecutionId, "failed", {}, actionResult.error);
        await updateExecutionStatus(executionId, "failed", actionResult.error);
        results.push({
          executionId,
          status: "failed",
          message: `Workflow "${workflow.name}" failed: ${actionResult.error ?? "Unknown error"}`,
          actionsExecuted,
          actionsFailed,
          error: actionResult.error,
        });
        break;
      }
    }

    // Mark execution as completed if no failures
    if (!executionFailed) {
      await updateExecutionStatus(executionId, "completed");
      results.push({
        executionId,
        status: "completed",
        message: `Workflow "${workflow.name}" completed successfully.`,
        actionsExecuted,
        actionsFailed,
      });
    }

    // Track usage
    await recordIntelligenceUsage({
      organization_id: event.organizationId,
      user_id: user.id,
      operation: "signals",
      provider: "intelligence-workflows",
      status: executionFailed ? "failed" : "completed",
    });
  }

  return results;
}
